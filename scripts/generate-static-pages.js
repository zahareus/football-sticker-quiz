#!/usr/bin/env node

/**
 * Generate static HTML pages for stickers, clubs, and countries
 * This script fetches data from Supabase and generates SEO-optimized static pages
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { createSupabaseClient, COUNTRY_NAMES, COUNTRY_FLAGS, cityOnly, stickerNoindexTag, cityToSlug, generateMultilingualMeta, generateMultilingualAltText, generateStickerContextParagraph } from './seo-helpers.js';

// Configuration
const BASE_URL = "https://stickerhunt.club";

// Get script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Check for flags
const isTestMode = process.argv.includes('--test');
const isHomepageOnly = process.argv.includes('--homepage-only');
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : (isTestMode ? 10 : null);

// Load wiki cache
let wikiCache = {};
try {
    wikiCache = JSON.parse(readFileSync(join(PROJECT_ROOT, 'scripts/wiki-cache.json'), 'utf-8'));
} catch {
    // No cache available, wiki sections will be empty
}

console.log(`🚀 Starting static page generation${LIMIT ? ` (LIMIT: ${LIMIT} stickers)` : ''}...\n`);

// Initialize Supabase client
const supabase = createSupabaseClient();

/**
 * Strip emoji and flag characters from a string (for use in <title> tags)
 */
function stripEmoji(str) {
    return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
}

/**
 * Generate a descriptive text block for a club page
 */
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

    const cities = [...new Set(stickers.filter(s => s.location).map(s => s.location.split(',')[0].trim()))];
    if (cities.length > 0) {
        const cityLinks = cities.map(city => {
            const slug = cityToSlug(city);
            return `<a href="/cities/${slug}.html">${city}</a>`;
        });
        items.push(`<p class="club-info-item">📍 Found in: ${cityLinks.join(', ')}</p>`);
    }

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

function generateOtherClubs(currentClubId, allClubsInCountry, stickerCountsByClub, countryName) {
    const others = allClubsInCountry.filter(c => c.id !== currentClubId && (stickerCountsByClub[c.id] || 0) > 0);
    if (others.length === 0) return '';
    others.sort((a, b) => (stickerCountsByClub[b.id] || 0) - (stickerCountsByClub[a.id] || 0));
    const shown = others.slice(0, 10);
    let html = `<div class="other-clubs-section">\n<h3>Other clubs from ${countryName}</h3>\n<ul class="other-clubs-list">`;
    shown.forEach(c => {
        const count = stickerCountsByClub[c.id] || 0;
        html += `\n<li><a href="/clubs/${c.id}.html">${stripEmoji(c.name)}</a> (${count})</li>`;
    });
    if (others.length > 10) {
        const cc = allClubsInCountry[0]?.country?.toUpperCase();
        html += `\n<li><a href="/countries/${cc}.html">View all ${others.length + 1} clubs →</a></li>`;
    }
    html += '\n</ul>\n</div>';
    return html;
}

function generateSchemaJsonLd(club, stickerCount, canonicalUrl, metaDescription, pageTitle) {
    const clubNameClean = stripEmoji(club.name);
    const wiki = wikiCache[club.id];
    const schema = {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "name": pageTitle, "description": metaDescription, "url": canonicalUrl,
        "about": { "@type": "SportsTeam", "name": clubNameClean, "sport": "Association football" },
        "isPartOf": { "@type": "WebSite", "name": "StickerHunt", "url": "https://stickerhunt.club" }
    };
    if (wiki) {
        if (wiki.founded) schema.about.foundingDate = wiki.founded;
        if (wiki.website) schema.about.url = wiki.website;
        if (wiki.stadium) {
            schema.about.location = { "@type": "StadiumOrArena", "name": wiki.stadium };
            if (wiki.capacity) schema.about.location.maximumAttendeeCapacity = parseInt(String(wiki.capacity).replace(/[^0-9]/g, ''));
        }
        if (wiki.league) schema.about.memberOf = { "@type": "SportsOrganization", "name": wiki.league };
    }
    return '<script type="application/ld+json">\n    ' + JSON.stringify(schema, null, 2).split('\n').join('\n    ') + '\n    </script>';
}

function generateClubDescription(club, stickerCount, countryName) {
    const clubNameClean = stripEmoji(club.name);
    const stickerWord = stickerCount !== 1 ? 'stickers' : 'sticker';
    let desc = `<div class="club-description-text"><p>${clubNameClean} is a football club from ${countryName}`;
    if (club.city) desc += `, based in ${cityOnly(club.city)}`;
    desc += `. Our database contains <strong>${stickerCount} ${stickerWord}</strong> from ${clubNameClean}`;
    if (stickerCount > 0) {
        desc += `. Browse the full collection below or <a href="/quiz.html">play the quiz</a> to identify a specific sticker`;
    }
    desc += `.</p></div>`;
    return desc;
}

/**
 * Convert original image URL to optimized WebP version URL
 * Same logic as shared.js getOptimizedImageUrl()
 */
function getOptimizedImageUrl(imageUrl, suffix = '_web') {
    if (!imageUrl) return imageUrl;

    // Check if URL is from Supabase Storage
    if (!imageUrl.includes('/storage/v1/object/')) {
        return imageUrl;
    }

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

/**
 * Get detail image URL (600x600 WebP)
 */
function getDetailImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

/**
 * Get thumbnail URL via /img/* edge-proxy so <img> tags hit the cached
 * Edge Function. Use getOptimizedImageUrl directly for absolute URLs
 * (og:image, schema.org contentUrl).
 */
function getThumbnailUrl(imageUrl) {
    return toLocalImg(getOptimizedImageUrl(imageUrl, '_thumb'));
}

/**
 * Get country name from code
 */
function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

function cleanTrailingQuery(url) {
    return url ? url.replace(/\?+$/, '') : url;
}

const SUPABASE_STICKERS_PREFIX = 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/';

const IMG_VERSION = '2026-05-27';

function toLocalImg(url) {
    if (!url) return url;
    let cleaned = cleanTrailingQuery(url);
    if (cleaned.startsWith(SUPABASE_STICKERS_PREFIX)) {
        cleaned = '/img/' + cleaned.slice(SUPABASE_STICKERS_PREFIX.length);
    }
    if (!cleaned.startsWith('/img/')) return cleaned;
    cleaned = cleaned.replace(/%2F/gi, '/');
    cleaned = cleaned.replace(/^\/img\/stickers\/stickers\//, '/img/stickers/');
    if (!/[?&]v=/.test(cleaned)) {
        cleaned += (cleaned.includes('?') ? '&' : '?') + 'v=' + IMG_VERSION;
    }
    return cleaned;
}

function toLocalImgAbs(url) {
    const local = toLocalImg(url);
    if (!local) return local;
    if (local.startsWith('http')) return local;
    return 'https://stickerhunt.club' + local;
}

/**
 * Load HTML template
 */
let _criticalCssCache = null;
function loadCriticalCss() {
    if (_criticalCssCache !== null) return _criticalCssCache;
    const p = join(PROJECT_ROOT, 'templates', '_critical', 'critical.css');
    if (!existsSync(p)) {
        throw new Error(`critical.css not found. Run: node scripts/build-critical-css.js`);
    }
    _criticalCssCache = readFileSync(p, 'utf-8');
    return _criticalCssCache;
}

function loadTemplate(templateName) {
    const templatePath = join(PROJECT_ROOT, 'templates', templateName);
    if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    let html = readFileSync(templatePath, 'utf-8');
    if (html.includes('{{CRITICAL_CSS}}')) {
        html = html.replaceAll('{{CRITICAL_CSS}}', loadCriticalCss());
    }
    return html;
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
    // Fail-fast on unsubstituted placeholders (see seo-helpers.js for rationale).
    const residual = result.match(/\{\{[A-Z0-9_]+\}\}/g);
    if (residual) {
        const unique = [...new Set(residual)];
        throw new Error(`replacePlaceholders: unsubstituted placeholder(s) — missing data keys: ${unique.join(', ')}`);
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

/**
 * Generate sticker date HTML (formatted like current site)
 */
function generateStickerDate(sticker) {
    if (!sticker.found) return '';

    const dateObj = new Date(sticker.found);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return `<p class="sticker-detail-date">Hunted on ${formattedDate}</p>`;
}

/**
 * Generate "Added on" date HTML (date when sticker was added to catalogue)
 */
function generateAddedDate(sticker) {
    if (!sticker.created_at) return '';

    const dateObj = new Date(sticker.created_at);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return `<p class="sticker-detail-added">Added on ${formattedDate}</p>`;
}

/**
 * Generate Difficulty HTML with colored circles
 * Level 1 (Easy): 🟢 (1 green)
 * Level 2 (Medium): 🟡🟡 (2 yellow)
 * Level 3 (Hard): 🔴🔴🔴 (3 red)
 */
function generateDifficulty(sticker) {
    const difficulty = sticker.difficulty || 1;

    let circles = '';
    if (difficulty === 1) {
        circles = '🟢';
    } else if (difficulty === 2) {
        circles = '🟡🟡';
    } else if (difficulty === 3) {
        circles = '🔴🔴🔴';
    } else {
        circles = '🟢'; // default to easy
    }

    return `<p class="sticker-detail-difficulty">Difficulty: ${circles}</p>`;
}

/**
 * Generate sticker location HTML (formatted like current site)
 */
function generateStickerLocation(sticker) {
    if (!sticker.location || sticker.location.trim() === '') return '';
    return `<p class="sticker-detail-location">${sticker.location}</p>`;
}

/**
 * Generate navigation buttons HTML (formatted like current site)
 */
function generateNavigationButtons(prevId, nextId) {
    if (!prevId && !nextId) return '';

    let html = '<div class="sticker-nav-buttons">';

    if (prevId) {
        html += `<a href="/stickers/${prevId}.html" class="btn btn-nav sticker-nav-btn">← #${prevId}</a>`;
    } else {
        html += '<span class="sticker-nav-placeholder"></span>';
    }

    if (nextId) {
        html += `<a href="/stickers/${nextId}.html" class="btn btn-nav sticker-nav-btn">#${nextId} →</a>`;
    } else {
        html += '<span class="sticker-nav-placeholder"></span>';
    }

    html += '</div>';
    return html;
}

/**
 * Generate map section HTML (formatted like current site)
 */
function generateMapSection(sticker) {
    const hasCoordinates = sticker.latitude != null && sticker.longitude != null;

    // Site navigation - same on all pages
    const siteNav = `
            <nav class="site-nav">
                <a href="/catalogue.html" class="btn btn-nav">Catalogue</a>
                <a href="/map.html" class="btn btn-nav">Map</a>
                <a href="/rating.html" class="btn btn-nav">Rating</a>
                <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
            </nav>
        `;

    if (hasCoordinates) {
        return `
            <div class="sticker-map-section sticker-map-full-width">
                <div id="sticker-map" class="sticker-map-container"></div>
            </div>
        ${siteNav}`;
    } else {
        return siteNav;
    }
}

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find nearby stickers within a given radius
 */
function findNearbyStickers(currentSticker, allStickers, radiusKm = 50, maxCount = 10) {
    if (!currentSticker.latitude || !currentSticker.longitude) return [];

    const nearby = [];

    for (const sticker of allStickers) {
        if (sticker.id === currentSticker.id) continue;
        if (!sticker.latitude || !sticker.longitude) continue;

        const distance = getDistanceKm(
            currentSticker.latitude, currentSticker.longitude,
            sticker.latitude, sticker.longitude
        );

        if (distance <= radiusKm) {
            nearby.push({
                id: sticker.id,
                latitude: sticker.latitude,
                longitude: sticker.longitude,
                clubName: sticker.clubs?.name || 'Unknown Club',
                distance: distance
            });
        }
    }

    // Sort by distance and limit
    nearby.sort((a, b) => a.distance - b.distance);
    return nearby.slice(0, maxCount);
}

/**
 * Generate map initialization script with nearby stickers
 */
function generateMapInitScript(sticker, clubName, nearbyStickers = []) {
    if (!sticker.latitude || !sticker.longitude) return '';

    // Generate nearby stickers markers code
    let nearbyMarkersCode = '';
    if (nearbyStickers.length > 0) {
        nearbyMarkersCode = nearbyStickers.map(nearby => {
            const escapedClubName = nearby.clubName.replace(/'/g, "\\'");
            return `
                (function() {
                    const nearbyMarker = L.marker([${nearby.latitude}, ${nearby.longitude}], {
                        icon: L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                            iconSize: [20, 33],
                            iconAnchor: [10, 33],
                            popupAnchor: [1, -28],
                            className: 'nearby-marker'
                        }),
                        opacity: 0.7
                    }).addTo(map);
                    nearbyMarker.bindPopup('<div class="nearby-sticker-popup"><strong>${escapedClubName}</strong><a href="/stickers/${nearby.id}.html" class="map-popup-link">View</a></div>');
                    nearbyMarker.on('mouseover', function() { this.openPopup(); });
                    nearbyMarker.on('click', function() { this.openPopup(); });
                })();`;
        }).join('\n                ');
    }

    return `
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof L !== 'undefined' && document.getElementById('sticker-map')) {
                const map = L.map('sticker-map').setView([${sticker.latitude}, ${sticker.longitude}], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                // Nearby stickers (shown first, so main marker is on top)
                ${nearbyMarkersCode}

                // Main sticker marker (larger, on top)
                L.marker([${sticker.latitude}, ${sticker.longitude}], {
                    icon: L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    }),
                    zIndexOffset: 1000
                }).addTo(map)
                    .bindPopup('<strong>${clubName ? clubName.replace(/'/g, "\\'") : 'Sticker location'}</strong>').openPopup();

                // Fit bounds to show all markers if there are nearby stickers
                ${nearbyStickers.length > 0 ? `
                const bounds = L.latLngBounds([
                    [${sticker.latitude}, ${sticker.longitude}],
                    ${nearbyStickers.map(n => `[${n.latitude}, ${n.longitude}]`).join(',\n                    ')}
                ]);
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
                ` : ''}
            }
        });
    `;
}

/**
 * Generate club info HTML section (city, web, media)
 */
function generateClubInfo(club) {
    let html = '';
    if (club.city) {
        html += `<p class="club-info-item">🌍 ${club.city}</p>`;
    }
    if (club.web) {
        // Decode first (in case URL is already encoded), then encode properly
        // This prevents double-encoding of URLs like Wikipedia links
        let safeUrl;
        try {
            safeUrl = encodeURI(decodeURI(club.web));
        } catch (e) {
            // If decoding fails, URL might have invalid encoding - use as-is
            safeUrl = club.web;
        }
        html += `<p class="club-info-item">🌐 <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${club.web}</a></p>`;
    }
    if (club.media) {
        html += `<p class="club-info-item">#️⃣ ${club.media}</p>`;
    }
    return html;
}

/**
 * Generate sticker gallery HTML for club page
 */
function generateStickerGallery(stickers, clubName) {
    if (!stickers || stickers.length === 0) {
        return '<p>No stickers found for this club.</p>';
    }

    let html = '';
    stickers.forEach(sticker => {
        // Use thumbnail URL (same logic as SharedUtils.getThumbnailUrl)
        const thumbnailUrl = getThumbnailUrl(sticker.image_url);
        html += `
                <a href="/stickers/${sticker.id}.html" class="sticker-preview-link">
                    <img src="${thumbnailUrl}"
                         alt="${stripEmoji(clubName)} football sticker #${sticker.id} — identify this sticker"
                         data-sticker-id="${sticker.id}"
                         class="sticker-preview-image"
                         width="200" height="200"
                         loading="lazy"
                         decoding="async">
                </a>`;
    });
    return html;
}

/**
 * Generate club map section HTML
 */
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

/**
 * Generate club map initialization script
 */
function generateClubMapInitScript(stickersWithCoordinates, clubName) {
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) {
        return '';
    }

    // Calculate center point (average of all coordinates)
    const avgLat = stickersWithCoordinates.reduce((sum, s) => sum + s.latitude, 0) / stickersWithCoordinates.length;
    const avgLng = stickersWithCoordinates.reduce((sum, s) => sum + s.longitude, 0) / stickersWithCoordinates.length;

    const escapedClubName = clubName.replace(/'/g, "\\'");

    // Generate markers with hover and click functionality
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

                // Fit bounds if multiple stickers
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

/**
 * Generate a single sticker page
 */
// Batch generators for sticker-to-sticker link sections (used inside
// generateStickerPage). Sourced from allStickers list to avoid extra
// DB roundtrips during full-site regen.
function generateMoreFromClubBatch(currentSticker, allStickers, club) {
    if (!allStickers || allStickers.length === 0) return '';
    const others = allStickers.filter(s => s.club_id === club.id && s.id !== currentSticker.id && s.image_url).slice(0, 6);
    if (others.length === 0) return '';
    let html = `<div class="more-from-club">\n<h3>More from ${stripEmoji(club.name)}</h3>\n<div class="sticker-strip">`;
    others.forEach(s => {
        const thumbUrl = getThumbnailUrl(s.image_url);
        html += `\n<a href="/stickers/${s.id}.html" class="sticker-strip-item"><img src="${thumbUrl}" alt="Sticker #${s.id}" data-sticker-id="${s.id}" width="100" height="100" loading="lazy" decoding="async"></a>`;
    });
    html += '\n</div>\n</div>';
    return html;
}

function generateSimilarFromCountryBatch(currentSticker, allStickers, club, countryName) {
    if (!allStickers || allStickers.length === 0) return '';
    const cc = club.country?.toUpperCase();
    if (!cc) return '';
    const others = allStickers
        .filter(s => s.id !== currentSticker.id && s.image_url && s.club_id !== club.id && s.clubs?.country?.toUpperCase() === cc)
        .sort((a, b) => (b.rating || 1500) - (a.rating || 1500));
    if (others.length === 0) return '';
    const shown = [];
    const seenClubs = new Set();
    for (const s of others) {
        if (shown.length >= 6) break;
        if (seenClubs.has(s.club_id)) continue;
        shown.push(s);
        seenClubs.add(s.club_id);
    }
    if (shown.length === 0) return '';
    let html = `<div class="similar-from-country">\n<h3>More football stickers from ${stripEmoji(countryName || 'around')}</h3>\n<div class="sticker-strip">`;
    shown.forEach(s => {
        const thumbUrl = getThumbnailUrl(s.image_url);
        const clubName = s.clubs ? stripEmoji(s.clubs.name) : `Sticker #${s.id}`;
        html += `\n<a href="/stickers/${s.id}.html" class="sticker-strip-item" title="${clubName}"><img src="${thumbUrl}" alt="${clubName} sticker #${s.id}" data-sticker-id="${s.id}" width="100" height="100" loading="lazy" decoding="async"></a>`;
    });
    html += '\n</div>\n</div>';
    return html;
}

async function generateStickerPage(sticker, club, prevStickerId, nextStickerId, allStickers = []) {
    const template = loadTemplate('sticker-page.html');

    const countryName = getCountryName(club.country);
    const clubNameClean = stripEmoji(club.name);
    const pageTitle = `${clubNameClean} Sticker #${sticker.id} — Identify This Football Sticker | StickerHunt`;
    const metaDescription = `Football sticker #${sticker.id} from ${clubNameClean} (${countryName}). Browse our database to identify this sticker and explore the full ${clubNameClean} sticker collection.`;
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
        { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
        { text: club.name, url: `/clubs/${club.id}.html` },
        { text: `Sticker #${sticker.id}`, url: `/stickers/${sticker.id}.html` }
    ]);

    // Find nearby stickers for map (50km radius, max 10)
    const nearbyStickers = findNearbyStickers(sticker, allStickers, 50, 10);

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        NOINDEX_TAG: stickerNoindexTag(sticker),
        OG_IMAGE: cleanTrailingQuery(sticker.image_url),
        STICKER_NAME: `${club.name} Sticker #${sticker.id}`,
        IMAGE_URL: getDetailImageUrl(sticker.image_url),
        IMAGE_URL_LOCAL: toLocalImg(getDetailImageUrl(sticker.image_url)),
        IMAGE_URL_ABS: toLocalImgAbs(getDetailImageUrl(sticker.image_url)),
        THUMBNAIL_URL: getThumbnailUrl(sticker.image_url),
        THUMBNAIL_URL_LOCAL: toLocalImg(getThumbnailUrl(sticker.image_url)),
        THUMBNAIL_URL_ABS: toLocalImgAbs(getThumbnailUrl(sticker.image_url)),
        IMAGE_FULL_URL: sticker.image_url,
        ADDED_DATE_ISO: sticker.added_at ? new Date(sticker.added_at).toISOString().slice(0, 10) : (sticker.created_at ? new Date(sticker.created_at).toISOString().slice(0, 10) : ''),
        IMAGE_ALT: generateMultilingualAltText({
            clubName: clubNameClean, stickerId: sticker.id,
            countryCode: club.country,
            countryName,
            cityName: sticker.location ? sticker.location.trim() : null,
            league: wikiCache[club.id]?.league,
        }),
        STICKER_CONTEXT_PARAGRAPH: generateStickerContextParagraph({
            clubName: clubNameClean, stickerId: sticker.id,
            countryName,
            cityName: sticker.location ? sticker.location.trim() : null,
            league: wikiCache[club.id]?.league,
            founded: wikiCache[club.id]?.founded,
        }),
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
            { text: club.name, url: `/clubs/${club.id}.html` },
            { text: `Sticker #${sticker.id}`, url: `/stickers/${sticker.id}.html` }
        ]),
        MAIN_HEADING: `Sticker #${sticker.id}`,
        STICKER_ID: sticker.id,
        CLUB_ID: club.id,
        CLUB_NAME: stripEmoji(club.name),
        DIFFICULTY: generateDifficulty(sticker),
        DIFFICULTY_VALUE: sticker.difficulty || 1,
        ADDED_DATE: generateAddedDate(sticker),
        STICKER_DATE: generateStickerDate(sticker),
        STICKER_LOCATION: generateStickerLocation(sticker),
        NAVIGATION_BUTTONS: generateNavigationButtons(prevStickerId, nextStickerId),
        MAP_SECTION: generateMapSection(sticker),
        MAP_INIT_SCRIPT: generateMapInitScript(sticker, club.name, nearbyStickers),
        MORE_FROM_CLUB: generateMoreFromClubBatch(sticker, allStickers, club),
        SIMILAR_FROM_COUNTRY: generateSimilarFromCountryBatch(sticker, allStickers, club, countryName),
        NEARBY_STICKERS: '',
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
 * Generate a single club page
 */
async function generateClubPage(club, stickers, allClubsInCountry, stickerCountsByClub) {
    const template = loadTemplate('club-page.html');

    const countryName = getCountryName(club.country);
    const clubNameClean = stripEmoji(club.name);
    const stickerCount = stickers ? stickers.length : 0;
    const stickerWord = stickerCount !== 1 ? 'stickers' : 'sticker';
    const pageTitle = `${clubNameClean} Stickers — ${stickerCount} ${stickerWord.charAt(0).toUpperCase() + stickerWord.slice(1)} | StickerHunt`;
    const cityPart = club.city ? ` from ${cityOnly(club.city)},` : ' from';
    const metaDescription = `${clubNameClean} —${cityPart} ${countryName}. ${stickerCount} football ${stickerWord} found on streets. Can you identify them? Browse the collection at StickerHunt.`;
    const canonicalUrl = `${BASE_URL}/clubs/${club.id}.html`;

    // Build keywords
    let keywords = `${clubNameClean} stickers, ${clubNameClean} football stickers, identify ${clubNameClean} sticker, ${countryName} football stickers, panini sticker database`;
    if (club.media) {
        const hashtags = club.media.match(/#\w+/g) || [];
        const cleanHashtags = hashtags.map(h => h.replace('#', '')).join(', ');
        if (cleanHashtags) keywords += ', ' + cleanHashtags;
    }

    // Generate breadcrumbs
    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
        { text: club.name, url: `/clubs/${club.id}.html` }
    ]);

    // Filter stickers with coordinates for map
    const stickersWithCoordinates = stickers ? stickers.filter(
        s => s.latitude != null && s.longitude != null
    ) : [];

    // Get first sticker image for OG image (or use default)
    const ogImage = stickers && stickers.length > 0
        ? stickers[0].image_url
        : 'https://stickerhunt.club/metash.png';

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: cleanTrailingQuery(ogImage),
        OG_IMAGE_LOCAL: toLocalImg(cleanTrailingQuery(ogImage)),
        CLUB_ID: club.id,
        CLUB_NAME: stripEmoji(club.name),
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
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name),
        OTHER_CLUBS: generateOtherClubs(club.id, allClubsInCountry || [], stickerCountsByClub || {}, countryName),
        SCHEMA_JSON_LD: generateSchemaJsonLd(club, stickerCount, canonicalUrl, metaDescription, pageTitle)
    };

    const html = replacePlaceholders(template, data);

    // Save to file
    const outputDir = join(PROJECT_ROOT, 'clubs');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `${club.id}.html`);
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

/**
 * Generate a single country page
 */
async function generateCountryPage(countryCode, clubs, stickerCountsByClub, allStickers = []) {
    const template = loadTemplate('country-page.html');

    const countryName = getCountryName(countryCode);
    const countryFlag = COUNTRY_FLAGS[countryCode.toUpperCase()] || '🏳️';
    const totalStickers = Object.values(stickerCountsByClub).reduce((sum, n) => sum + n, 0);
    const pageTitle = `${countryName} Football Stickers — ${clubs.length} Clubs, ${totalStickers} Stickers | StickerHunt`;
    const metaDescription = `Browse ${totalStickers} football stickers from ${clubs.length} clubs in ${countryName}. Find stickers from ${countryName} clubs in the StickerHunt database.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `${countryName} football stickers, ${countryName} clubs stickers, identify ${countryName} sticker, football sticker database`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

    // Filter stickers for this country (by club_id)
    const clubIds = new Set(clubs.map(c => c.id));
    const countryStickers = allStickers.filter(s => clubIds.has(s.club_id));
    const clubById = new Map(clubs.map(c => [c.id, c]));

    // Enrich clubs with best sticker for thumbnail
    const clubsEnriched = clubs.map(club => {
        const count = stickerCountsByClub[club.id] || 0;
        const clubStickers = countryStickers.filter(s => s.club_id === club.id);
        let bestImg = null, bestRating = 0, bestStickerId = null;
        clubStickers.forEach(s => {
            if ((s.rating || 0) > bestRating) {
                bestRating = s.rating || 0;
                bestImg = s.image_url;
                bestStickerId = s.id;
            }
        });
        return { ...club, stickerCount: count, bestImg, bestStickerId, cleanName: stripEmoji(club.name) };
    });
    clubsEnriched.sort((a, b) => a.cleanName.localeCompare(b.cleanName, 'en'));

    // Most Collected — top 8 clubs by sticker count
    const topClubs = [...clubsEnriched].filter(c => c.stickerCount > 0 && c.bestImg)
        .sort((a, b) => b.stickerCount - a.stickerCount).slice(0, 8);
    let mostCollectedHtml = '';
    if (topClubs.length > 0) {
        let stripCards = '';
        topClubs.forEach(c => {
            const thumbUrl = cleanTrailingQuery(getThumbnailUrl(c.bestImg));
            stripCards += `
                <a href="/clubs/${c.id}.html" class="cat-club-card">
                    <img src="${thumbUrl}" alt="${c.cleanName} sticker" data-sticker-id="${c.bestStickerId}" width="140" height="140" loading="lazy" decoding="async">
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

    // FEATURED STICKERS — top 12 stickers by rating, each linking to /stickers/X.html.
    // This is the new section closing the sticker-isolation gap: every featured
    // sticker gets a high-authority incoming link from the country page.
    const featuredStickers = [...countryStickers]
        .filter(s => s.image_url)
        .sort((a, b) => (b.rating || 1500) - (a.rating || 1500) || (b.games || 0) - (a.games || 0))
        .slice(0, 12);
    let featuredStickersHtml = '';
    if (featuredStickers.length > 0) {
        let cards = '';
        featuredStickers.forEach(s => {
            const thumbUrl = cleanTrailingQuery(getThumbnailUrl(s.image_url));
            const club = clubById.get(s.club_id);
            const clubName = club ? stripEmoji(club.name) : '';
            cards += `
                <a href="/stickers/${s.id}.html" class="cat-club-card">
                    <img src="${thumbUrl}" alt="${clubName} sticker -- rated ${s.rating || 1500}" data-sticker-id="${s.id}" width="140" height="140" loading="lazy" decoding="async">
                    <span class="cat-club-label">${clubName}</span>
                    <span class="cat-club-count">⚡ ${s.rating || 1500}</span>
                </a>`;
        });
        featuredStickersHtml = `
        <div class="cat-section">
            <div class="cat-section-header">
                <h2>Featured Stickers</h2>
                <span class="cat-section-meta">top ${featuredStickers.length} by rating</span>
            </div>
            <div class="cat-clubs-strip">${cards}</div>
        </div>
        <hr class="cat-divider">`;
    }

    // OG image — pick best sticker overall
    const ogImage = topClubs.length > 0 && topClubs[0].bestImg
        ? cleanTrailingQuery(getOptimizedImageUrl(topClubs[0].bestImg))
        : 'https://stickerhunt.club/metash.png';

    // Club cards grid (with thumbnails when available)
    let clubCardsHtml = '';
    clubsEnriched.forEach(club => {
        const countLabel = club.stickerCount === 1 ? '1 sticker' : `${club.stickerCount} stickers`;
        let thumbHtml = '';
        if (club.bestImg) {
            const thumbUrl = cleanTrailingQuery(getThumbnailUrl(club.bestImg));
            thumbHtml = `<img src="${thumbUrl}" class="country-club-thumb" alt="" data-sticker-id="${club.bestStickerId}" width="44" height="44" loading="lazy" decoding="async">`;
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

    const topClubNames = topClubs.slice(0, 5).map(c => c.cleanName).join(', ');
    const seoDescription = `StickerHunt features stickers from clubs across ${countryName}. The most collected clubs include ${topClubNames}. Each club page shows all stickers found, their map locations, and community ratings. Browse the complete ${countryName} collection and discover fan-spotted stickers from across the country.`;

    const multilingualMeta = generateMultilingualMeta({
        type: 'country',
        countryCode: countryCode,
        vars: { country: countryName, clubCount: clubs.length, total: totalStickers }
    });

    // ItemList schema for clubs
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
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: ogImage,
        COUNTRY_NAME: countryName,
        COUNTRY_FLAG: countryFlag,
        CLUB_COUNT: clubs.length,
        TOTAL_STICKERS: totalStickers,
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
        ]),
        MAIN_HEADING: `${countryName} Football Stickers`,
        MOST_COLLECTED_SECTION: mostCollectedHtml,
        FEATURED_STICKERS_SECTION: featuredStickersHtml,
        CLUB_CARDS: clubCardsHtml,
        CLUB_LIST: clubCardsHtml,
        SEO_DESCRIPTION: seoDescription,
        MULTILINGUAL_META: multilingualMeta,
        SCHEMA_JSON_LD: schemaJsonLd,
    };

    const html = replacePlaceholders(template, data);

    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

/**
 * Generate static index.html with pre-embedded random sticker pool
 */
// Country code to flag emoji — uses the canonical COUNTRY_FLAGS map imported
// from seo-helpers.js (all ISO3 codes). A local stub here previously shadowed
// it with only ~29 countries, leaving ~25 countries with white-flag fallback.

async function generateIndexPage(stickers, clubs) {
    const template = loadTemplate('index-page.html');

    const TOTAL_STICKERS = stickers.length;
    const TOTAL_CLUBS = clubs.length;

    // --- Top Rated (8 stickers, by ELO) ---
    const topRated = [...stickers]
        .sort((a, b) => (b.rating || 1500) - (a.rating || 1500) || (b.games || 0) - (a.games || 0) || b.id - a.id)
        .slice(0, 8);

    let topRatedHtml = '';
    topRated.forEach(s => {
        const clubName = s.clubs ? stripEmoji(s.clubs.name) : '';
        const thumbUrl = getThumbnailUrl(s.image_url);
        topRatedHtml += `
                <a href="/stickers/${s.id}.html" class="hp-sticker-card">
                    <img src="${thumbUrl}" alt="${clubName} sticker -- rated ${s.rating || 1500}" data-sticker-id="${s.id}" width="140" height="140" loading="lazy" decoding="async">
                    <div class="hp-sticker-card-label">${clubName}</div>
                    <div class="hp-sticker-card-rating">⚡ ${s.rating || 1500}</div>
                </a>`;
    });

    // --- Recent (8 stickers, newest first) ---
    const recent = [...stickers].sort((a, b) => b.id - a.id).slice(0, 8);
    let recentHtml = '';
    recent.forEach(s => {
        const clubName = s.clubs ? stripEmoji(s.clubs.name) : '';
        const thumbUrl = getThumbnailUrl(s.image_url);
        recentHtml += `
                <a href="/stickers/${s.id}.html" class="hp-sticker-card">
                    <img src="${thumbUrl}" alt="${clubName} sticker -- recently added" data-sticker-id="${s.id}" width="140" height="140" loading="lazy" decoding="async">
                    <div class="hp-sticker-card-label">${clubName}</div>
                </a>`;
    });

    // --- Country stats (ALL countries with stickers — gives every country
    // page a high-authority incoming link from the homepage. Was previously
    // capped at top 16 which left 40+ countries orphaned for crawl-budget.) ---
    const stickersByCountry = {};
    stickers.forEach(s => {
        const cc = s.clubs?.country?.toUpperCase();
        if (cc) stickersByCountry[cc] = (stickersByCountry[cc] || 0) + 1;
    });
    const topCountries = Object.entries(stickersByCountry)
        .sort((a, b) => b[1] - a[1]);

    let countriesHtml = '';
    topCountries.forEach(([code, count]) => {
        const flag = COUNTRY_FLAGS[code] || '🏳️';
        const name = getCountryName(code);
        const shortName = name.length > 12 ? name.replace('United Kingdom', 'UK').replace('Switzerland', 'Switzerland').replace('Czech Republic', 'Czechia') : name;
        countriesHtml += `
                <a href="/countries/${code}.html" class="hp-country-card">
                    <span class="hp-country-flag">${flag}</span>
                    <span class="hp-country-name">${shortName}</span>
                    <span class="hp-country-count">${count.toLocaleString()}</span>
                </a>`;
    });

    // --- City stats (top 12 by sticker count) ---
    const stickersByCity = {};
    stickers.forEach(s => {
        if (!s.location) return;
        const city = s.location.split(',')[0].trim();
        if (city) stickersByCity[city] = (stickersByCity[city] || 0) + 1;
    });
    const topCities = Object.entries(stickersByCity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12);

    let citiesHtml = '';
    topCities.forEach(([name, count]) => {
        const slug = cityToSlug(name);
        citiesHtml += `
                <a href="/cities/${slug}.html" class="hp-city-card">
                    <span class="hp-city-name">${name}</span>
                    <span class="hp-city-count">${count} stickers</span>
                </a>`;
    });

    // --- Map points (lat/lng for stickers with coordinates, sample max 200) ---
    const withCoords = stickers.filter(s => s.latitude != null && s.longitude != null);
    const mapSample = withCoords.length > 200
        ? withCoords.sort(() => Math.random() - 0.5).slice(0, 200)
        : withCoords;
    const mapPointsJson = JSON.stringify(mapSample.map(s => [
        Math.round(s.latitude * 1000) / 1000,
        Math.round(s.longitude * 1000) / 1000
    ]));

    const data = {
        TOTAL_STICKERS: TOTAL_STICKERS.toLocaleString(),
        TOTAL_CLUBS: TOTAL_CLUBS.toLocaleString(),
        TOP_RATED_HTML: topRatedHtml,
        RECENT_STICKERS_HTML: recentHtml,
        COUNTRIES_HTML: countriesHtml,
        CITIES_HTML: citiesHtml,
        MAP_POINTS_JSON: mapPointsJson
    };

    const html = replacePlaceholders(template, data);
    const outputPath = join(PROJECT_ROOT, 'index.html');
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

/**
 * Fetch all stickers with pagination (Supabase limits to 1000 per request)
 */
async function fetchAllStickers() {
    const PAGE_SIZE = 1000;
    let allStickers = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        // Include rating and games fields for ELO display
        const { data, error } = await supabase
            .from('stickers')
            .select('*, clubs(*)')
            .order('id', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            throw new Error(`Supabase error fetching stickers: ${error.message}`);
        }

        if (data && data.length > 0) {
            allStickers = allStickers.concat(data);
            console.log(`    Fetched ${allStickers.length} stickers...`);
            offset += PAGE_SIZE;

            // If we got less than PAGE_SIZE, we've reached the end
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }

        // Apply LIMIT if set
        if (LIMIT && allStickers.length >= LIMIT) {
            allStickers = allStickers.slice(0, LIMIT);
            hasMore = false;
        }
    }

    return allStickers;
}

/**
 * Fetch all clubs with pagination
 */
async function fetchAllClubs() {
    const PAGE_SIZE = 1000;
    let allClubs = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('clubs')
            .select('*')
            .order('name', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            throw new Error(`Supabase error fetching clubs: ${error.message}`);
        }

        if (data && data.length > 0) {
            allClubs = allClubs.concat(data);
            offset += PAGE_SIZE;

            if (data.length < PAGE_SIZE) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    return allClubs;
}

/**
 * Inject static SSR content into the hand-maintained catalogue.html so the
 * raw HTML response carries direct links to every country and every club.
 *
 * Before this, catalogue.html was just `<p>Loading catalogue...</p>` — all
 * content was rendered by catalogue.js after JS execution. Googlebot does
 * run JS, but JS-rendered links flow PageRank weakly compared to static
 * <a> tags, and the catalogue page is the highest-authority hub on the
 * site for the link graph. The internal-links-audit on 2026-05-26 found
 * 100% of sticker pages and 59% of club pages "isolated" (<3 incoming
 * HA links) — direct consequence of an empty catalogue.
 *
 * We replace the loading placeholder with a static section containing:
 * - all N countries with sticker count
 * - all N clubs grouped by country
 * The interactive UI (search, filter) keeps working — catalogue.js can
 * either hydrate over this DOM or rebuild; either way the pre-paint
 * link graph is now rich.
 */
async function generateCataloguePage(stickers, clubs) {
    const catalogueHtmlPath = join(PROJECT_ROOT, 'catalogue.html');
    if (!existsSync(catalogueHtmlPath)) {
        console.log('  ⚠️  catalogue.html not found, skipping');
        return;
    }
    const orig = readFileSync(catalogueHtmlPath, 'utf-8');

    // Sticker counts per club + per country
    const stickerCountByClub = new Map();
    const stickerCountByCountry = new Map();
    for (const s of stickers) {
        stickerCountByClub.set(s.club_id, (stickerCountByClub.get(s.club_id) || 0) + 1);
        const cc = s.clubs?.country?.toUpperCase();
        if (cc) stickerCountByCountry.set(cc, (stickerCountByCountry.get(cc) || 0) + 1);
    }

    // Group clubs by country
    const clubsByCountry = new Map();
    for (const c of clubs) {
        const cc = c.country?.toUpperCase();
        if (!cc) continue;
        if (!clubsByCountry.has(cc)) clubsByCountry.set(cc, []);
        clubsByCountry.get(cc).push(c);
    }
    // Sort clubs alphabetically per country
    for (const [cc, list] of clubsByCountry) {
        list.sort((a, b) => stripEmoji(a.name).localeCompare(stripEmoji(b.name)));
    }
    // Sort countries by sticker count desc
    const countriesSorted = Array.from(clubsByCountry.keys()).sort((a, b) => {
        return (stickerCountByCountry.get(b) || 0) - (stickerCountByCountry.get(a) || 0);
    });

    // Top stickers — top 100 by rating × games (closes the long-tail sticker
    // isolation gap by giving 100 popular stickers one more high-authority
    // incoming link from the catalogue hub page).
    const topStickers = [...stickers]
        .filter(s => s.image_url)
        .sort((a, b) => (b.rating || 1500) - (a.rating || 1500) || (b.games || 0) - (a.games || 0))
        .slice(0, 100);
    const clubByIdForCat = new Map(clubs.map(c => [c.id, c]));
    let topStickersHtml = '<div class="cat-clubs-strip">';
    topStickers.forEach(s => {
        const thumbUrl = cleanTrailingQuery(getThumbnailUrl(s.image_url));
        const club = clubByIdForCat.get(s.club_id);
        const clubName = club ? stripEmoji(club.name) : '';
        topStickersHtml += `<a href="/stickers/${s.id}.html" class="cat-club-card"><img src="${thumbUrl}" alt="${clubName} sticker -- rated ${s.rating || 1500}" data-sticker-id="${s.id}" width="140" height="140" loading="lazy" decoding="async"><span class="cat-club-label">${clubName}</span><span class="cat-club-count">⚡ ${s.rating || 1500}</span></a>`;
    });
    topStickersHtml += '</div>';

    // Build country grid HTML
    let countryGridHtml = '<div class="cat-countries-grid">';
    for (const cc of countriesSorted) {
        const flag = COUNTRY_FLAGS[cc] || '🏳️';
        const name = getCountryName(cc);
        const clubCount = clubsByCountry.get(cc).length;
        const stickerCount = stickerCountByCountry.get(cc) || 0;
        countryGridHtml += `<a href="/countries/${cc}.html" class="cat-country-card"><span class="cat-country-flag">${flag}</span><span class="cat-country-name">${name}</span><span class="cat-country-meta">${clubCount} clubs · ${stickerCount} stickers</span></a>`;
    }
    countryGridHtml += '</div>';

    // Build clubs grid per country (collapsible via <details>)
    let clubsHtml = '';
    for (const cc of countriesSorted) {
        const flag = COUNTRY_FLAGS[cc] || '🏳️';
        const name = getCountryName(cc);
        const list = clubsByCountry.get(cc);
        clubsHtml += `<details class="cat-country-group"><summary><a href="/countries/${cc}.html">${flag} ${name}</a> <span class="cat-group-count">${list.length} clubs</span></summary><ul class="cat-clubs-list">`;
        for (const club of list) {
            const cleanName = stripEmoji(club.name);
            const count = stickerCountByClub.get(club.id) || 0;
            clubsHtml += `<li><a href="/clubs/${club.id}.html">${cleanName}</a> <span class="cat-club-count">${count}</span></li>`;
        }
        clubsHtml += '</ul></details>';
    }

    const ssrBlock = `
        <div id="catalogue-content">
            <section class="cat-hero" id="cat-hero-static">
                <h2>Browse by country</h2>
                <p>${countriesSorted.length} countries · ${clubs.length} clubs · ${stickers.length} stickers</p>
            </section>
            <section class="cat-section" id="cat-top-stickers-section">
                <div class="cat-section-header">
                    <h2>Top 100 stickers</h2>
                    <span class="cat-section-meta">by community rating</span>
                </div>
                ${topStickersHtml}
            </section>
            <section class="cat-section" id="cat-countries-section">
                ${countryGridHtml}
            </section>
            <section class="cat-section" id="cat-clubs-section">
                <h2>All clubs by country</h2>
                ${clubsHtml}
            </section>
        </div>`;

    // Replace existing #catalogue-content block with the SSR version.
    let newHtml = orig.replace(
        /<div id="catalogue-content">[\s\S]*?<\/div>\s*<\/main>/,
        `${ssrBlock}\n    </main>`
    );

    if (newHtml === orig) {
        console.log('  ⚠️  catalogue.html: #catalogue-content block not found, skipping injection');
        return;
    }

    // Keep the static head's counters honest (title/description shipped with
    // "3,156 Stickers from 675 Clubs" hardcoded and drift as the DB grows).
    // Scoped to <head> only: the body legitimately contains per-country "N clubs".
    const headEnd = newHtml.indexOf('</head>');
    if (headEnd !== -1) {
        const nStickers = stickers.length.toLocaleString('en-US');
        const nClubs = String(clubs.length);
        const nCountries = String(clubsByCountry.size);
        const head = newHtml.slice(0, headEnd)
            .replace(/[\d,]+ Stickers/g, `${nStickers} Stickers`)
            .replace(/[\d,]+ football stickers/g, `${nStickers} football stickers`)
            .replace(/[\d,]+ ([Cc])lubs/g, (m, c) => `${nClubs} ${c}lubs`)
            .replace(/[\d,]+ countries/g, `${nCountries} countries`);
        newHtml = head + newHtml.slice(headEnd);
    }

    writeFileSync(catalogueHtmlPath, newHtml, 'utf-8');
    console.log(`  ✓ catalogue.html updated with ${countriesSorted.length} country + ${clubs.length} club static links`);
}

/**
 * Generate sitemaps (index + sub-sitemaps for Google Search Console)
 */
async function generateSitemaps(stickers, clubs, countries) {
    // Delegate to the canonical scripts/generate-sitemaps.js. The old inline
    // version stamped lastmod=today on EVERY URL each run — the crawl-budget
    // churn behind the May 2026 visibility collapse (see WORKPLAN.md). The
    // canonical script preserves per-URL lastmod and carries the <image:image>
    // extension. Params are ignored — it re-reads Supabase itself.
    execFileSync('node', [join(__dirname, 'generate-sitemaps.js')], { stdio: 'inherit' });
}

/**
 * Main generation function
 */
async function generateAllPages() {
    try {
        console.log('📦 Fetching data from Supabase...\n');

        // Fetch all stickers with clubs (with pagination)
        console.log('  → Fetching stickers (with pagination)...');
        const stickers = await fetchAllStickers();

        if (!stickers || stickers.length === 0) {
            console.log('⚠️  No stickers found in database.');
            return;
        }

        console.log(`  ✓ Fetched ${stickers.length} stickers total`);

        // Check for ID gaps and warn
        if (stickers.length > 0) {
            const minId = stickers[0].id;
            const maxId = stickers[stickers.length - 1].id;
            const expectedCount = maxId - minId + 1;
            const actualCount = stickers.length;

            if (actualCount < expectedCount) {
                const gapCount = expectedCount - actualCount;
                console.log(`  ⚠️  Note: ${gapCount} sticker ID(s) missing (gaps in sequence ${minId}-${maxId})`);
                console.log(`  ✓ Will generate pages only for existing ${actualCount} stickers\n`);
            } else {
                console.log(`  ✓ Sticker IDs are continuous (${minId}-${maxId})\n`);
            }
        }

        // Fetch all clubs (with pagination)
        console.log('  → Fetching clubs...');
        const clubs = await fetchAllClubs();

        console.log(`  ✓ Fetched ${clubs.length} clubs`);

        // Group stickers by club
        const stickersByClub = {};
        stickers.forEach(sticker => {
            if (!stickersByClub[sticker.club_id]) {
                stickersByClub[sticker.club_id] = [];
            }
            stickersByClub[sticker.club_id].push(sticker);
        });

        // Group clubs by country
        const clubsByCountry = {};
        clubs.forEach(club => {
            const country = club.country.toUpperCase();
            if (!clubsByCountry[country]) {
                clubsByCountry[country] = [];
            }
            clubsByCountry[country].push(club);
        });

        console.log(`  ✓ Found ${Object.keys(clubsByCountry).length} countries`);

        if (isHomepageOnly) {
            console.log('\n⏭️  --homepage-only mode: skipping sticker/club/country pages');
            // Jump straight to homepage + catalogue + sitemaps
            console.log('\n🏠 Generating index page...');
            await generateIndexPage(stickers, clubs);
            console.log('  ✓ Generated index.html with homepage sections');

            console.log('\n📚 Generating catalogue page (static SSR)...');
            await generateCataloguePage(stickers, clubs);

            console.log('\n📋 Generating sitemaps...');
            await generateSitemaps(stickers, clubs, Object.keys(clubsByCountry));

            console.log('\n✅ Homepage-only generation complete!');
            console.log('   Generated files:');
            console.log(`   ${join(PROJECT_ROOT, 'index.html')}`);
            console.log(`   ${join(PROJECT_ROOT, 'catalogue.html')}`);
            return;
        }

        // Generate sticker pages (pass all stickers for nearby calculation)
        console.log();
        console.log('🔨 Generating sticker pages...');
        let stickerSuccess = 0;
        let stickerError = 0;

        for (let i = 0; i < stickers.length; i++) {
            const sticker = stickers[i];
            const prevStickerId = i > 0 ? stickers[i - 1].id : null;
            const nextStickerId = i < stickers.length - 1 ? stickers[i + 1].id : null;

            try {
                await generateStickerPage(sticker, sticker.clubs, prevStickerId, nextStickerId, stickers);
                stickerSuccess++;

                if (stickerSuccess % 100 === 0 || stickerSuccess === stickers.length) {
                    console.log(`  ✓ Generated ${stickerSuccess}/${stickers.length} sticker pages...`);
                }
            } catch (error) {
                console.error(`  ✗ Error generating page for sticker #${sticker.id}:`, error.message);
                stickerError++;
            }
        }

        // Generate club pages
        console.log('\n🔨 Generating club pages...');
        let clubSuccess = 0;
        let clubError = 0;

        for (const club of clubs) {
            try {
                const clubStickers = stickersByClub[club.id] || [];
                await generateClubPage(club, clubStickers);
                clubSuccess++;

                if (clubSuccess % 10 === 0 || clubSuccess === clubs.length) {
                    console.log(`  ✓ Generated ${clubSuccess}/${clubs.length} club pages...`);
                }
            } catch (error) {
                console.error(`  ✗ Error generating page for club #${club.id}:`, error.message);
                clubError++;
            }
        }

        // Generate country pages
        console.log('\n🔨 Generating country pages...');
        let countrySuccess = 0;
        let countryError = 0;

        // Calculate sticker counts per club
        const stickerCountsByClub = {};
        stickers.forEach(sticker => {
            if (!stickerCountsByClub[sticker.club_id]) {
                stickerCountsByClub[sticker.club_id] = 0;
            }
            stickerCountsByClub[sticker.club_id]++;
        });

        for (const [countryCode, countryClubs] of Object.entries(clubsByCountry)) {
            try {
                await generateCountryPage(countryCode, countryClubs, stickerCountsByClub, stickers);
                countrySuccess++;
                console.log(`  ✓ Generated page for ${getCountryName(countryCode)}`);
            } catch (error) {
                console.error(`  ✗ Error generating page for country ${countryCode}:`, error.message);
                countryError++;
            }
        }

        // Generate index page with pre-embedded random stickers
        console.log('\n🏠 Generating index page...');
        try {
            await generateIndexPage(stickers, clubs);
            console.log('  ✓ Generated index.html with homepage sections');
        } catch (error) {
            console.error('  ✗ Error generating index page:', error.message);
        }

        // Generate catalogue page with static SSR (all country + club links)
        console.log('\n📚 Generating catalogue page (static SSR)...');
        try {
            await generateCataloguePage(stickers, clubs);
        } catch (error) {
            console.error('  ✗ Error generating catalogue page:', error.message);
        }

        // Generate sitemaps
        console.log('\n🗺️  Generating sitemaps...');
        try {
            await generateSitemaps(stickers, clubs, Object.keys(clubsByCountry));
            console.log('  ✓ Generated sitemap index + 4 sub-sitemaps');
        } catch (error) {
            console.error('  ✗ Error generating sitemaps:', error.message);
        }

        // Summary
        console.log(`\n✅ Generation complete!`);
        console.log(`\n   Sticker pages: ${stickerSuccess} success, ${stickerError} errors`);
        console.log(`   Club pages: ${clubSuccess} success, ${clubError} errors`);
        console.log(`   Country pages: ${countrySuccess} success, ${countryError} errors`);
        console.log(`   Index page: generated`);
        console.log(`\n📁 Output files:`);
        console.log(`   ${join(PROJECT_ROOT, 'index.html')}`);
        console.log(`   ${join(PROJECT_ROOT, 'stickers')}/*.html`);
        console.log(`   ${join(PROJECT_ROOT, 'clubs')}/*.html`);
        console.log(`   ${join(PROJECT_ROOT, 'countries')}/*.html`);

        // Auto-update docs with current stats
        try {
            const docsArchPath = join(PROJECT_ROOT, 'docs', 'architecture.md');
            if (existsSync(docsArchPath)) {
                let docsContent = readFileSync(docsArchPath, 'utf-8');
                const totalStickers = stickers.length;
                const totalClubs = clubs.length;
                const totalCountries = Object.keys(clubsByCountry).length;
                const updatedBlock = `<!-- AUTO-UPDATED by generate-static-pages.js -->\n- **Stickers:** ${totalStickers}\n- **Clubs:** ${totalClubs}\n- **Countries:** ${totalCountries}\n- **Cities:** 22+\n<!-- /AUTO-UPDATED -->`;
                docsContent = docsContent.replace(
                    /<!-- AUTO-UPDATED by generate-static-pages\.js -->[\s\S]*?<!-- \/AUTO-UPDATED -->/,
                    updatedBlock
                );
                writeFileSync(docsArchPath, docsContent);
                console.log(`\n📝 Updated docs/architecture.md (${totalStickers} stickers, ${totalClubs} clubs, ${totalCountries} countries)`);
            }
        } catch (docErr) {
            console.warn('  ⚠ Could not update docs:', docErr.message);
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the generator
generateAllPages();
