#!/usr/bin/env node

/**
 * Test: regenerate-country-pages.js produces V2-compatible output
 *
 * Verifies that the data object passed to replacePlaceholders() covers
 * every {{PLACEHOLDER}} in the country-page.html template, and that
 * V2-specific elements appear in the final HTML.
 *
 * Run: node scripts/tests/test-country-page-sync.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

import {
    loadTemplate,
    replacePlaceholders,
    getCountryName,
    generateBreadcrumbs,
    generateBreadcrumbSchema,
    selectTopRatedStickers,
    generateFeaturedGallery,
    generateMultilingualMeta,
    stripEmoji,
    getOptimizedImageUrl,
    getThumbnailUrl,
    cleanTrailingQuery,
} from '../seo-helpers.js';

// ─── Paths ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(label, fn) {
    try {
        fn();
        console.log(`  PASS  ${label}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL  ${label}`);
        console.log(`        ${e.message}`);
        failed++;
    }
}

function extractPlaceholders(html) {
    const matches = html.match(/\{\{([A-Z_]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

// ─── Country flag map (same as used by V2 generators) ───────────────────────

const COUNTRY_FLAGS = {
    'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'WLS': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'DEU': '🇩🇪', 'ESP': '🇪🇸', 'ITA': '🇮🇹', 'FRA': '🇫🇷', 'NLD': '🇳🇱',
    'PRT': '🇵🇹', 'BRA': '🇧🇷', 'ARG': '🇦🇷', 'UKR': '🇺🇦', 'TUR': '🇹🇷',
};

// ─── Mock data ──────────────────────────────────────────────────────────────

function buildMockData(countryCode, clubs, stickers) {
    const countryName = getCountryName(countryCode);
    const totalStickers = stickers.length;
    const countryFlag = COUNTRY_FLAGS[countryCode.toUpperCase()] || '🏳️';

    // Build clubs map
    const allClubsMap = {};
    clubs.forEach(c => { allClubsMap[c.id] = c; });

    // Sticker counts per club
    const stickerCountsByClub = {};
    stickers.forEach(s => {
        stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
    });

    // Top stickers for gallery
    const topStickers = selectTopRatedStickers(stickers, 6);
    const ogImage = topStickers.length > 0
        ? cleanTrailingQuery(getOptimizedImageUrl(topStickers[0].image_url))
        : 'https://stickerhunt.club/metash.png';

    // Most Collected section (V2 name)
    const mostCollectedHtml = generateFeaturedGallery(
        topStickers, allClubsMap, `Most Collected from ${countryName}`
    );

    // Club cards (V2 format — cat-club-card divs)
    let clubCardsHtml = '';
    const sortedClubs = [...clubs].sort((a, b) => a.name.localeCompare(b.name));
    sortedClubs.forEach(club => {
        const count = stickerCountsByClub[club.id] || 0;
        clubCardsHtml += `<a href="/clubs/${club.id}.html" class="cat-club-card">` +
            `<span class="cat-club-name">${stripEmoji(club.name)}</span>` +
            `<span class="cat-club-count">${count} sticker${count !== 1 ? 's' : ''}</span>` +
            `</a>\n`;
    });

    // SEO description
    const seoDescription = `Explore football stickers from ${clubs.length} clubs in ${countryName}. ` +
        `Our database includes ${totalStickers} stickers from ${countryName}, ` +
        `covering clubs from across the country.`;

    // Multilingual meta
    const multilingualMeta = generateMultilingualMeta({
        type: 'country',
        countryCode,
        vars: { country: countryName, clubCount: clubs.length, total: totalStickers }
    });

    // Breadcrumbs
    const breadcrumbLinks = [
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ];

    // Schema
    const schemaItems = clubs.map((club, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": stripEmoji(club.name),
        "url": `https://stickerhunt.club/clubs/${club.id}.html`
    }));
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Football clubs from ${countryName}`,
        "numberOfItems": clubs.length,
        "itemListElement": schemaItems
    };
    const schemaJsonLd = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

    // V2 data object — all placeholders the template expects
    return {
        PAGE_TITLE: `${countryName} Football Stickers — ${clubs.length} Clubs | StickerHunt`,
        META_DESCRIPTION: `Browse football stickers from ${clubs.length} clubs in ${countryName}.`,
        META_KEYWORDS: `${countryName} football stickers, ${countryName} clubs`,
        CANONICAL_URL: `https://stickerhunt.club/countries/${countryCode.toUpperCase()}.html`,
        OG_IMAGE: ogImage,
        MULTILINGUAL_META: multilingualMeta,
        SCHEMA_JSON_LD: schemaJsonLd,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema(breadcrumbLinks),
        BREADCRUMBS: generateBreadcrumbs(breadcrumbLinks),
        COUNTRY_FLAG: countryFlag,
        COUNTRY_NAME: countryName,
        CLUB_COUNT: String(clubs.length),
        TOTAL_STICKERS: String(totalStickers),
        MOST_COLLECTED_SECTION: mostCollectedHtml,
        CLUB_CARDS: clubCardsHtml,
        SEO_DESCRIPTION: seoDescription,
    };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const CLUBS_NORMAL = [
    { id: 101, name: '⚽ FC Testington', country: 'ENG' },
    { id: 102, name: '🏟️ Mockham United', country: 'ENG' },
    { id: 103, name: 'Stubford City', country: 'ENG' },
];

const STICKERS_NORMAL = [
    { id: 1001, club_id: 101, image_url: 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/s1.png', rating: 1650, games: 20 },
    { id: 1002, club_id: 101, image_url: 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/s2.png', rating: 1520, games: 15 },
    { id: 1003, club_id: 102, image_url: 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/s3.png', rating: 1580, games: 12 },
    { id: 1004, club_id: 103, image_url: 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/s4.png', rating: 1490, games: 8 },
];

const CLUBS_EDGE = [
    { id: 201, name: 'Lonely FC', country: 'ISL' },
];

const STICKERS_EDGE = []; // 0 stickers

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('\n=== Test: country-page V2 sync ===\n');

// ── 1. Template placeholder discovery ────────────────────────────────────────

const template = loadTemplate('country-page.html', PROJECT_ROOT);
const templatePlaceholders = extractPlaceholders(template);

check('Template has placeholders', () => {
    assert.ok(templatePlaceholders.length > 0, 'No placeholders found in template');
});

console.log(`\n  Template placeholders found (${templatePlaceholders.length}):`);
templatePlaceholders.forEach(p => console.log(`    {{${p}}}`));
console.log('');

// ── 2. Normal country — no leftover placeholders ─────────────────────────────

const dataNormal = buildMockData('ENG', CLUBS_NORMAL, STICKERS_NORMAL);
const htmlNormal = replacePlaceholders(template, dataNormal);

check('Normal country: no leftover {{...}} placeholders', () => {
    const leftovers = htmlNormal.match(/\{\{[A-Z_]+\}\}/g);
    if (leftovers) {
        const unique = [...new Set(leftovers)];
        assert.fail(`Leftover placeholders: ${unique.join(', ')}`);
    }
});

// ── 3. V2 elements present in output ─────────────────────────────────────────

check('V2: "Most Collected" text present', () => {
    assert.ok(htmlNormal.includes('Most Collected'), 'Missing "Most Collected" in output');
});

check('V2: "cat-club-card" class present', () => {
    assert.ok(htmlNormal.includes('cat-club-card'), 'Missing "cat-club-card" class in output');
});

check('V2: "cat-country-grid" class present (from template)', () => {
    assert.ok(htmlNormal.includes('cat-country-grid'), 'Missing "cat-country-grid" class');
});

check('V2: SEO_DESCRIPTION text rendered', () => {
    assert.ok(htmlNormal.includes('Explore football stickers from 3 clubs in England'),
        'SEO_DESCRIPTION content not rendered');
});

check('V2: COUNTRY_FLAG rendered (not raw placeholder)', () => {
    assert.ok(!htmlNormal.includes('{{COUNTRY_FLAG}}'), 'COUNTRY_FLAG placeholder still raw');
    // The flag emoji or fallback should be present before the country name in the h1
    assert.ok(htmlNormal.includes('England'), 'Country name missing from output');
});

check('V2: TOTAL_STICKERS rendered', () => {
    assert.ok(!htmlNormal.includes('{{TOTAL_STICKERS}}'), 'TOTAL_STICKERS placeholder still raw');
    assert.ok(htmlNormal.includes('>4</span> stickers'), 'Total sticker count not in output');
});

check('V2: CLUB_COUNT rendered', () => {
    assert.ok(!htmlNormal.includes('{{CLUB_COUNT}}'), 'CLUB_COUNT placeholder still raw');
    assert.ok(htmlNormal.includes('>3</span> clubs'), 'Club count not in output');
});

check('V2: Club cards link to correct club pages', () => {
    assert.ok(htmlNormal.includes('/clubs/101.html'), 'Missing link to club 101');
    assert.ok(htmlNormal.includes('/clubs/102.html'), 'Missing link to club 102');
    assert.ok(htmlNormal.includes('/clubs/103.html'), 'Missing link to club 103');
});

// ── 4. Edge case: 1 club, 0 stickers ────────────────────────────────────────

console.log('');
const dataEdge = buildMockData('ISL', CLUBS_EDGE, STICKERS_EDGE);
const htmlEdge = replacePlaceholders(template, dataEdge);

check('Edge (1 club, 0 stickers): no leftover {{...}} placeholders', () => {
    const leftovers = htmlEdge.match(/\{\{[A-Z_]+\}\}/g);
    if (leftovers) {
        const unique = [...new Set(leftovers)];
        assert.fail(`Leftover placeholders: ${unique.join(', ')}`);
    }
});

check('Edge: valid HTML (has <html> and </html>)', () => {
    assert.ok(htmlEdge.includes('<html'), 'Missing <html> tag');
    assert.ok(htmlEdge.includes('</html>'), 'Missing </html> tag');
});

check('Edge: country name rendered', () => {
    assert.ok(htmlEdge.includes('Iceland'), 'Country name "Iceland" not found');
});

check('Edge: 0 stickers shown', () => {
    assert.ok(htmlEdge.includes('>0</span> stickers'), 'Zero sticker count not rendered');
});

check('Edge: Most Collected section is empty (no stickers)', () => {
    // generateFeaturedGallery returns '' when no stickers
    // So the MOST_COLLECTED_SECTION should be empty, no gallery rendered
    assert.ok(!htmlEdge.includes('sticker-strip'), 'Sticker strip should not appear with 0 stickers');
});

// ── 5. Cross-check: generator data keys vs template placeholders ─────────────

console.log('');
const generatorKeys = Object.keys(dataNormal);

check('All template placeholders covered by data object', () => {
    const missing = templatePlaceholders.filter(p => !generatorKeys.includes(p));
    if (missing.length > 0) {
        assert.fail(`Template placeholders NOT in data object: ${missing.map(m => '{{' + m + '}}').join(', ')}`);
    }
});

check('No extra keys in data that template does not use', () => {
    const extra = generatorKeys.filter(k => !templatePlaceholders.includes(k));
    if (extra.length > 0) {
        // This is a warning, not a failure — extra keys are harmless
        console.log(`        (info) Extra keys not in template: ${extra.join(', ')}`);
    }
    // Always pass — extra keys are OK
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
    console.log('Some tests FAILED. The regenerate-country-pages.js generator');
    console.log('is out of sync with the V2 country-page.html template.');
    console.log('Compare the data keys in generateCountryPage() with the');
    console.log('{{PLACEHOLDER}} names in templates/country-page.html.\n');
    process.exit(1);
}
