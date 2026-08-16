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

import { existsSync, readFileSync } from 'fs';
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
    let query = supabase.from('stickers').select('id, created_at, club_id').order('id', { ascending: true });
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

/**
 * Stickers whose page exists but whose club page does not link to them.
 *
 * A missing page is not the only way an upload can half-land. When a dispatch is
 * lost to the concurrency group, the nightly city sweep still regenerates the
 * sticker page — but it runs with STICKER_PAGE_ONLY=1, which deliberately skips
 * club and country pages. The sticker page therefore appears, this script's
 * existsSync check goes quiet, and the club page never gains the link. That is
 * how stickers 4320 and 4414 stayed orphaned: clubs/820.html was last written
 * 2026-07-08, a month before its sticker existed.
 *
 * Re-running the generator without STICKER_PAGE_ONLY rebuilds the club page too.
 */
function findUnlinked(stickers) {
    const unlinked = [];
    for (const s of stickers) {
        if (!s.club_id) continue;
        const stickerPage = join(PROJECT_ROOT, 'stickers', `${s.id}.html`);
        const clubPage = join(PROJECT_ROOT, 'clubs', `${s.club_id}.html`);
        // A missing sticker page is already handled by findMissing; a missing club
        // page is a different defect and regenerating the sticker creates it.
        if (!existsSync(stickerPage)) continue;
        if (!existsSync(clubPage)) { unlinked.push(s.id); continue; }
        const html = readFileSync(clubPage, 'utf-8');
        if (!html.includes(`/stickers/${s.id}.html`)) unlinked.push(s.id);
    }
    return unlinked;
}

(async () => {
    console.log(`🔎 Reconciling stickers${days ? ` (last ${days} days)` : ' (full)'}...`);
    const stickers = await fetchStickerIds();
    console.log(`   DB stickers in scope: ${stickers.length}`);

    const missing = findMissing(stickers);
    const unlinked = findUnlinked(stickers);
    const targets = [...new Set([...missing, ...unlinked])].sort((a, b) => a - b);

    if (targets.length === 0) {
        console.log('✅ Nothing to reconcile — every sticker has a page and a link from its club.');
        return;
    }

    if (missing.length) {
        console.log(`⚠️  Missing static pages: ${missing.length}`);
        console.log('   IDs:', missing.join(', '));
    }
    if (unlinked.length) {
        console.log(`⚠️  Page exists but club page does not link to it: ${unlinked.length}`);
        console.log('   IDs:', unlinked.join(', '));
    }

    if (dryRun) {
        console.log('🟡 --dry-run set, not generating.');
        return;
    }

    const generator = join(__dirname, 'generate-single-sticker.js');
    let ok = 0, fail = 0;
    for (const id of targets) {
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
