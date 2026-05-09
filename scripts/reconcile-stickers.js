#!/usr/bin/env node

/**
 * Reconcile DB stickers ↔ on-disk static pages.
 *
 * Finds every sticker in Supabase that has no corresponding stickers/<id>.html
 * and runs generate-single-sticker.js for each one. Belt-and-suspenders for
 * cases where the per-upload workflow run was cancelled, failed, or never
 * fired (concurrency-group cancellations during fast successive uploads).
 *
 * Usage:
 *   node reconcile-stickers.js              # full reconcile
 *   node reconcile-stickers.js --days=2     # only stickers from last N days
 *   node reconcile-stickers.js --dry-run    # report only, do not generate
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createSupabaseClient } from './seo-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const daysArg = args.find(a => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : null;

const supabase = createSupabaseClient();

async function fetchStickerIds() {
    let query = supabase.from('stickers').select('id, created_at').order('id', { ascending: true });
    if (days && Number.isFinite(days)) {
        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        query = query.gte('created_at', since);
    }
    const all = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await query.range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
    }
    return all;
}

function findMissing(stickers) {
    return stickers.filter(s => !existsSync(join(PROJECT_ROOT, 'stickers', `${s.id}.html`))).map(s => s.id);
}

(async () => {
    console.log(`🔎 Reconciling stickers${days ? ` (last ${days} days)` : ' (full)'}...`);
    const stickers = await fetchStickerIds();
    console.log(`   DB stickers in scope: ${stickers.length}`);

    const missing = findMissing(stickers);
    if (missing.length === 0) {
        console.log('✅ Nothing to reconcile — every sticker has a static page.');
        return;
    }

    console.log(`⚠️  Missing static pages: ${missing.length}`);
    console.log('   IDs:', missing.join(', '));

    if (dryRun) {
        console.log('🟡 --dry-run set, not generating.');
        return;
    }

    const generator = join(__dirname, 'generate-single-sticker.js');
    let ok = 0, fail = 0;
    for (const id of missing) {
        console.log(`\n────────── sticker #${id} ──────────`);
        const res = spawnSync('node', [generator, String(id)], {
            stdio: 'inherit',
            cwd: __dirname,
            env: process.env,
        });
        if (res.status === 0) ok++;
        else fail++;
    }

    console.log(`\n📊 Reconcile done — generated ${ok}, failed ${fail}.`);
    if (fail > 0) process.exit(1);
})().catch(err => {
    console.error('💥 Reconcile failed:', err);
    process.exit(1);
});
