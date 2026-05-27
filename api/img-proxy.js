export const config = { runtime: 'edge' };

const SUPABASE_BASE = 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/';

export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    if (!path) return new Response('Missing path', { status: 400 });

    const upstream = await fetch(SUPABASE_BASE + path, {
        headers: { 'User-Agent': 'stickerhunt-img-proxy/1.0' },
    });

    if (!upstream.ok && upstream.status !== 304) {
        return new Response(upstream.statusText, { status: upstream.status });
    }

    const headers = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('content-length', contentLength);
    const etag = upstream.headers.get('etag');
    if (etag) headers.set('etag', etag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    // Opt our images into Google Image Search's large-preview rendering (default
    // is "standard" which suppresses big thumbnails). Has to be set here, not in
    // vercel.json, because the Edge Function owns the response Headers object
    // and would otherwise overwrite any platform-level header config.
    headers.set('x-robots-tag', 'max-image-preview:large');

    return new Response(upstream.body, { status: upstream.status, headers });
}
