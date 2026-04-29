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

import { writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { createSupabaseClient } from './seo-helpers.js';

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

function citySlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
    const today = new Date().toISOString().split('T')[0];

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

    // ---- sitemap.xml (index) ----
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    indexXml += `<sitemap><loc>${BASE_URL}/sitemap-main.xml</loc><lastmod>${today}</lastmod></sitemap>\n`;
    indexXml += `<sitemap><loc>${BASE_URL}/sitemap-cities.xml</loc><lastmod>${today}</lastmod></sitemap>\n`;
    for (let i = 1; i <= chunkCount; i++) {
        indexXml += `<sitemap><loc>${BASE_URL}/sitemap-stickers-${i}.xml</loc><lastmod>${today}</lastmod></sitemap>\n`;
    }
    indexXml += '</sitemapindex>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap.xml'), indexXml, 'utf-8');
    console.log(`  sitemap.xml — index with ${1 + 1 + chunkCount} sub-sitemaps`);

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
    let mainXml = xmlOpen();
    for (const p of staticPages) {
        mainXml += urlEntry(`${BASE_URL}${p.loc}`, today, p.changefreq, p.priority);
    }
    for (const cc of countries) {
        mainXml += urlEntry(`${BASE_URL}/countries/${cc}.html`, today, 'weekly', '0.8');
    }
    for (const club of clubs) {
        mainXml += urlEntry(`${BASE_URL}/clubs/${club.id}.html`, today, 'weekly', '0.7');
    }
    mainXml += '</urlset>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap-main.xml'), mainXml, 'utf-8');
    console.log(`  sitemap-main.xml — ${staticPages.length} static + ${countries.length} countries + ${clubs.length} clubs`);

    // ---- sitemap-cities.xml ----
    let citiesXml = xmlOpen();
    for (const slug of cityFiles) {
        citiesXml += urlEntry(`${BASE_URL}/cities/${slug}.html`, today, 'weekly', '0.7');
    }
    citiesXml += '</urlset>\n';
    writeFileSync(join(PROJECT_ROOT, 'sitemap-cities.xml'), citiesXml, 'utf-8');
    console.log(`  sitemap-cities.xml — ${cityFiles.length} cities`);

    // ---- sitemap-stickers-N.xml ----
    for (let i = 0; i < chunkCount; i++) {
        const chunk = stickers.slice(i * STICKERS_PER_FILE, (i + 1) * STICKERS_PER_FILE);
        let xml = xmlOpen();
        for (const s of chunk) {
            xml += urlEntry(`${BASE_URL}/stickers/${s.id}.html`, today, 'monthly', '0.6');
        }
        xml += '</urlset>\n';
        writeFileSync(join(PROJECT_ROOT, `sitemap-stickers-${i + 1}.xml`), xml, 'utf-8');
        console.log(`  sitemap-stickers-${i + 1}.xml — ${chunk.length} stickers (IDs ${chunk[0].id}..${chunk[chunk.length - 1].id})`);
    }

    console.log('\nDone. lastmod=' + today);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
