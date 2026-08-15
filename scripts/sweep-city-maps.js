#!/usr/bin/env node

/**
 * Refresh sticker pages in cities that gained stickers recently.
 *
 * A sticker page bakes its nearby-map markers and its "Also found in <city>"
 * links at generation time, from every sticker sharing the same `location`.
 * The upload pipeline regenerates only the new sticker and its id-predecessor,
 * so every other page in that city keeps the marker set it was born with —
 * a sticker uploaded at 10:00 never learns about one uploaded at 12:00.
 *
 * This sweep closes that gap once a night: find the locations touched in the
 * window, then regenerate every page in those locations. Deliberately batched
 * per city rather than per sticker — a 30-sticker upload spanning 3 cities is
 * 3 sweeps, not 30.
 *
 * STICKER_PAGE_ONLY=1 keeps it to sticker pages: club/country pages and the
 * prev/next nav are already correct from the upload run, and rewriting them
 * here would only add churn.
 *
 * Usage:
 *   node sweep-city-maps.js                 # locations touched in last 26h
 *   node sweep-city-maps.js --hours=48      # widen the window
 *   node sweep-city-maps.js --city="Lens, France"   # one city, ignore window
 *   node sweep-city-maps.js --dry-run       # report only, generate nothing
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { createSupabaseClient } from './seo-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const hoursArg = args.find(a => a.startsWith('--hours='));
const hours = hoursArg ? parseInt(hoursArg.split('=')[1], 10) : 26;
const cityArg = args.find(a => a.startsWith('--city='));
const onlyCity = cityArg ? cityArg.slice('--city='.length) : null;

const supabase = createSupabaseClient();

// PostgREST caps a request at 1000 rows and says nothing about it, so every
// read here pages explicitly rather than trusting a single large limit.
async function fetchAllRows(buildQuery) {
    const all = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await buildQuery().range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
    }
    return all;
}

async function findTouchedLocations() {
    if (onlyCity) return [onlyCity];

    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const rows = await fetchAllRows(() =>
        supabase
            .from('stickers')
            .select('location')
            .gte('created_at', since)
            .not('location', 'is', null)
            .order('id', { ascending: true })
    );

    const locations = new Set();
    for (const r of rows) {
        const loc = (r.location || '').trim();
        if (loc) locations.add(loc);
    }
    return [...locations].sort();
}

async function fetchStickerIdsAt(location) {
    const rows = await fetchAllRows(() =>
        supabase
            .from('stickers')
            .select('id')
            .eq('location', location)
            .order('id', { ascending: true })
    );
    return rows.map(r => r.id);
}

(async () => {
    console.log(
        onlyCity
            ? `🗺  Sweeping one city: ${onlyCity}`
            : `🗺  Sweeping cities touched in the last ${hours}h...`
    );

    const locations = await findTouchedLocations();
    if (locations.length === 0) {
        console.log('✅ No city gained stickers in the window — nothing to sweep.');
        return;
    }

    const plan = [];
    for (const loc of locations) {
        const ids = await fetchStickerIdsAt(loc);
        if (ids.length > 0) plan.push({ location: loc, ids });
    }

    const totalPages = plan.reduce((n, p) => n + p.ids.length, 0);
    console.log(`\n📋 Cities to sweep: ${plan.length}, pages to regenerate: ${totalPages}`);
    for (const p of plan) console.log(`   ${p.ids.length.toString().padStart(4)}  ${p.location}`);

    if (dryRun) {
        console.log('\n🟡 --dry-run set, generating nothing.');
        return;
    }

    const generator = join(__dirname, 'generate-single-sticker.js');
    let ok = 0, fail = 0;
    const failedIds = [];

    for (const { location, ids } of plan) {
        console.log(`\n────────── ${location} (${ids.length} pages) ──────────`);
        for (const id of ids) {
            const res = spawnSync('node', [generator, String(id)], {
                stdio: 'pipe',
                cwd: __dirname,
                env: { ...process.env, STICKER_PAGE_ONLY: '1' },
                timeout: 60000,
            });
            if (res.status === 0) {
                ok++;
                process.stdout.write('.');
            } else {
                fail++;
                failedIds.push(id);
                process.stdout.write('x');
            }
        }
        console.log('');
    }

    console.log(`\n📊 Sweep done — regenerated ${ok}, failed ${fail}.`);
    if (failedIds.length > 0) console.log(`   Failed IDs: ${failedIds.join(', ')}`);

    // Consumed by the workflow to build the Telegram message.
    const summary = {
        cities: plan.map(p => ({ location: p.location, pages: p.ids.length })),
        regenerated: ok,
        failed: fail,
    };
    console.log(`SWEEP_SUMMARY=${JSON.stringify(summary)}`);

    if (fail > 0) process.exit(1);
})().catch(err => {
    console.error('💥 Sweep failed:', err);
    process.exit(1);
});
