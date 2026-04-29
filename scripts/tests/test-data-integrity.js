#!/usr/bin/env node

/**
 * Data integrity tests — DB↔HTML parity, storage variants, sitemap freshness, city sync.
 *
 * These tests detect SYSTEMIC issues that the existing generator tests miss:
 * - test-generators.js verifies each generator's OUTPUT is well-formed,
 *   but assumes you'll run it after every relevant change.
 * - These tests verify that the actual STATE of the deployed site matches
 *   the database, regardless of whether someone forgot to run a generator.
 *
 * Run: node scripts/tests/test-data-integrity.js
 *      npm run test:integrity
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let passed = 0, failed = 0;
const failures = [];

function assert(condition, name) {
    if (condition) { passed++; process.stdout.write('.'); }
    else { failed++; failures.push(name); process.stdout.write('✗'); }
}

async function fetchAll(table, select, order = 'id') {
    const PAGE = 1000;
    const out = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).order(order, { ascending: true }).range(offset, offset + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return out;
}

// ─── Test: DB↔HTML parity ────────────────────────────────────────────────

async function testDbHtmlParity() {
    console.log('\n\n🔁 DB↔HTML Parity Tests');

    const stickers = await fetchAll('stickers', 'id');
    const clubs = await fetchAll('clubs', 'id, country');
    const countriesInDb = [...new Set(clubs.map(c => (c.country || '').toUpperCase()).filter(Boolean))];

    // Stickers
    const stickerHtmls = readdirSync(join(PROJECT_ROOT, 'stickers')).filter(f => f.endsWith('.html'));
    const stickerHtmlIds = new Set(stickerHtmls.map(f => parseInt(f.replace('.html', ''))).filter(n => !isNaN(n)));
    const stickerDbIds = new Set(stickers.map(s => s.id));
    const missingSticker = [...stickerDbIds].filter(id => !stickerHtmlIds.has(id));
    const orphanSticker = [...stickerHtmlIds].filter(id => !stickerDbIds.has(id));
    assert(missingSticker.length === 0, `stickers: 0 missing HTML (found ${missingSticker.length}: ${missingSticker.slice(0, 10).join(',')})`);
    assert(orphanSticker.length === 0, `stickers: 0 orphan HTML (found ${orphanSticker.length}: ${orphanSticker.slice(0, 10).join(',')})`);

    // Clubs
    const clubHtmls = readdirSync(join(PROJECT_ROOT, 'clubs')).filter(f => f.endsWith('.html'));
    const clubHtmlIds = new Set(clubHtmls.map(f => parseInt(f.replace('.html', ''))).filter(n => !isNaN(n)));
    const clubDbIds = new Set(clubs.map(c => c.id));
    const missingClub = [...clubDbIds].filter(id => !clubHtmlIds.has(id));
    const orphanClub = [...clubHtmlIds].filter(id => !clubDbIds.has(id));
    assert(missingClub.length === 0, `clubs: 0 missing HTML (found ${missingClub.length})`);
    assert(orphanClub.length === 0, `clubs: 0 orphan HTML (found ${orphanClub.length})`);

    // Countries
    const countryHtmls = readdirSync(join(PROJECT_ROOT, 'countries')).filter(f => f.endsWith('.html'));
    const countryHtmlCodes = new Set(countryHtmls.map(f => f.replace('.html', '').toUpperCase()));
    const countryDbCodes = new Set(countriesInDb);
    const missingCountry = [...countryDbCodes].filter(c => !countryHtmlCodes.has(c));
    const orphanCountry = [...countryHtmlCodes].filter(c => !countryDbCodes.has(c));
    assert(missingCountry.length === 0, `countries: 0 missing HTML (${missingCountry.join(',')})`);
    assert(orphanCountry.length === 0, `countries: 0 orphan HTML (${orphanCountry.join(',')})`);
}

// ─── Test: Storage _web.webp/_thumb.webp variants for last 30 days ───────

async function testStorageVariants() {
    console.log('\n\n🖼  Storage Variants Tests (last 30 days)');

    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: recent, error } = await supabase
        .from('stickers')
        .select('id, image_url, created_at')
        .gte('created_at', since)
        .order('id', { ascending: true });
    if (error) {
        assert(false, `fetch recent stickers: ${error.message}`);
        return;
    }

    const sample = recent.slice(0, 50); // cap at 50 to keep CI fast
    const CONCURRENCY = 10;
    const missing = [];

    for (let i = 0; i < sample.length; i += CONCURRENCY) {
        const batch = sample.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async s => {
            const webUrl = s.image_url.replace(/\.[a-z]+$/i, '_web.webp');
            const thumbUrl = s.image_url.replace(/\.[a-z]+$/i, '_thumb.webp');
            const [webRes, thumbRes] = await Promise.all([
                fetch(webUrl, { method: 'HEAD' }),
                fetch(thumbUrl, { method: 'HEAD' })
            ]);
            if (!webRes.ok) missing.push(`#${s.id} _web ${webRes.status}`);
            if (!thumbRes.ok) missing.push(`#${s.id} _thumb ${thumbRes.status}`);
        }));
    }

    assert(missing.length === 0, `last 30d: 0 missing variants (found ${missing.length}: ${missing.slice(0, 5).join(', ')})`);
}

// ─── Test: Sitemap freshness ─────────────────────────────────────────────

async function testSitemapFreshness() {
    console.log('\n\n🗺  Sitemap Freshness Tests');

    const sitemapFiles = ['sitemap.xml', 'sitemap-main.xml', 'sitemap-cities.xml'];
    const stickerSitemaps = readdirSync(PROJECT_ROOT)
        .filter(f => /^sitemap-stickers-\d+\.xml$/.test(f))
        .sort();
    sitemapFiles.push(...stickerSitemaps);

    for (const f of sitemapFiles) {
        const path = join(PROJECT_ROOT, f);
        assert(existsSync(path), `${f}: file exists`);
    }

    // sitemap.xml index references all sub-sitemaps
    const indexXml = readFileSync(join(PROJECT_ROOT, 'sitemap.xml'), 'utf-8');
    assert(indexXml.includes('sitemap-cities.xml'), 'sitemap.xml: references cities sub-sitemap');
    assert(indexXml.includes('sitemap-main.xml'), 'sitemap.xml: references main sub-sitemap');
    for (const sf of stickerSitemaps) {
        assert(indexXml.includes(sf), `sitemap.xml: references ${sf}`);
    }

    // Newest sticker sitemap covers max DB sticker ID
    const { data: latest } = await supabase.from('stickers').select('id').order('id', { ascending: false }).limit(1);
    const maxDbId = latest?.[0]?.id;
    if (maxDbId) {
        const lastSticker = stickerSitemaps[stickerSitemaps.length - 1];
        const lastXml = readFileSync(join(PROJECT_ROOT, lastSticker), 'utf-8');
        assert(lastXml.includes(`/stickers/${maxDbId}.html`), `${lastSticker}: covers max DB sticker #${maxDbId}`);
    }

    // lastmod in main sitemap should be within 7 days
    const mainXml = readFileSync(join(PROJECT_ROOT, 'sitemap-main.xml'), 'utf-8');
    const lastmodMatch = mainXml.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
    if (lastmodMatch) {
        const ageDays = (Date.now() - new Date(lastmodMatch[1]).getTime()) / 86400_000;
        assert(ageDays <= 7, `sitemap-main.xml: lastmod within 7 days (was ${Math.round(ageDays)}d ago)`);
    } else {
        assert(false, 'sitemap-main.xml: has <lastmod>');
    }
}

// ─── Test: City sync ─────────────────────────────────────────────────────

async function testCitySync() {
    console.log('\n\n🏙  City Sync Tests');

    // Check 5 cities (deterministic — the largest by sticker count)
    const stickers = await fetchAll('stickers', 'id, location');
    const cityCounts = {};
    for (const s of stickers) {
        if (!s.location) continue;
        const city = s.location.split(',')[0].trim();
        if (!city) continue;
        cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
    const top5 = Object.entries(cityCounts)
        .filter(([_, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    for (const [city, count] of top5) {
        const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const path = join(PROJECT_ROOT, 'cities', `${slug}.html`);
        if (!existsSync(path)) {
            assert(false, `cities/${slug}.html exists (DB: ${count} stickers in "${city}")`);
            continue;
        }
        const html = readFileSync(path, 'utf-8');
        const htmlCount = (html.match(/data-sticker-id/g) || []).length;
        assert(htmlCount === count, `cities/${slug}.html sticker count: HTML ${htmlCount} == DB ${count}`);
    }
}

// ─── Run ─────────────────────────────────────────────────────────────────

async function main() {
    console.log('🧪 StickerHunt Data Integrity Tests\n');
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('⏭  SUPABASE_URL/ANON_KEY not set — skipping integrity tests.');
        process.exit(0);
    }
    await testDbHtmlParity();
    await testStorageVariants();
    await testSitemapFreshness();
    await testCitySync();
    console.log(`\n\n${'═'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
        console.log('\nFailed:');
        failures.forEach(f => console.log(`  ✗ ${f}`));
    }
    console.log('═'.repeat(50));
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
