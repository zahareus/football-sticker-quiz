#!/usr/bin/env node

/**
 * Generate all sitemaps from current Supabase state.
 *
 * Output:
 *   sitemap.xml             — index referencing all sub-sitemaps (with lastmod)
 *   sitemap-main.xml        — static pages + countries + clubs
 *   sitemap-cities.xml      — generated city pages (mirrors filesystem)
 *   sitemap-stickers-N.xml  — sticker pages, dynamic chunking 1000/file
 *
 * Source of truth: Supabase + filesystem (cities/*.html).
 * Replaces the buggy hardcoded generateSitemaps() inside generate-static-pages.js
 * (kept there for backward compatibility but NOT called separately).
 *
 * Usage: node generate-sitemaps.js
 */

import { writeFileSync, readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { createSupabaseClient, cityToSlug } from './seo-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const BASE_URL = 'https://stickerhunt.club';
const STICKERS_PER_FILE = 1000;

const supabase = createSupabaseClient();

async function fetchAll(table, select, order) {
    const PAGE = 1000;
    const out = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(select)
            .order(order, { ascending: true })
            .range(offset, offset + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return out;
}

function xmlOpen() {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
}

function urlEntry(loc, lastmod, changefreq, priority) {
    return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>\n`;
}

/**
 * Build a loc -> lastmod map from already-committed sitemap files.
 *
 * Why: stamping lastmod=today on every URL each run poisons Google's crawl
 * budget — frequent full regenerations made the whole sitemap claim "everything
 * changed today" daily, so Google stopped trusting lastmod and throttled crawl
 * (visibility collapse mid-May 2026). We instead preserve each URL's existing
 * lastmod and only stamp `today` on genuinely NEW urls. File mtimes are useless
 * here because CI checkout resets them, so we read the committed XML, not the FS.
 */
function loadExistingLastmods(projectRoot) {
    const map = new Map();
    let files = [];
    try {
        files = readdirSync(projectRoot).filter(f => /^sitemap-.*\.xml$/.test(f));
    } catch {}
    const re = /<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g;
    for (const f of files) {
        const path = join(projectRoot, f);
        if (!existsSync(path)) continue;
        const xml = readFileSync(path, 'utf-8');
        let m;
        while ((m = re.exec(xml)) !== null) map.set(m[1], m[2]);
    }
    return map;
}

async function main() {
    const today = new Date().toISOString().split('T')[0];
    // Force a fresh lastmod on every URL — use ONLY for intentional site-wide
    // changes (template/layout overhaul), never on routine regeneration.
    const touchAll = process.env.SITEMAP_TOUCH_ALL === '1';
    const prevLastmod = touchAll ? new Map() : loadExistingLastmods(PROJECT_ROOT);
    // Preserve an existing URL's lastmod; only new URLs get today.
    const lm = (loc) => prevLastmod.get(loc) || today;
    if (touchAll) console.log('SITEMAP_TOUCH_ALL=1 — stamping today on every URL');
    else console.log(`Preserving lastmod for ${prevLastmod.size} known URLs`);

    console.log('Fetching from Supabase...');
    const stickers = await fetchAll('stickers', 'id', 'id');
    const clubs = await fetchAll('clubs', 'id, country', 'id');
    console.log(`  ${stickers.length} stickers, ${clubs.length} clubs`);

    const countries = [...new Set(clubs.map(c => (c.country || '').toUpperCase()).filter(Boolean))].sort();

    // Sticker chunks (dynamic 1000/file)
    const chunkCount = Math.max(1, Math.ceil(stickers.length / STICKERS_PER_FILE));

    // City pages — mirror filesystem (only generated cities exist)
    const citiesDir = join(PROJECT_ROOT, 'cities');
    let cityFiles = [];
    try {
        cityFiles = readdirSync(citiesDir)
            .filter(f => f.endsWith('.html') && f !== 'index.html')
            .map(f => f.replace(/\.html$/, ''));
    } catch {}
    cityFiles.sort();

    // ---- sitemap-main.xml ----
    const staticPages = [
        { loc: '/', changefreq: 'daily', priority: '1.0' },
        { loc: '/quiz.html', changefreq: 'weekly', priority: '0.9' },
        { loc: '/catalogue.html', changefreq: 'daily', priority: '0.9' },
        { loc: '/cities/', changefreq: 'weekly', priority: '0.7' },
        { loc: '/leaderboard.html', changefreq: 'hourly', priority: '0.7' },
        { loc: '/map.html', changefreq: 'weekly', priority: '0.6' },
        { loc: '/stickerstat.html', changefreq: 'daily', priority: '0.6' },
        { loc: '/rating.html', changefreq: 'daily', priority: '0.7' },
        { loc: '/battle.html', changefreq: 'weekly', priority: '0.6' },
        { loc: '/about.html', changefreq: 'monthly', priority: '0.3' },
        { loc: '/privacy.html', changefreq: 'monthly', priority: '0.2' },
        { loc: '/terms.html', changefreq: 'monthly', priority: '0.2' },
    ];
    const maxLm = {}; // filename -> max lastmod used, for the index
    const track = (file, val) => { if (!maxLm[file] || val > maxLm[file]) maxLm[file] = val; };

    let mainXml = xmlOpen();
    for (const p of staticPages) {
        const loc = `${BASE_URL}${p.loc}`;
        const d = lm(loc); track('sitemap-main.xml', d);
        mainXml += urlEntry(loc, d, p.changefreq, p.priority);
    }
    for (const cc of countries) {
        const loc = `${BASE_URL}/countries/${cc}.html`;
        const d = lm(loc); track('sitemap-main.xml', d);
        mainXml += urlEntry(loc, d, 'weekly', '0.8');
    }
    for (const club of clubs) {
        const loc = `${BASE_URL}/clubs/${club.id}.html`;
        const d = lm(loc); track('sitemap-main.xml', d);
        mainXml += urlEntry(loc, d, 'weekly', '0.7');
    }
    mainXml += '</urlset>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap-main.xml'), mainXml, 'utf-8');
    console.log(`  sitemap-main.xml — ${staticPages.length} static + ${countries.length} countries + ${clubs.length} clubs`);

    // ---- sitemap-cities.xml ----
    let citiesXml = xmlOpen();
    for (const slug of cityFiles) {
        const loc = `${BASE_URL}/cities/${slug}.html`;
        const d = lm(loc); track('sitemap-cities.xml', d);
        citiesXml += urlEntry(loc, d, 'weekly', '0.7');
    }
    citiesXml += '</urlset>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap-cities.xml'), citiesXml, 'utf-8');
    console.log(`  sitemap-cities.xml — ${cityFiles.length} cities`);

    // ---- sitemap-stickers-N.xml ----
    for (let i = 0; i < chunkCount; i++) {
        const chunk = stickers.slice(i * STICKERS_PER_FILE, (i + 1) * STICKERS_PER_FILE);
        const file = `sitemap-stickers-${i + 1}.xml`;
        let xml = xmlOpen();
        for (const s of chunk) {
            const loc = `${BASE_URL}/stickers/${s.id}.html`;
            const d = lm(loc); track(file, d);
            xml += urlEntry(loc, d, 'monthly', '0.6');
        }
        xml += '</urlset>\n';
        writeFileSync(join(PROJECT_ROOT, file), xml, 'utf-8');
        console.log(`  sitemap-stickers-${i + 1}.xml — ${chunk.length} stickers (IDs ${chunk[0].id}..${chunk[chunk.length - 1].id})`);
    }

    // ---- sitemap.xml (index) — each sub-sitemap's lastmod = newest URL inside it ----
    const subFiles = ['sitemap-main.xml', 'sitemap-cities.xml',
        ...Array.from({ length: chunkCount }, (_, i) => `sitemap-stickers-${i + 1}.xml`)];
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const file of subFiles) {
        indexXml += `<sitemap><loc>${BASE_URL}/${file}</loc><lastmod>${maxLm[file] || today}</lastmod></sitemap>\n`;
    }
    indexXml += '</sitemapindex>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap.xml'), indexXml, 'utf-8');
    console.log(`  sitemap.xml — index with ${subFiles.length} sub-sitemaps`);

    console.log('\nDone. today=' + today + (touchAll ? ' (touched all)' : ' (lastmod preserved for existing URLs)'));
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
