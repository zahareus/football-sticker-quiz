#!/usr/bin/env node

/**
 * Generate static HTML pages for stickers, clubs, and countries
 * This script fetches data from Supabase and generates SEO-optimized static pages
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

// Get script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Check for test mode (only generate first 10 stickers)
const isTestMode = process.argv.includes('--test');
const LIMIT = isTestMode ? 10 : null;

console.log(`🚀 Starting static page generation${isTestMode ? ' (TEST MODE - first 10 stickers only)' : ''}...\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Country code mapping (simplified version)
const COUNTRY_NAMES = {
    'UKR': 'Ukraine', 'USA': 'United States', 'GBR': 'United Kingdom',
    'DEU': 'Germany', 'FRA': 'France', 'ESP': 'Spain', 'ITA': 'Italy',
    'BRA': 'Brazil', 'ARG': 'Argentina', 'NLD': 'Netherlands', 'PRT': 'Portugal',
    'POL': 'Poland', 'TUR': 'Turkey', 'BEL': 'Belgium', 'CHE': 'Switzerland',
    'AUT': 'Austria', 'CZE': 'Czech Republic', 'SWE': 'Sweden', 'NOR': 'Norway',
    'DNK': 'Denmark', 'GRC': 'Greece', 'ROU': 'Romania', 'HRV': 'Croatia',
    'SRB': 'Serbia', 'SVK': 'Slovakia', 'HUN': 'Hungary', 'BGR': 'Bulgaria'
};

/**
 * Get country name from code
 */
function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

/**
 * Load HTML template
 */
function loadTemplate(templateName) {
    const templatePath = join(PROJECT_ROOT, 'templates', templateName);
    if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    return readFileSync(templatePath, 'utf-8');
}

/**
 * Replace placeholders in template
 */
function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        result = result.replaceAll(placeholder, value || '');
    }
    return result;
}

/**
 * Generate breadcrumbs HTML
 */
function generateBreadcrumbs(links) {
    return links.map(link =>
        `<a href="${link.url}">${link.text}</a>`
    ).join(' → ');
}

/**
 * Generate sticker info HTML
 */
function generateStickerInfo(sticker, club) {
    let html = '<div class="sticker-info-section">';

    if (sticker.date_found) {
        const date = new Date(sticker.date_found);
        html += `<p class="sticker-info-item">📅 Found: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
    }

    if (sticker.latitude && sticker.longitude) {
        html += `<p class="sticker-info-item">📍 Location: ${sticker.latitude.toFixed(4)}, ${sticker.longitude.toFixed(4)}</p>`;
    }

    if (club.city) {
        html += `<p class="sticker-info-item">🌍 City: ${club.city}</p>`;
    }

    if (club.country) {
        const countryName = getCountryName(club.country);
        html += `<p class="sticker-info-item">🏴 Country: ${countryName}</p>`;
    }

    html += '</div>';
    return html;
}

/**
 * Generate navigation buttons HTML
 */
function generateNavigationButtons(currentId, prevId, nextId) {
    let html = '<div class="sticker-navigation">';

    if (prevId) {
        html += `<a href="/stickers/${prevId}.html" class="btn btn-nav sticker-nav-btn">← #${prevId}</a>`;
    }

    html += `<span class="sticker-id-display">#${currentId}</span>`;

    if (nextId) {
        html += `<a href="/stickers/${nextId}.html" class="btn btn-nav sticker-nav-btn">#${nextId} →</a>`;
    }

    html += '</div>';
    return html;
}

/**
 * Generate map section HTML if coordinates exist
 */
function generateMapSection(sticker, clubName) {
    if (!sticker.latitude || !sticker.longitude) {
        return '';
    }

    return `
        <div class="sticker-map-section">
            <h3 class="sticker-map-heading">Location</h3>
            <div class="sticker-map-info">
                <p>📍 This sticker was found at coordinates: ${sticker.latitude.toFixed(4)}, ${sticker.longitude.toFixed(4)}</p>
                <p><a href="/map.html" class="btn btn-nav">View on Full Map</a></p>
            </div>
        </div>
    `;
}

/**
 * Generate a single sticker page
 */
async function generateStickerPage(sticker, club, prevStickerId, nextStickerId) {
    const template = loadTemplate('sticker-page.html');

    const countryName = getCountryName(club.country);
    const pageTitle = `Sticker #${sticker.id} - ${club.name} - ${countryName} - StickerHunt`;
    const metaDescription = `Football sticker #${sticker.id} from ${club.name}, ${countryName}. View this sticker in our collection.`;
    const canonicalUrl = `${BASE_URL}/stickers/${sticker.id}.html`;

    // Build keywords from club media field
    let keywords = `football stickers, ${club.name}, ${countryName}, panini, sticker collection`;
    if (club.media) {
        const cleanMedia = club.media.replace(/[#\uD800-\uDFFF]/g, '').trim();
        if (cleanMedia) {
            keywords += ', ' + cleanMedia;
        }
    }

    // Generate breadcrumbs
    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${club.country.toLowerCase()}.html` },
        { text: club.name, url: `/clubs/${club.id}.html` },
        { text: `Sticker #${sticker.id}`, url: `/stickers/${sticker.id}.html` }
    ]);

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: sticker.image_url,
        STICKER_NAME: `${club.name} Sticker #${sticker.id}`,
        IMAGE_URL: sticker.image_url,
        THUMBNAIL_URL: sticker.image_url,
        IMAGE_ALT: `Football sticker #${sticker.id} from ${club.name}`,
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: `Sticker #${sticker.id}`,
        CLUB_NAME: club.name,
        STICKER_INFO: generateStickerInfo(sticker, club),
        NAVIGATION_BUTTONS: generateNavigationButtons(sticker.id, prevStickerId, nextStickerId),
        MAP_SECTION: generateMapSection(sticker, club.name)
    };

    const html = replacePlaceholders(template, data);

    // Save to file
    const outputDir = join(PROJECT_ROOT, 'stickers');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `${sticker.id}.html`);
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

/**
 * Main generation function
 */
async function generateAllPages() {
    try {
        console.log('📦 Fetching stickers from Supabase...');

        // Build query
        let query = supabase
            .from('stickers')
            .select('*, clubs(*)')
            .order('id', { ascending: true });

        if (LIMIT) {
            query = query.limit(LIMIT);
        }

        const { data: stickers, error } = await query;

        if (error) {
            throw new Error(`Supabase error: ${error.message}`);
        }

        if (!stickers || stickers.length === 0) {
            console.log('⚠️  No stickers found in database.');
            return;
        }

        console.log(`✓ Fetched ${stickers.length} stickers\n`);
        console.log('🔨 Generating sticker pages...');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < stickers.length; i++) {
            const sticker = stickers[i];
            const prevStickerId = i > 0 ? stickers[i - 1].id : null;
            const nextStickerId = i < stickers.length - 1 ? stickers[i + 1].id : null;

            try {
                await generateStickerPage(sticker, sticker.clubs, prevStickerId, nextStickerId);
                successCount++;

                if (successCount % 10 === 0 || successCount === stickers.length) {
                    console.log(`  ✓ Generated ${successCount}/${stickers.length} pages...`);
                }
            } catch (error) {
                console.error(`  ✗ Error generating page for sticker #${sticker.id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n✅ Generation complete!`);
        console.log(`   Success: ${successCount} pages`);
        if (errorCount > 0) {
            console.log(`   Errors: ${errorCount} pages`);
        }
        console.log(`\n📁 Output directory: ${join(PROJECT_ROOT, 'stickers')}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the generator
generateAllPages();
