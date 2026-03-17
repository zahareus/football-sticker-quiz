#!/usr/bin/env node

/**
 * Regenerate club and country pages by club IDs
 * This script is used when stickers are moved between clubs
 * to update the sticker counts on affected club and country pages
 *
 * Usage: node regenerate-club-pages.js <club_ids>
 * Example: node regenerate-club-pages.js 123,456
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const PROJECT_ROOT_FOR_ENV = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(PROJECT_ROOT_FOR_ENV, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Get club IDs from command line
const clubIdsArg = process.argv[2] || process.env.CLUB_IDS;

if (!clubIdsArg) {
    console.log('No club IDs provided, skipping club page regeneration');
    process.exit(0);
}

const clubIds = clubIdsArg.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

if (clubIds.length === 0) {
    console.log('No valid club IDs provided');
    process.exit(0);
}

console.log(`🔄 Regenerating pages for clubs: ${clubIds.join(', ')}\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load wiki cache
let wikiCache = {};
try {
    wikiCache = JSON.parse(readFileSync(join(PROJECT_ROOT, 'scripts/wiki-cache.json'), 'utf-8'));
} catch {
    // No cache available
}

// Country code mapping
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

function cleanTrailingQuery(url) {
    return url ? url.replace(/\?$/, '') : url;
}

function loadTemplate(templateName) {
    const templatePath = join(PROJECT_ROOT, 'templates', templateName);
    if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    return readFileSync(templatePath, 'utf-8');
}

function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        result = result.replaceAll(placeholder, value || '');
    }
    return result;
}

function generateBreadcrumbs(links) {
    return links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' → ');
}

function generateBreadcrumbSchema(links) {
    const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://stickerhunt.club" }
    ];
    links.forEach((link, i) => {
        items.push({
            "@type": "ListItem",
            "position": i + 2,
            "name": link.text,
            "item": `https://stickerhunt.club${link.url}`
        });
    });
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items
    };
    return `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2)}\n    </script>`;
}

function getOptimizedImageUrl(imageUrl, suffix = '_web') {
    if (!imageUrl) return imageUrl;
    if (!imageUrl.includes('/storage/v1/object/')) return imageUrl;
    try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        const lastDotIndex = pathname.lastIndexOf('.');
        if (lastDotIndex === -1) {
            url.pathname = pathname + suffix + '.webp';
        } else {
            url.pathname = pathname.substring(0, lastDotIndex) + suffix + '.webp';
        }
        return url.toString();
    } catch (e) {
        return imageUrl;
    }
}

function getThumbnailUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_thumb');
}

function stripEmoji(str) {
    return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
}

/**
 * Generate wiki section HTML from wiki cache data
 */
function generateWikiSection(clubId) {
    const wiki = wikiCache[clubId];
    if (!wiki) return '';

    const facts = [];
    if (wiki.founded) {
        facts.push(`<div class="wiki-fact"><span class="wiki-fact-label">Founded</span><span class="wiki-fact-value">${wiki.founded}</span></div>`);
    }
    if (wiki.stadium) {
        const capacityStr = wiki.capacity ? ` (${wiki.capacity.toLocaleString()})` : '';
        facts.push(`<div class="wiki-fact"><span class="wiki-fact-label">Stadium</span><span class="wiki-fact-value">${wiki.stadium}${capacityStr}</span></div>`);
    }
    if (wiki.league) {
        facts.push(`<div class="wiki-fact"><span class="wiki-fact-label">League</span><span class="wiki-fact-value">${wiki.league}</span></div>`);
    }
    if (wiki.website) {
        try {
            const domain = new URL(wiki.website).hostname.replace('www.', '');
            facts.push(`<div class="wiki-fact"><span class="wiki-fact-label">Website</span><span class="wiki-fact-value"><a href="${wiki.website}" target="_blank" rel="noopener noreferrer">${domain}</a></span></div>`);
        } catch {}
    }

    const hasIntro = wiki.intro && wiki.intro.trim().length > 0;
    if (facts.length === 0 && !hasIntro) return '';

    let html = '<div class="wiki-section">';
    if (facts.length > 0) {
        html += `\n    <div class="wiki-facts">\n        ${facts.join('\n        ')}\n    </div>`;
    }
    if (hasIntro) {
        html += `\n    <div class="wiki-intro">\n        <p>${wiki.intro}</p>`;
        if (wiki.wikiUrl) {
            html += `\n        <p class="wiki-source">Source: <a href="${wiki.wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>`;
        }
        html += `\n    </div>`;
    }
    html += '\n</div>';
    return html;
}

function generateStickerStats(stickers) {
    if (!stickers || stickers.length === 0) return '';

    const items = [];

    // First and latest found
    const withDates = stickers.filter(s => s.found).sort((a, b) => new Date(a.found) - new Date(b.found));
    if (withDates.length > 0) {
        const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const first = withDates[0];
        const latest = withDates[withDates.length - 1];
        const firstLoc = first.location ? ` in ${first.location.split(',')[0]}` : '';
        const latestLoc = latest.location ? ` in ${latest.location.split(',')[0]}` : '';
        items.push(`<p class="club-info-item">📅 First found: ${fmt(first.found)}${firstLoc}</p>`);
        if (withDates.length > 1) {
            items.push(`<p class="club-info-item">📅 Latest find: ${fmt(latest.found)}${latestLoc}</p>`);
        }
    }

    // Cities where found
    const cities = [...new Set(stickers.filter(s => s.location).map(s => s.location.split(',')[0].trim()))];
    if (cities.length > 0) {
        const cityLinks = cities.map(city => {
            const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            return `<a href="/cities/${slug}.html">${city}</a>`;
        });
        items.push(`<p class="club-info-item">📍 Found in: ${cityLinks.join(', ')}</p>`);
    }

    // Average difficulty
    const withDiff = stickers.filter(s => s.difficulty);
    if (withDiff.length > 0) {
        const avg = withDiff.reduce((sum, s) => sum + s.difficulty, 0) / withDiff.length;
        const label = avg <= 1.3 ? 'Easy' : avg <= 2.3 ? 'Medium' : 'Hard';
        const dots = avg <= 1.3 ? '🟢' : avg <= 2.3 ? '🟡🟡' : '🔴🔴🔴';
        items.push(`<p class="club-info-item">🎯 Difficulty: ${dots} ${label}</p>`);
    }

    if (items.length === 0) return '';
    return `<div class="sticker-stats-section">\n${items.join('\n')}\n</div>`;
}

function generateClubDescription(club, stickerCount, countryName) {
    const clubNameClean = stripEmoji(club.name);
    const stickerWord = stickerCount !== 1 ? 'stickers' : 'sticker';
    let desc = `<div class="club-description-text"><p>${clubNameClean} is a football club from ${countryName}`;
    if (club.city) desc += `, based in ${club.city}`;
    desc += `. Our database contains <strong>${stickerCount} ${stickerWord}</strong> from ${clubNameClean}`;
    if (stickerCount > 0) {
        desc += `. Browse the full collection below or <a href="/quiz.html">play the quiz</a> to identify a specific sticker`;
    }
    desc += `.</p></div>`;
    return desc;
}

function generateClubInfo(club) {
    let html = '';
    if (club.city) {
        html += `<p class="club-info-item">🌍 ${club.city}</p>`;
    }
    if (club.web) {
        // Decode first (in case URL is already encoded), then encode properly
        let safeUrl;
        try {
            safeUrl = encodeURI(decodeURI(club.web));
        } catch (e) {
            safeUrl = club.web;
        }
        const sanitizedUrl = safeUrl;
        html += `<p class="club-info-item">🌐 <a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${club.web}</a></p>`;
    }
    if (club.media) {
        html += `<p class="club-info-item">#️⃣ ${club.media}</p>`;
    }
    return html;
}

function generateStickerGallery(stickers, clubName) {
    if (!stickers || stickers.length === 0) {
        return '<p>No stickers found for this club.</p>';
    }
    let html = '';
    stickers.forEach(sticker => {
        const thumbnailUrl = getThumbnailUrl(sticker.image_url);
        html += `
                <a href="/stickers/${sticker.id}.html" class="sticker-preview-link">
                    <img src="${thumbnailUrl}"
                         alt="${stripEmoji(clubName)} football sticker #${sticker.id} — identify this sticker"
                         class="sticker-preview-image"
                         loading="lazy"
                         decoding="async">
                </a>`;
    });
    return html;
}

function generateClubMapSection(stickersWithCoordinates) {
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) {
        return '';
    }
    return `
            <div class="club-map-section">
                <h3 class="club-map-heading">Sticker Locations</h3>
                <div id="club-map" class="club-map-container"></div>
                <div class="view-map-btn-container">
                    <a href="/map.html" class="btn btn-nav">View Full Map</a>
                </div>
            </div>
        `;
}

function generateClubMapInitScript(stickersWithCoordinates, clubName) {
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) {
        return '';
    }
    const avgLat = stickersWithCoordinates.reduce((sum, s) => sum + s.latitude, 0) / stickersWithCoordinates.length;
    const avgLng = stickersWithCoordinates.reduce((sum, s) => sum + s.longitude, 0) / stickersWithCoordinates.length;
    const escapedClubName = clubName.replace(/'/g, "\\'");
    const markers = stickersWithCoordinates.map(sticker => {
        return `
                (function() {
                    const marker = L.marker([${sticker.latitude}, ${sticker.longitude}]).addTo(clubMap);
                    marker.bindPopup('<div class="nearby-sticker-popup"><strong>${escapedClubName}</strong><a href="/stickers/${sticker.id}.html" class="map-popup-link">View</a></div>');
                    marker.on('mouseover', function() { this.openPopup(); });
                    marker.on('click', function() { this.openPopup(); });
                })();`;
    }).join('\n');
    return `
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof L !== 'undefined' && document.getElementById('club-map')) {
                const clubMap = L.map('club-map').setView([${avgLat}, ${avgLng}], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(clubMap);
                ${markers}
                ${stickersWithCoordinates.length > 1 ? `
                const bounds = L.latLngBounds([
                    ${stickersWithCoordinates.map(s => `[${s.latitude}, ${s.longitude}]`).join(',\n                    ')}
                ]);
                clubMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
                ` : ''}
            }
        });
    `;
}

async function generateClubPage(club, stickers) {
    const template = loadTemplate('club-page.html');
    const countryName = getCountryName(club.country);
    const clubNameClean = stripEmoji(club.name);
    const stickerCount = stickers ? stickers.length : 0;
    const stickerWord = stickerCount !== 1 ? 'stickers' : 'sticker';
    const pageTitle = `${clubNameClean} Stickers — ${stickerCount} ${stickerWord.charAt(0).toUpperCase() + stickerWord.slice(1)} | StickerHunt`;
    const cityPart = club.city ? ` from ${club.city},` : ' from';
    const metaDescription = `${clubNameClean} —${cityPart} ${countryName}. ${stickerCount} football ${stickerWord} found on streets. Can you identify them? Browse the collection at StickerHunt.`;
    const canonicalUrl = `${BASE_URL}/clubs/${club.id}.html`;

    let keywords = `${clubNameClean} stickers, ${clubNameClean} football stickers, identify ${clubNameClean} sticker, ${countryName} football stickers, panini sticker database`;
    if (club.media) {
        const hashtags = club.media.match(/#\w+/g) || [];
        const cleanHashtags = hashtags.map(h => h.replace('#', '')).join(', ');
        if (cleanHashtags) keywords += ', ' + cleanHashtags;
    }

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
        { text: club.name, url: `/clubs/${club.id}.html` }
    ]);

    const stickersWithCoordinates = stickers ? stickers.filter(
        s => s.latitude != null && s.longitude != null
    ) : [];

    const ogImage = stickers && stickers.length > 0
        ? stickers[0].image_url
        : 'https://stickerhunt.club/metash.png';

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: cleanTrailingQuery(ogImage),
        CLUB_ID: club.id,
        CLUB_NAME: club.name,
        CLUB_CITY: club.city || '',
        CLUB_WEB: club.web || '',
        CLUB_MEDIA: club.media || '',
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
            { text: club.name, url: `/clubs/${club.id}.html` }
        ]),
        MAIN_HEADING: `${club.name} — ${stickerCount} ${stickerWord.charAt(0).toUpperCase() + stickerWord.slice(1)}`,
        HEADING_SUFFIX: `${stickerCount} ${stickerWord.charAt(0).toUpperCase() + stickerWord.slice(1)}`,
        WIKI_SECTION: generateWikiSection(club.id),
        STICKER_STATS: generateStickerStats(stickers),
        CLUB_DESCRIPTION: generateClubDescription(club, stickerCount, countryName),
        CLUB_INFO: generateClubInfo(club),
        STICKER_GALLERY: generateStickerGallery(stickers, club.name),
        CLUB_MAP_SECTION: generateClubMapSection(stickersWithCoordinates),
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name)
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'clubs');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${club.id}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

async function generateCountryPage(countryCode, clubs, stickerCountsByClub) {
    const template = loadTemplate('country-page.html');
    const countryName = getCountryName(countryCode);
    const totalStickers = Object.values(stickerCountsByClub).reduce((sum, n) => sum + n, 0);
    const pageTitle = `${countryName} Football Stickers — ${clubs.length} Clubs | StickerHunt`;
    const metaDescription = `Browse football stickers from ${clubs.length} clubs in ${countryName}. Identify stickers from ${countryName} clubs in our database of ${totalStickers}+ stickers.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `${countryName} football stickers, ${countryName} clubs stickers, identify ${countryName} sticker, football sticker database`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

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

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: 'https://stickerhunt.club/metash.png',
        COUNTRY_NAME: countryName,
        CLUB_COUNT: clubs.length,
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
        ]),
        MAIN_HEADING: `${countryName} Football Stickers`,
        CLUB_LIST: clubListHtml
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

async function regenerateClubPages() {
    try {
        // Fetch clubs by IDs
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .in('id', clubIds);

        if (clubsError) throw clubsError;
        if (!clubs || clubs.length === 0) {
            console.log('No clubs found with provided IDs');
            return;
        }

        // Get all sticker counts (with pagination - Supabase limits to 1000)
        let allStickers = [];
        let stickerOffset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('stickers')
                .select('club_id')
                .range(stickerOffset, stickerOffset + PAGE_SIZE - 1);

            if (error) {
                console.error('Error fetching sticker counts:', error.message);
                break;
            }

            if (data && data.length > 0) {
                allStickers = allStickers.concat(data);
                stickerOffset += PAGE_SIZE;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        const stickerCountsByClub = {};
        allStickers.forEach(s => {
            stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
        });

        // Track which countries need regeneration
        const countriesToRegenerate = new Set();

        // Regenerate club pages
        for (const club of clubs) {
            console.log(`\n📦 Processing club: ${club.name} (ID: ${club.id})`);

            // Get stickers for this club
            const { data: clubStickers } = await supabase
                .from('stickers')
                .select('*')
                .eq('club_id', club.id)
                .order('id', { ascending: true });

            const clubPath = await generateClubPage(club, clubStickers || []);
            console.log(`  ✓ Generated: ${clubPath}`);

            countriesToRegenerate.add(club.country.toUpperCase());
        }

        // Regenerate country pages
        for (const countryCode of countriesToRegenerate) {
            console.log(`\n🌍 Regenerating country page: ${countryCode}`);

            const { data: countryClubs } = await supabase
                .from('clubs')
                .select('*')
                .ilike('country', countryCode)
                .order('name');

            if (countryClubs && countryClubs.length > 0) {
                const countryPath = await generateCountryPage(countryCode, countryClubs, stickerCountsByClub);
                console.log(`  ✓ Generated: ${countryPath}`);
            }
        }

        console.log('\n✅ Club page regeneration complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

regenerateClubPages();
