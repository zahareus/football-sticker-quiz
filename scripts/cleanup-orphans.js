#!/usr/bin/env node

/**
 * Detect and (with --apply) delete orphan files: stickers/clubs/countries/cities
 * HTML files that have no corresponding record in Supabase.
 *
 * SAFETY:
 *   - DRY-RUN by default (no deletions)
 *   - Aborts if DB returns < 50% of expected records (transient API failure check)
 *   - Lists every candidate before deletion
 *   - Use --apply to actually delete
 *
 * Usage:
 *   npm run cleanup:orphans          # dry-run (just list)
 *   npm run cleanup:orphans:apply    # actually delete
 *   node scripts/cleanup-orphans.js [--apply] [--scope=stickers,clubs,countries,cities]
 *
 * Each Thursday: Victor sends this task link in chat, I read instructions,
 * run dry-run, present list, await Victor's "так" / "go", then run --apply.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
dotenv.config({ path: join(__dirname, '.env') });

const APPLY = process.argv.includes('--apply');
const scopeArg = process.argv.find(a => a.startsWith('--scope='));
const SCOPE = scopeArg ? scopeArg.split('=')[1].split(',') : ['stickers', 'clubs', 'countries', 'cities'];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const MIN_EXPECTED = { stickers: 1000, clubs: 100, countries: 10 };

async function fetchAll(table, select) {
    const PAGE = 1000;
    const out = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).order('id', { ascending: true }).range(offset, offset + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return out;
}

function citySlug(name) {
    if (!name) return '';
    const SPECIAL_MAP = { 'ı': 'i', 'İ': 'i', 'ł': 'l', 'Ł': 'l', 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'œ': 'oe', 'Œ': 'oe', 'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd', 'þ': 'th', 'Þ': 'th' };
    let s = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.split('').map(ch => SPECIAL_MAP[ch] !== undefined ? SPECIAL_MAP[ch] : ch).join('');
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
    console.log(`StickerHunt Orphan Cleanup — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
    console.log(`Scope: ${SCOPE.join(', ')}\n`);

    const stickers = await fetchAll('stickers', 'id');
    const clubs = await fetchAll('clubs', 'id, country');
    const countriesInDb = new Set(clubs.map(c => (c.country || '').toUpperCase()).filter(Boolean));

    // SAFETY: refuse to run if DB is suspiciously empty
    if (stickers.length < MIN_EXPECTED.stickers) {
        console.error(`ABORT: Only ${stickers.length} stickers in DB (expected >${MIN_EXPECTED.stickers}). Possible API failure.`);
        process.exit(2);
    }
    if (clubs.length < MIN_EXPECTED.clubs) {
        console.error(`ABORT: Only ${clubs.length} clubs in DB (expected >${MIN_EXPECTED.clubs}). Possible API failure.`);
        process.exit(2);
    }

    const allOrphans = [];

    // Stickers
    if (SCOPE.includes('stickers')) {
        const dbIds = new Set(stickers.map(s => s.id));
        const htmlFiles = readdirSync(join(PROJECT_ROOT, 'stickers')).filter(f => f.endsWith('.html'));
        const orphans = htmlFiles
            .map(f => ({ file: `stickers/${f}`, id: parseInt(f.replace('.html', '')) }))
            .filter(o => !isNaN(o.id) && !dbIds.has(o.id));
        console.log(`Stickers: ${htmlFiles.length} HTML, ${stickers.length} in DB → ${orphans.length} orphans`);
        for (const o of orphans.slice(0, 20)) console.log(`  ✗ ${o.file}`);
        if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);
        allOrphans.push(...orphans);
    }

    // Clubs
    if (SCOPE.includes('clubs')) {
        const dbIds = new Set(clubs.map(c => c.id));
        const htmlFiles = readdirSync(join(PROJECT_ROOT, 'clubs')).filter(f => f.endsWith('.html'));
        const orphans = htmlFiles
            .map(f => ({ file: `clubs/${f}`, id: parseInt(f.replace('.html', '')) }))
            .filter(o => !isNaN(o.id) && !dbIds.has(o.id));
        console.log(`\nClubs: ${htmlFiles.length} HTML, ${clubs.length} in DB → ${orphans.length} orphans`);
        for (const o of orphans.slice(0, 20)) console.log(`  ✗ ${o.file}`);
        allOrphans.push(...orphans);
    }

    // Countries
    if (SCOPE.includes('countries')) {
        const htmlFiles = readdirSync(join(PROJECT_ROOT, 'countries')).filter(f => f.endsWith('.html'));
        const orphans = htmlFiles
            .map(f => ({ file: `countries/${f}`, code: f.replace('.html', '').toUpperCase() }))
            .filter(o => !countriesInDb.has(o.code));
        console.log(`\nCountries: ${htmlFiles.length} HTML, ${countriesInDb.size} in DB → ${orphans.length} orphans`);
        for (const o of orphans) console.log(`  ✗ ${o.file}`);
        allOrphans.push(...orphans);
    }

    // Cities — generated set is filesystem-derived, but stale slugs from
    // pre-normalization (Istanbul districts, club city renames) can linger.
    // We compare to the slug set we'd produce TODAY from sticker locations.
    if (SCOPE.includes('cities')) {
        const allStickers = await fetchAll('stickers', 'id, location');
        const cityCounts = {};
        for (const s of allStickers) {
            if (!s.location) continue;
            const city = s.location.split(',')[0].trim();
            if (!city) continue;
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
        const expectedSlugs = new Set(
            Object.entries(cityCounts)
                .filter(([_, n]) => n >= 2) // matches current MIN_STICKERS_PER_CITY
                .map(([name]) => citySlug(name))
        );
        const htmlFiles = readdirSync(join(PROJECT_ROOT, 'cities')).filter(f => f.endsWith('.html') && f !== 'index.html');
        const orphans = htmlFiles
            .map(f => ({ file: `cities/${f}`, slug: f.replace('.html', '') }))
            .filter(o => !expectedSlugs.has(o.slug));
        console.log(`\nCities: ${htmlFiles.length} HTML, ${expectedSlugs.size} qualified slugs → ${orphans.length} orphans`);
        for (const o of orphans) console.log(`  ✗ ${o.file}`);
        allOrphans.push(...orphans);
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Total orphans found: ${allOrphans.length}`);
    if (allOrphans.length === 0) {
        console.log('Nothing to clean. Site is in sync.');
        process.exit(0);
    }

    if (!APPLY) {
        console.log('\nDRY-RUN — nothing deleted.');
        console.log('Run with --apply (or `npm run cleanup:orphans:apply`) to actually delete.');
        process.exit(0);
    }

    // SAFETY: refuse to delete more than 200 files in one go
    if (allOrphans.length > 200) {
        console.error(`\nABORT: ${allOrphans.length} orphans is too many to delete automatically.`);
        console.error('Investigate (DB issue?) or run with --scope= filter.');
        process.exit(2);
    }

    console.log('\nApplying deletions...');
    let deleted = 0;
    for (const o of allOrphans) {
        const path = join(PROJECT_ROOT, o.file);
        try {
            unlinkSync(path);
            console.log(`  rm ${o.file}`);
            deleted++;
        } catch (e) {
            console.error(`  ! ${o.file}: ${e.message}`);
        }
    }
    console.log(`\nDeleted ${deleted}/${allOrphans.length} files.`);
    console.log('Remember to commit + push the deletions, then regenerate sitemaps:');
    console.log('  cd "$(git rev-parse --show-toplevel)"');
    console.log('  git add -A && git commit -m "cleanup: remove N orphan files" && git push');
    console.log('  cd scripts && node generate-sitemaps.js');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
