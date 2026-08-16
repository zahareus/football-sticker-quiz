/**
 * Supabase Edge Function: Auto-optimize uploaded images
 *
 * This function is triggered via Database Webhook when a new sticker is inserted.
 * It downloads the original image, creates optimized WebP versions, and uploads them.
 *
 * Setup:
 * 1. Deploy: supabase functions deploy optimize-image
 * 2. Create Database Webhook in Supabase Dashboard:
 *    - Table: stickers
 *    - Events: INSERT
 *    - URL: https://your-project.supabase.co/functions/v1/optimize-image
 *    - HTTP Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Image processing using Deno-compatible library
import { ImageMagick, initialize, MagickFormat } from "https://deno.land/x/imagemagick_deno@0.0.25/mod.ts";

await initialize();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET_NAME = "stickers";
const WEBHOOK_SECRET = Deno.env.get("OPTIMIZE_IMAGE_WEBHOOK_SECRET") ?? "";

/** Constant-time string compare, so a wrong secret leaks nothing through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Optimization settings
const WEB_SIZE = { width: 600, height: 600, quality: 80 };
const THUMB_SIZE = { width: 150, height: 150, quality: 75 };

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: number;
    image_url: string;
    [key: string]: unknown;
  };
  old_record: null | Record<string, unknown>;
}

serve(async (req) => {
  try {
    // This function runs with the service-role key, which bypasses RLS entirely,
    // and it used to trust whatever JSON arrived: the "authentication" was the
    // caller asserting type/table in its own payload. Require a shared secret
    // that only the database webhook knows. Fail closed when unset — an
    // unauthenticated path to a service-role key is worse than an outage, and
    // the GitHub Actions optimizer already covers this work as a fallback.
    if (!WEBHOOK_SECRET) {
      console.error("OPTIMIZE_IMAGE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!timingSafeEqual(req.headers.get("x-webhook-secret") ?? "", WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "stickers") {
      return new Response(JSON.stringify({ message: "Ignored - not a sticker insert" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, image_url } = payload.record;

    if (!image_url) {
      return new Response(JSON.stringify({ error: "No image_url in record" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Processing sticker #${id}: ${image_url}`);

    // Extract storage path from URL
    const storagePath = extractStoragePath(image_url);
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "Invalid image URL format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download original image
    const { data: imageData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    const originalBuffer = new Uint8Array(await imageData.arrayBuffer());
    console.log(`Downloaded ${storagePath} (${originalBuffer.length} bytes)`);

    // Generate optimized versions
    const basePath = storagePath.replace(/\.[^.]+$/, "");

    // Web version (600x600)
    const webBuffer = await optimizeImage(originalBuffer, WEB_SIZE);
    const webPath = `${basePath}_web.webp`;
    await uploadImage(supabase, webPath, webBuffer);
    console.log(`Created ${webPath} (${webBuffer.length} bytes)`);

    // Thumbnail version (150x150)
    const thumbBuffer = await optimizeImage(originalBuffer, THUMB_SIZE);
    const thumbPath = `${basePath}_thumb.webp`;
    await uploadImage(supabase, thumbPath, thumbBuffer);
    console.log(`Created ${thumbPath} (${thumbBuffer.length} bytes)`);

    const savings = Math.round((1 - (webBuffer.length + thumbBuffer.length) / originalBuffer.length) * 100);

    return new Response(
      JSON.stringify({
        success: true,
        sticker_id: id,
        original_size: originalBuffer.length,
        web_size: webBuffer.length,
        thumb_size: thumbBuffer.length,
        savings: `${savings}%`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Resolve a public storage URL to a path inside our own bucket.
 * The previous pattern accepted any host and any bucket and kept `..` segments,
 * so a caller-supplied URL could name a path outside the sticker tree while the
 * function held the service-role key. Host and bucket are now pinned and the
 * path must look like a stored object.
 */
function extractStoragePath(imageUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.hostname !== new URL(SUPABASE_URL).hostname) return null;

  const prefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
  if (!parsed.pathname.startsWith(prefix)) return null;

  const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
  if (!path) return null;
  // No traversal, no absolute paths, no NUL — and it must end in an image name.
  if (path.includes("..") || path.startsWith("/") || path.includes("\0")) return null;
  if (!/^[A-Za-z0-9/._ -]+\.(jpe?g|png|webp|heic|heif)$/i.test(path)) return null;
  return path;
}

async function optimizeImage(
  buffer: Uint8Array,
  options: { width: number; height: number; quality: number }
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    ImageMagick.read(buffer, (image) => {
      // Resize maintaining aspect ratio
      image.resize(options.width, options.height);

      // Convert to WebP
      image.quality = options.quality;
      image.write(MagickFormat.Webp, (data) => {
        resolve(data);
      });
    });
  });
}

async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  path: string,
  buffer: Uint8Array
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${path}: ${error.message}`);
  }
}
