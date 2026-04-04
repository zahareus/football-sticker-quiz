#!/usr/bin/env node

/**
 * StickerHunt Generator Test Suite
 * Verifies all page generators produce correct output after changes.
 * Run after any generator modification: node test-generators.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __scriptsDir = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__scriptsDir, '..');
dotenv.config({ path: join(__scriptsDir, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let passed = 0, failed = 0;
const failures = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        process.stdout.write('.');
    } else {
        failed++;
        failures.push(testName);
        process.stdout.write('✗');
    }
}

function readPage(relativePath) {
    const fullPath = join(PROJECT_ROOT, relativePath);
    if (!existsSync(fullPath)) return null;
    return readFileSync(fullPath, 'utf-8');
}

function checkNoUnreplacedPlaceholders(html, pageName) {
    const matches = html.match(/\{\{[A-Z_]+\}\}/g);
    assert(!matches || matches.length === 0, `${pageName}: no unreplaced {{PLACEHOLDERS}} (found: ${matches?.join(', ') || 'none'})`);
}

function checkHasContent(html, pattern, pageName, what) {
    assert(html.includes(pattern), `${pageName}: has ${what}`);
}

function checkMetaTag(html, property, pageName) {
    const regex = new RegExp(`<meta[^>]*${property}[^>]*content="[^"]+"`);
    assert(regex.test(html), `${pageName}: has ${property} meta tag`);
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

async function testStickerPage() {
    console.log('\n\n📄 Sticker Page Tests');

    // Generate a test sticker
    execSync(`node "${join(__scriptsDir, 'generate-single-sticker.js')}" 311`, { cwd: __scriptsDir, stdio: 'pipe' });
    const html = readPage('stickers/311.html');
    assert(html !== null, 'sticker/311.html exists');
    if (!html) return;

    checkNoUnreplacedPlaceholders(html, 'sticker');
    checkMetaTag(html, 'og:image', 'sticker');
    checkMetaTag(html, 'og:title', 'sticker');
    checkHasContent(html, '_web.webp', 'sticker', 'WebP OG image');
    checkHasContent(html, 'lang="de"', 'sticker', 'German multilingual meta');
    checkHasContent(html, 'lang="nl"', 'sticker', 'Dutch multilingual meta');
    checkHasContent(html, 'BreadcrumbList', 'sticker', 'breadcrumb schema');
    checkHasContent(html, 'ImageObject', 'sticker', 'ImageObject schema');
    checkHasContent(html, 'football sticker', 'sticker', 'descriptive alt text');
    // Check alt text is NOT generic
    assert(!html.includes('alt="Sticker ID '), 'sticker: no generic alt text');
}

async function testClubPage() {
    console.log('\n\n🏟️ Club Page Tests');

    // Regenerate test club to ensure V2 layout
    execSync(`node "${join(__scriptsDir, 'regenerate-club-pages.js')}" 617`, { cwd: __scriptsDir, stdio: 'pipe', timeout: 60000 });
    const html = readPage('clubs/617.html');
    assert(html !== null, 'clubs/617.html exists');
    if (!html) return;

    checkNoUnreplacedPlaceholders(html, 'club');
    checkMetaTag(html, 'og:image', 'club');
    checkHasContent(html, '_web.webp', 'club', 'WebP OG image');
    checkHasContent(html, 'lang="no"', 'club', 'Norwegian multilingual meta');
    checkHasContent(html, 'CollectionPage', 'club', 'CollectionPage schema');
    checkHasContent(html, 'SportsTeam', 'club', 'SportsTeam schema');
    checkHasContent(html, 'club-meta', 'club', 'club-meta bar (V2 layout)');
    checkHasContent(html, 'BreadcrumbList', 'club', 'breadcrumb schema');
    checkHasContent(html, 'street sticker', 'club', 'descriptive gallery alt text');
    // OG image should NOT be metash.png
    assert(!html.includes('og:image" content="https://stickerhunt.club/metash.png"'), 'club: OG image is real sticker, not fallback');
}

async function testAIEnrichedClubPage() {
    console.log('\n\n🤖 AI-Enriched Club Page Tests');

    execSync(`node "${join(__scriptsDir, 'regenerate-club-pages.js')}" 855`, { cwd: __scriptsDir, stdio: 'pipe', timeout: 60000 });
    const html = readPage('clubs/855.html');
    assert(html !== null, 'clubs/855.html exists');
    if (!html) return;

    checkNoUnreplacedPlaceholders(html, 'AI club');
    checkHasContent(html, 'club-about', 'AI club', 'AI-generated club-about (V2 layout)');
    checkHasContent(html, 'lang="de"', 'AI club', 'German multilingual meta');
}

async function testCountryPage() {
    console.log('\n\n🌍 Country Page Tests');

    // Use already-generated ENG page (V2 layout)
    const html = readPage('countries/ENG.html');
    assert(html !== null, 'countries/ENG.html exists');
    if (!html) return;

    checkNoUnreplacedPlaceholders(html, 'country');
    checkMetaTag(html, 'og:image', 'country');
    checkHasContent(html, 'cat-hero', 'country', 'V2 hero section');
    checkHasContent(html, 'cat-clubs-strip', 'country', 'Most Collected clubs strip (V2)');
    checkHasContent(html, 'cat-country-grid', 'country', 'club cards grid (V2)');
    checkHasContent(html, 'cat-seo-text', 'country', 'SEO text block (V2)');
    checkHasContent(html, 'country-club-thumb', 'country', 'club thumbnails');
    checkHasContent(html, 'title="', 'country', 'tooltip on club cards');
    checkHasContent(html, 'lang="de"', 'country', 'German multilingual meta');
    checkHasContent(html, 'ItemList', 'country', 'ItemList schema');
    checkHasContent(html, 'BreadcrumbList', 'country', 'breadcrumb schema');
    // OG should NOT be metash.png
    assert(!html.includes('og:image" content="https://stickerhunt.club/metash.png"'), 'country: OG image is real sticker');
    // Should NOT have old layout
    assert(!html.includes('sticker-strip'), 'country: no old sticker-strip class');
    assert(!html.includes('club-list'), 'country: no old club-list class');
}

async function testCityPage() {
    console.log('\n\n🏙️ City Page Tests');

    const html = readPage('cities/amsterdam.html');
    assert(html !== null, 'cities/amsterdam.html exists');
    if (!html) return;

    checkNoUnreplacedPlaceholders(html, 'city');
    checkMetaTag(html, 'og:image', 'city');
    checkHasContent(html, '_web.webp', 'city', 'WebP OG image');
    checkHasContent(html, 'lang=', 'city', 'multilingual meta');
    checkHasContent(html, 'BreadcrumbList', 'city', 'breadcrumb schema');
}

async function testWikiCache() {
    console.log('\n\n📚 Wiki Cache Tests');

    const cachePath = join(__scriptsDir, 'wiki-cache.json');
    assert(existsSync(cachePath), 'wiki-cache.json exists');

    const cache = JSON.parse(readFileSync(cachePath, 'utf-8'));
    const entries = Object.keys(cache).length;
    assert(entries >= 670, `wiki cache has ${entries} entries (expected 670+)`);

    // Check AI-enriched entries
    const aiEntries = Object.values(cache).filter(v => v.source === 'ai');
    assert(aiEntries.length >= 100, `wiki cache has ${aiEntries.length} AI entries (expected 100+)`);

    // Check that AI entries have intro
    const aiWithIntro = aiEntries.filter(v => v.intro && v.intro.length > 20);
    assert(aiWithIntro.length === aiEntries.length, 'all AI entries have intro text');
}

async function testInternalLinks() {
    console.log('\n\n🔗 Internal Link Tests');

    // Sticker -> Club link
    const stickerHtml = readPage('stickers/311.html');
    assert(stickerHtml?.includes('/clubs/617.html'), 'sticker 311 links to club 617');

    // Club -> Country link
    const clubHtml = readPage('clubs/617.html');
    assert(clubHtml?.includes('/countries/NOR.html'), 'club 617 links to NOR country');

    // Country -> Club link
    const countryHtml = readPage('countries/NOR.html');
    assert(countryHtml?.includes('/clubs/617.html'), 'NOR country links to club 617');

    // Sticker -> City link (if location exists)
    // City -> Sticker link
    const cityHtml = readPage('cities/amsterdam.html');
    if (cityHtml) {
        assert(cityHtml.includes('/stickers/'), 'amsterdam city links to stickers');
    }
}

async function testDelegatorScripts() {
    console.log('\n\n🔄 Delegator Script Tests');

    // Test regenerate-stickers-batch with 2 stickers
    try {
        execSync(`node "${join(__scriptsDir, 'regenerate-stickers-batch.js')}" 311,312`, { cwd: __scriptsDir, stdio: 'pipe', timeout: 60000 });
        assert(true, 'regenerate-stickers-batch runs without error');
    } catch (e) {
        assert(false, `regenerate-stickers-batch: ${e.message.slice(0, 80)}`);
    }

    // Test regenerate-club-sticker-pages
    try {
        execSync(`node "${join(__scriptsDir, 'regenerate-club-sticker-pages.js')}" 617`, { cwd: __scriptsDir, stdio: 'pipe', timeout: 60000 });
        assert(true, 'regenerate-club-sticker-pages runs without error');
    } catch (e) {
        assert(false, `regenerate-club-sticker-pages: ${e.message.slice(0, 80)}`);
    }
}

// ─── Run All Tests ───────────────────────────────────────────────────────────

async function main() {
    console.log('🧪 StickerHunt Generator Test Suite\n');
    console.log('Running tests...');

    await testStickerPage();
    await testClubPage();
    await testAIEnrichedClubPage();
    await testCountryPage();
    await testCityPage();
    await testWikiCache();
    await testInternalLinks();
    await testDelegatorScripts();

    console.log(`\n\n${'═'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
        console.log('\nFailed tests:');
        failures.forEach(f => console.log(`  ✗ ${f}`));
    }
    console.log(`${'═'.repeat(50)}`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
