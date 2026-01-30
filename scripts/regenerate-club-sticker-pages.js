#!/usr/bin/env node

/**
 * Regenerate sticker pages for a club
 * Used when club name changes and all sticker pages need to be updated
 * with the new club name in breadcrumbs, titles, etc.
 *
 * Usage: node regenerate-club-sticker-pages.js <club_id>
 * Example: node regenerate-club-sticker-pages.js 123
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const PROJECT_ROOT_FOR_ENV = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(PROJECT_ROOT_FOR_ENV, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const clubId = parseInt(process.argv[2] || process.env.CLUB_ID);

if (!clubId || isNaN(clubId)) {
    console.log('No club ID provided');
    process.exit(0);
}

console.log(`🔄 Regenerating sticker pages for club ID: ${clubId}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Import functions from generate-single-sticker.js would be cleaner,
// but for simplicity we'll duplicate the necessary functions here

const COUNTRY_NAMES = {
    'AFG': 'Afghanistan', 'ALB': 'Albania', 'DZA': 'Algeria', 'AND': 'Andorra',
    'AGO': 'Angola', 'ARG': 'Argentina', 'ARM': 'Armenia', 'AUS': 'Australia',
    'AUT': 'Austria', 'AZE': 'Azerbaijan', 'BHS': 'Bahamas', 'BHR': 'Bahrain',
    'BGD': 'Bangladesh', 'BLR': 'Belarus', 'BEL': 'Belgium', 'BLZ': 'Belize',
    'BEN': 'Benin', 'BOL': 'Bolivia', 'BIH': 'Bosnia and Herzegovina',
    'BWA': 'Botswana', 'BRA': 'Brazil', 'BGR': 'Bulgaria', 'BFA': 'Burkina Faso',
    'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada', 'CPV': 'Cape Verde',
    'CAF': 'Central African Republic', 'TCD': 'Chad', 'CHL': 'Chile', 'CHN': 'China',
    'COL': 'Colombia', 'COG': 'Congo', 'CRI': 'Costa Rica', 'HRV': 'Croatia',
    'CUB': 'Cuba', 'CYP': 'Cyprus', 'CZE': 'Czech Republic', 'DNK': 'Denmark',
    'DJI': 'Djibouti', 'DOM': 'Dominican Republic', 'ECU': 'Ecuador', 'EGY': 'Egypt',
    'SLV': 'El Salvador', 'GNQ': 'Equatorial Guinea', 'EST': 'Estonia', 'ETH': 'Ethiopia',
    'FJI': 'Fiji', 'FIN': 'Finland', 'FRA': 'France', 'GAB': 'Gabon', 'GMB': 'Gambia',
    'GEO': 'Georgia', 'DEU': 'Germany', 'GHA': 'Ghana', 'GRC': 'Greece',
    'GTM': 'Guatemala', 'GIN': 'Guinea', 'HTI': 'Haiti', 'HND': 'Honduras',
    'HUN': 'Hungary', 'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia',
    'IRN': 'Iran', 'IRQ': 'Iraq', 'IRL': 'Ireland', 'ISR': 'Israel', 'ITA': 'Italy',
    'CIV': 'Ivory Coast', 'JAM': 'Jamaica', 'JPN': 'Japan', 'JOR': 'Jordan',
    'KAZ': 'Kazakhstan', 'KEN': 'Kenya', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan',
    'LVA': 'Latvia', 'LBN': 'Lebanon', 'LBR': 'Liberia', 'LBY': 'Libya',
    'LIE': 'Liechtenstein', 'LTU': 'Lithuania', 'LUX': 'Luxembourg',
    'MKD': 'North Macedonia', 'MDG': 'Madagascar', 'MWI': 'Malawi', 'MYS': 'Malaysia',
    'MLI': 'Mali', 'MLT': 'Malta', 'MRT': 'Mauritania', 'MEX': 'Mexico',
    'MDA': 'Moldova', 'MCO': 'Monaco', 'MNG': 'Mongolia', 'MNE': 'Montenegro',
    'MAR': 'Morocco', 'MOZ': 'Mozambique', 'NPL': 'Nepal', 'NLD': 'Netherlands',
    'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NER': 'Niger', 'NGA': 'Nigeria',
    'PRK': 'North Korea', 'NOR': 'Norway', 'OMN': 'Oman', 'PAK': 'Pakistan',
    'PAN': 'Panama', 'PNG': 'Papua New Guinea', 'PRY': 'Paraguay', 'PER': 'Peru',
    'PHL': 'Philippines', 'POL': 'Poland', 'PRT': 'Portugal', 'QAT': 'Qatar',
    'ROU': 'Romania', 'RUS': 'Russia', 'RWA': 'Rwanda', 'SAU': 'Saudi Arabia',
    'SEN': 'Senegal', 'SRB': 'Serbia', 'SLE': 'Sierra Leone', 'SGP': 'Singapore',
    'SVK': 'Slovakia', 'SVN': 'Slovenia', 'SOM': 'Somalia', 'ZAF': 'South Africa',
    'KOR': 'South Korea', 'ESP': 'Spain', 'LKA': 'Sri Lanka', 'SDN': 'Sudan',
    'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria', 'TWN': 'Taiwan',
    'TZA': 'Tanzania', 'THA': 'Thailand', 'TGO': 'Togo', 'TUN': 'Tunisia',
    'TUR': 'Turkey', 'UGA': 'Uganda', 'UKR': 'Ukraine', 'ARE': 'United Arab Emirates',
    'GBR': 'United Kingdom', 'USA': 'United States', 'URY': 'Uruguay',
    'UZB': 'Uzbekistan', 'VEN': 'Venezuela', 'VNM': 'Vietnam', 'YEM': 'Yemen',
    'ZMB': 'Zambia', 'ZWE': 'Zimbabwe',
    'ENG': 'England', 'SCO': 'Scotland', 'WLS': 'Wales', 'NIR': 'Northern Ireland'
};

function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

function getOptimizedImageUrl(imageUrl, suffix = '_web') {
    if (!imageUrl || !imageUrl.includes('/storage/v1/object/')) return imageUrl;
    try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        const lastDotIndex = pathname.lastIndexOf('.');
        url.pathname = lastDotIndex === -1
            ? pathname + suffix + '.webp'
            : pathname.substring(0, lastDotIndex) + suffix + '.webp';
        return url.toString();
    } catch (e) {
        return imageUrl;
    }
}

function getDetailImageUrl(imageUrl) { return getOptimizedImageUrl(imageUrl, '_web'); }
function getThumbnailUrl(imageUrl) { return getOptimizedImageUrl(imageUrl, '_thumb'); }

function loadTemplate(templateName) {
    const templatePath = join(PROJECT_ROOT, 'templates', templateName);
    if (!existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);
    return readFileSync(templatePath, 'utf-8');
}

function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        result = result.replaceAll(`{{${key}}}`, value || '');
    }
    return result;
}

function generateBreadcrumbs(links) {
    return links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' → ');
}

function generateStickerDate(sticker) {
    if (!sticker.found) return '';
    const dateObj = new Date(sticker.found);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return `<p class="sticker-detail-date">Hunted on ${formattedDate}</p>`;
}

function generateStickerLocation(sticker) {
    if (!sticker.location || sticker.location.trim() === '') return '';
    return `<p class="sticker-detail-location">${sticker.location}</p>`;
}

function generateDifficulty(sticker) {
    const difficulty = sticker.difficulty || 1;
    const circles = difficulty === 1 ? '🟢' : difficulty === 2 ? '🟡🟡' : '🔴🔴🔴';
    return `<p class="sticker-detail-difficulty">Difficulty: ${circles}</p>`;
}

function generateAddedDate(sticker) {
    if (!sticker.created_at) return '';
    const dateObj = new Date(sticker.created_at);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return `<p class="sticker-detail-added">Added on ${formattedDate}</p>`;
}

function generateNavigationButtons(prevId, nextId) {
    if (!prevId && !nextId) return '';
    let html = '<div class="sticker-nav-buttons">';
    html += prevId ? `<a href="/stickers/${prevId}.html" class="btn btn-nav sticker-nav-btn">← #${prevId}</a>` : '<span class="sticker-nav-placeholder"></span>';
    html += nextId ? `<a href="/stickers/${nextId}.html" class="btn btn-nav sticker-nav-btn">#${nextId} →</a>` : '<span class="sticker-nav-placeholder"></span>';
    html += '</div>';
    return html;
}

function generateMapSection(sticker) {
    const hasCoordinates = sticker.latitude != null && sticker.longitude != null;
    const siteNav = `
            <nav class="site-nav">
                <a href="/catalogue.html" class="btn btn-nav">Catalogue</a>
                <a href="/map.html" class="btn btn-nav">Map</a>
                <a href="/rating.html" class="btn btn-nav">Rating</a>
                <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
            </nav>`;

    return hasCoordinates
        ? `<div class="sticker-map-section sticker-map-full-width"><div id="sticker-map" class="sticker-map-container"></div></div>${siteNav}`
        : siteNav;
}

function generateMapInitScript(sticker, clubName) {
    if (!sticker.latitude || !sticker.longitude) return '';
    const escapedClubName = (clubName || 'Sticker location').replace(/'/g, "\\'");
    return `
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof L !== 'undefined' && document.getElementById('sticker-map')) {
                const map = L.map('sticker-map').setView([${sticker.latitude}, ${sticker.longitude}], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                L.marker([${sticker.latitude}, ${sticker.longitude}]).addTo(map)
                    .bindPopup('<strong>${escapedClubName}</strong>').openPopup();
            }
        });
    `;
}

async function generateStickerPage(sticker, club, prevStickerId, nextStickerId) {
    const template = loadTemplate('sticker-page.html');
    const countryName = getCountryName(club.country);
    const pageTitle = `Sticker #${sticker.id} - ${club.name} - ${countryName} - StickerHunt`;
    const metaDescription = `Football sticker #${sticker.id} from ${club.name}, ${countryName}. View this sticker in our collection.`;
    const canonicalUrl = `${BASE_URL}/stickers/${sticker.id}.html`;

    let keywords = `football stickers, ${club.name}, ${countryName}, panini, sticker collection`;
    if (club.media) {
        const cleanMedia = club.media.replace(/[#\uD800-\uDFFF]/g, '').trim();
        if (cleanMedia) keywords += ', ' + cleanMedia;
    }

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
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
        IMAGE_URL: getDetailImageUrl(sticker.image_url),
        THUMBNAIL_URL: getThumbnailUrl(sticker.image_url),
        IMAGE_FULL_URL: sticker.image_url,
        IMAGE_ALT: `Sticker ${sticker.id} - ${club.name}`,
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: `Sticker #${sticker.id}`,
        STICKER_ID: sticker.id,
        CLUB_ID: club.id,
        CLUB_NAME: club.name,
        DIFFICULTY_VALUE: sticker.difficulty || 1,
        DIFFICULTY: generateDifficulty(sticker),
        ADDED_DATE: generateAddedDate(sticker),
        STICKER_DATE: generateStickerDate(sticker),
        STICKER_LOCATION: generateStickerLocation(sticker),
        NAVIGATION_BUTTONS: generateNavigationButtons(prevStickerId, nextStickerId),
        MAP_SECTION: generateMapSection(sticker),
        MAP_INIT_SCRIPT: generateMapInitScript(sticker, club.name)
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'stickers');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${sticker.id}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

async function main() {
    try {
        // Fetch club
        const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', clubId)
            .single();

        if (clubError || !club) {
            console.log('Club not found');
            process.exit(1);
        }

        console.log(`📦 Club: ${club.name} (ID: ${club.id})`);

        // Fetch stickers for this club
        const { data: stickers, error: stickersError } = await supabase
            .from('stickers')
            .select('*')
            .eq('club_id', clubId)
            .order('id', { ascending: true });

        if (stickersError) throw stickersError;

        if (!stickers || stickers.length === 0) {
            console.log('No stickers found for this club');
            process.exit(0);
        }

        console.log(`Found ${stickers.length} stickers\n`);

        // Get all sticker IDs for navigation
        const { data: allStickerIds } = await supabase
            .from('stickers')
            .select('id')
            .order('id', { ascending: true });

        const stickerIdList = allStickerIds ? allStickerIds.map(s => s.id) : [];

        // Regenerate each sticker page
        let count = 0;
        for (const sticker of stickers) {
            const currentIndex = stickerIdList.indexOf(sticker.id);
            const prevStickerId = currentIndex > 0 ? stickerIdList[currentIndex - 1] : null;
            const nextStickerId = currentIndex < stickerIdList.length - 1 ? stickerIdList[currentIndex + 1] : null;

            await generateStickerPage(sticker, club, prevStickerId, nextStickerId);
            count++;

            if (count % 50 === 0) {
                console.log(`  Progress: ${count}/${stickers.length}`);
            }
        }

        console.log(`\n✅ Regenerated ${count} sticker pages for ${club.name}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
