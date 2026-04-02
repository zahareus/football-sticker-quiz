#!/usr/bin/env node

/**
 * Regenerate all country pages with correct sticker counts
 * Now includes: featured stickers gallery, top-rated OG image, multilingual meta, descriptive alt text
 * Usage: node regenerate-country-pages.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import {
    COUNTRY_NAMES, getCountryName, getOptimizedImageUrl, getThumbnailUrl,
    cleanTrailingQuery, stripEmoji, loadTemplate, replacePlaceholders,
    generateBreadcrumbs, generateBreadcrumbSchema,
    selectTopRatedStickers, generateFeaturedGallery, generateMultilingualMeta,
    fetchAllPaginated
} from './seo-helpers.js';

// Load environment variables (scripts/.env)
const __scriptsDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__scriptsDir, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = "https://stickerhunt.club";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function generateCountryPage(countryCode, clubs, stickerCountsByClub, countryStickers, allClubsMap) {
    const template = loadTemplate('country-page.html', PROJECT_ROOT);

    const countryName = getCountryName(countryCode);
    const totalStickers = clubs.reduce((sum, club) => sum + (stickerCountsByClub[club.id] || 0), 0);
    const pageTitle = `${countryName} Football Stickers — ${clubs.length} Clubs | StickerHunt`;
    const metaDescription = `Browse football stickers from ${clubs.length} clubs in ${countryName}. Identify stickers from ${countryName} clubs in our database of ${totalStickers}+ stickers.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `${countryName} football stickers, ${countryName} clubs stickers, identify ${countryName} sticker, football sticker database`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

    // Top-rated stickers for OG image and featured gallery
    const topStickers = selectTopRatedStickers(countryStickers, 6);
    const ogImage = topStickers.length > 0
        ? cleanTrailingQuery(getOptimizedImageUrl(topStickers[0].image_url))
        : 'https://stickerhunt.club/metash.png';

    // Featured stickers gallery HTML
    const featuredHtml = generateFeaturedGallery(topStickers, allClubsMap, `Top Rated Stickers from ${countryName}`);

    // Multilingual meta
    const multilingualMeta = generateMultilingualMeta({
        type: 'country',
        countryCode: countryCode,
        vars: { country: countryName, clubCount: clubs.length, total: totalStickers }
    });

    // Club list
    const clubsWithStickerCounts = clubs.map(club => ({
        ...club,
        stickerCount: stickerCountsByClub[club.id] || 0
    }));
    clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));

    let clubListHtml = '';
    clubsWithStickerCounts.forEach(club => {
        const countText = `(${club.stickerCount} sticker${club.stickerCount !== 1 ? 's' : ''})`;
        clubListHtml += `<li><a href="/clubs/${club.id}.html">${club.name} ${countText}</a></li>`;
    });

    // Schema with ImageGallery
    const schemaItems = clubs.map((club, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": stripEmoji(club.name),
        "url": `${BASE_URL}/clubs/${club.id}.html`
    }));
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Football clubs from ${countryName}`,
        "description": metaDescription,
        "url": canonicalUrl,
        "numberOfItems": clubs.length,
        "itemListElement": schemaItems
    };
    if (topStickers.length > 0) {
        schema.image = topStickers.slice(0, 3).map(s => ({
            "@type": "ImageObject",
            "contentUrl": cleanTrailingQuery(getOptimizedImageUrl(s.image_url)),
            "thumbnailUrl": cleanTrailingQuery(getThumbnailUrl(s.image_url))
        }));
    }
    const schemaJsonLd = `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2).split('\n').join('\n    ')}\n    </script>`;

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: ogImage,
        COUNTRY_NAME: countryName,
        CLUB_COUNT: clubs.length,
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
        ]),
        MAIN_HEADING: `${countryName} Football Stickers`,
        FEATURED_STICKERS: featuredHtml,
        MULTILINGUAL_META: multilingualMeta,
        SCHEMA_JSON_LD: schemaJsonLd,
        CLUB_LIST: clubListHtml
    };

    const html = replacePlaceholders(template, data);

    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

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
