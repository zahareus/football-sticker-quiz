#!/usr/bin/env node

/**
 * Regenerate all country pages with correct sticker counts
 * Now includes: featured stickers gallery, top-rated OG image, multilingual meta, descriptive alt text
 * Usage: node regenerate-country-pages.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
    createSupabaseClient,
    COUNTRY_NAMES, getCountryName, getOptimizedImageUrl, getThumbnailUrl,
    cleanTrailingQuery, stripEmoji, loadTemplate, replacePlaceholders,
    generateBreadcrumbs, generateBreadcrumbSchema,
    generateMultilingualMeta,
    fetchAllPaginated
} from './seo-helpers.js';

// Configuration
const BASE_URL = "https://stickerhunt.club";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const supabase = createSupabaseClient();

// Country code to flag emoji
const COUNTRY_FLAGS = {
    "DEU":"🇩🇪","ESP":"🇪🇸","FRA":"🇫🇷","NLD":"🇳🇱","ITA":"🇮🇹","SWE":"🇸🇪",
    "ENG":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","CZE":"🇨🇿","BEL":"🇧🇪","CHE":"🇨🇭","POL":"🇵🇱","AUT":"🇦🇹",
    "PRT":"🇵🇹","SCO":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","SRB":"🇷🇸","HUN":"🇭🇺","NOR":"🇳🇴","HRV":"🇭🇷",
    "GRC":"🇬🇷","DNK":"🇩🇰","ROU":"🇷🇴","UKR":"🇺🇦","TUR":"🇹🇷","ISR":"🇮🇱",
    "JPN":"🇯🇵","CYP":"🇨🇾","ARG":"🇦🇷","BRA":"🇧🇷","CHL":"🇨🇱","COL":"🇨🇴",
    "URY":"🇺🇾","USA":"🇺🇸","MEX":"🇲🇽","CAN":"🇨🇦","MAR":"🇲🇦","EGY":"🇪🇬",
    "ZAF":"🇿🇦","BIH":"🇧🇦","BGR":"🇧🇬","SVK":"🇸🇰","SVN":"🇸🇮","FIN":"🇫🇮",
    "EST":"🇪🇪","LVA":"🇱🇻","LTU":"🇱🇹","IRL":"🇮🇪","WLS":"🏴󠁧󠁢󠁷󠁬󠁳󠁿","NIR":"🇬🇧",
    "MNE":"🇲🇪","GEO":"🇬🇪","BLR":"🇧🇾","ARM":"🇦🇲","KAZ":"🇰🇿","LUX":"🇱🇺",
    "MKD":"🇲🇰","MLT":"🇲🇹","ISL":"🇮🇸","AUS":"🇦🇺"
};

async function generateCountryPage(countryCode, clubs, stickerCountsByClub, countryStickers, allClubsMap) {
    const template = loadTemplate('country-page.html', PROJECT_ROOT);
    const countryName = getCountryName(countryCode);
    const countryFlag = COUNTRY_FLAGS[countryCode.toUpperCase()] || '';
    const totalStickers = clubs.reduce((sum, club) => sum + (stickerCountsByClub[club.id] || 0), 0);
    const pageTitle = `${countryName} Football Stickers — ${clubs.length} Clubs, ${totalStickers} Stickers | StickerHunt`;
    const metaDescription = `Browse ${totalStickers} football stickers from ${clubs.length} clubs in ${countryName}. Find stickers from ${countryName} clubs in the StickerHunt database.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `${countryName} football stickers, ${countryName} clubs stickers, identify ${countryName} sticker, football sticker database`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

    const multilingualMeta = generateMultilingualMeta({
        type: 'country',
        countryCode: countryCode,
        vars: { country: countryName, clubCount: clubs.length, total: totalStickers }
    });

    // Build club data with sticker counts and best-rated thumbnail
    const clubsEnriched = clubs.map(club => {
        const count = stickerCountsByClub[club.id] || 0;
        const clubStickers = (countryStickers || []).filter(s => s.club_id === club.id);
        let bestImg = null;
        let bestRating = 0;
        clubStickers.forEach(s => {
            if ((s.rating || 0) > bestRating) {
                bestRating = s.rating || 0;
                bestImg = s.image_url;
            }
        });
        return { ...club, stickerCount: count, bestImg, cleanName: stripEmoji(club.name) };
    });

    clubsEnriched.sort((a, b) => a.cleanName.localeCompare(b.cleanName, 'en'));

    // Most collected strip (top 8 by sticker count)
    const topClubs = [...clubsEnriched].filter(c => c.stickerCount > 0 && c.bestImg)
        .sort((a, b) => b.stickerCount - a.stickerCount).slice(0, 8);

    let mostCollectedHtml = '';
    if (topClubs.length > 0) {
        let stripCards = '';
        topClubs.forEach(c => {
            const thumbUrl = cleanTrailingQuery(getThumbnailUrl(c.bestImg));
            stripCards += `
                <a href="/clubs/${c.id}.html" class="cat-club-card">
                    <img src="${thumbUrl}" alt="${c.cleanName} sticker" loading="lazy" decoding="async">
                    <span class="cat-club-label">${c.cleanName}</span>
                    <span class="cat-club-count">${c.stickerCount} sticker${c.stickerCount !== 1 ? 's' : ''}</span>
                </a>`;
        });
        mostCollectedHtml = `
        <div class="cat-section">
            <div class="cat-section-header">
                <h2>Most Collected</h2>
                <span class="cat-section-meta">by number of stickers</span>
            </div>
            <div class="cat-clubs-strip">${stripCards}</div>
        </div>
        <hr class="cat-divider">`;
    }

    const ogImage = topClubs.length > 0 && topClubs[0].bestImg
        ? cleanTrailingQuery(getOptimizedImageUrl(topClubs[0].bestImg))
        : 'https://stickerhunt.club/metash.png';

    // Club cards grid
    let clubCardsHtml = '';
    clubsEnriched.forEach(club => {
        const countLabel = club.stickerCount === 1 ? '1 sticker' : `${club.stickerCount} stickers`;
        let thumbHtml = '';
        if (club.bestImg) {
            const thumbUrl = cleanTrailingQuery(getThumbnailUrl(club.bestImg));
            thumbHtml = `<img src="${thumbUrl}" class="country-club-thumb" alt="" loading="lazy" decoding="async">`;
        } else {
            thumbHtml = '<span class="country-club-thumb-placeholder"></span>';
        }
        clubCardsHtml += `
                <a href="/clubs/${club.id}.html" class="cat-country-card" title="${club.cleanName}">
                    ${thumbHtml}
                    <div class="cat-country-info">
                        <span class="cat-country-name">${club.name}</span>
                        <span class="cat-country-meta">${countLabel}</span>
                    </div>
                </a>`;
    });

    // SEO description
    const topClubNames = topClubs.slice(0, 5).map(c => c.cleanName).join(', ');
    const seoDescription = `StickerHunt features stickers from clubs across ${countryName}. The most collected clubs include ${topClubNames}. Each club page shows all stickers found, their map locations, and community ratings. Browse the complete ${countryName} collection and discover fan-spotted stickers from across the country.`;

    // Schema
    const schemaItems = clubsEnriched.map((club, i) => ({
        "@type": "ListItem", "position": i + 1,
        "name": club.cleanName, "url": `${BASE_URL}/clubs/${club.id}.html`
    }));
    const schema = {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": `Football clubs from ${countryName}`, "description": metaDescription,
        "url": canonicalUrl, "numberOfItems": clubs.length, "itemListElement": schemaItems
    };
    const schemaJsonLd = `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2).split('\n').join('\n    ')}\n    </script>`;

    const data = {
        PAGE_TITLE: pageTitle, META_DESCRIPTION: metaDescription, META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl, OG_IMAGE: ogImage, COUNTRY_NAME: countryName,
        COUNTRY_FLAG: countryFlag,
        CLUB_COUNT: clubs.length, TOTAL_STICKERS: totalStickers,
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
        ]),
        MOST_COLLECTED_SECTION: mostCollectedHtml,
        CLUB_CARDS: clubCardsHtml,
        SEO_DESCRIPTION: seoDescription,
        MULTILINGUAL_META: multilingualMeta,
        SCHEMA_JSON_LD: schemaJsonLd
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

async function main() {
    console.log('🚀 Regenerating all country pages...\n');

    try {
        // Fetch all clubs
        console.log('📦 Fetching clubs from Supabase...');
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .order('name');

        if (clubsError) throw new Error(`Error fetching clubs: ${clubsError.message}`);
        console.log(`  ✓ Fetched ${clubs.length} clubs`);

        // Build clubs map for gallery
        const allClubsMap = {};
        clubs.forEach(c => { allClubsMap[c.id] = c; });

        // Fetch all stickers with rating data
        console.log('📦 Fetching stickers (with ratings)...');
        const allStickers = await fetchAllPaginated(supabase, 'stickers', 'id, club_id, image_url, rating, games');
        console.log(`  ✓ Fetched ${allStickers.length} stickers`);

        // Count stickers per club
        const stickerCountsByClub = {};
        allStickers.forEach(s => {
            stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
        });

        // Group clubs and stickers by country
        const clubsByCountry = {};
        const stickersByCountry = {};
        clubs.forEach(club => {
            const country = club.country.toUpperCase();
            if (!clubsByCountry[country]) clubsByCountry[country] = [];
            clubsByCountry[country].push(club);
        });
        allStickers.forEach(s => {
            const club = allClubsMap[s.club_id];
            if (!club) return;
            const country = club.country.toUpperCase();
            if (!stickersByCountry[country]) stickersByCountry[country] = [];
            stickersByCountry[country].push(s);
        });

        const countries = Object.keys(clubsByCountry);
        console.log(`  ✓ Found ${countries.length} countries\n`);

        // Generate country pages
        console.log('🔨 Generating country pages...');
        let success = 0;
        let errors = 0;

        for (const countryCode of countries) {
            try {
                const countryClubs = clubsByCountry[countryCode];
                const countryStickers = stickersByCountry[countryCode] || [];
                await generateCountryPage(countryCode, countryClubs, stickerCountsByClub, countryStickers, allClubsMap);
                success++;
                console.log(`  ✓ ${getCountryName(countryCode)} (${countryClubs.length} clubs, ${countryStickers.length} stickers)`);
            } catch (error) {
                console.error(`  ✗ Error for ${countryCode}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n✅ Done!');
        console.log(`   Generated: ${success} country pages`);
        if (errors > 0) {
            console.log(`   Errors: ${errors}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
