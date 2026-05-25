#!/usr/bin/env node

/**
 * One-off: re-upload existing optimized sticker images with proper cacheControl.
 *
 * Why: optimize-images.js historically uploaded without `cacheControl`,
 * causing Supabase to respond with `cache-control: no-cache`. Cloudflare
 * never cached the images → PSI LCP ~6.8s on sticker pages.
 *
 * What: walks `stickers/` recursively, finds *_web.webp and *_thumb.webp,
 * downloads each as raw bytes, re-uploads with cacheControl=1y + upsert.
 * No re-encoding. Safe to re-run.
 *
 * Usage:
 *   node backfill-cache-control.js --dry        # list only
 *   node backfill-cache-control.js --limit=5    # test on N files
 *   node backfill-cache-control.js              # full run
 *   node backfill-cache-control.js --concurrency=10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'stickers';
const CACHE_CONTROL = '31536000'; // 1 year

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const concArg = args.find(a => a.startsWith('--concurrency='));
const concurrency = concArg ? parseInt(concArg.split('=')[1], 10) : 8;

async function listAllOptimized() {
    // Two-level: bucket root → club_XXX folders → files
    const { data: clubFolders, error: e1 } = await supabase.storage
        .from(BUCKET).list('', { limit: 1000 });
    if (e1) throw e1;

    const allFiles = [];
    for (const folder of clubFolders) {
        if (!folder.name.startsWith('club_')) continue;
        const { data: files, error: e2 } = await supabase.storage
            .from(BUCKET).list(folder.name, { limit: 10000 });
        if (e2) { console.warn(`list ${folder.name} failed:`, e2.message); continue; }
        for (const f of files) {
            if (f.name.endsWith('_web.webp') || f.name.endsWith('_thumb.webp')) {
                allFiles.push(`${folder.name}/${f.name}`);
            }
        }
    }
    return allFiles;
}

async function reuploadOne(path) {
    const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET).download(path);
    if (dlErr) throw new Error(`download ${path}: ${dlErr.message}`);
    const buffer = Buffer.from(await blob.arrayBuffer());

    const { error: upErr } = await supabase.storage
        .from(BUCKET).upload(path, buffer, {
            contentType: 'image/webp',
            cacheControl: CACHE_CONTROL,
            upsert: true,
        });
    if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);
}

async function runPool(items, worker, conc) {
    let i = 0, done = 0, failed = 0;
    const total = items.length;
    const t0 = Date.now();
    async function next() {
        while (true) {
            const idx = i++;
            if (idx >= total) return;
            const path = items[idx];
            try {
                await worker(path);
                done++;
            } catch (e) {
                failed++;
                console.error(`  ✗ ${path}: ${e.message}`);
            }
            if ((done + failed) % 50 === 0 || done + failed === total) {
                const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
                console.log(`  ${done + failed}/${total} (ok=${done} fail=${failed}) ${elapsed}s`);
            }
        }
    }
    await Promise.all(Array.from({ length: conc }, next));
    return { done, failed };
}

(async () => {
    console.log('Listing optimized files in bucket...');
    let files = await listAllOptimized();
    console.log(`Found ${files.length} optimized files (_web + _thumb)`);
    if (limit) {
        files = files.slice(0, limit);
        console.log(`Limited to first ${limit}`);
    }
    if (dryRun) {
        console.log('DRY RUN — sample:');
        files.slice(0, 10).forEach(f => console.log(`  ${f}`));
        return;
    }
    console.log(`Re-uploading with cacheControl=${CACHE_CONTROL}, concurrency=${concurrency}...`);
    const { done, failed } = await runPool(files, reuploadOne, concurrency);
    console.log(`\nDone. ok=${done} failed=${failed}`);
})().catch(e => { console.error(e); process.exit(1); });
