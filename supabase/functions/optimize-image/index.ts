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
    // Verify request
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

function extractStoragePath(imageUrl: string): string | null {
  const match = imageUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
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
