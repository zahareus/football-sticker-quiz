#!/usr/bin/env node

/**
 * Generate static HTML pages for a single sticker
 * This script is designed to be called after a new sticker is uploaded
 * It generates: sticker page, club page, and country page
 *
 * Usage: node generate-single-sticker.js <sticker_id>
 * Environment: STICKER_ID can also be passed as env variable
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from project root
const PROJECT_ROOT_FOR_ENV = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(PROJECT_ROOT_FOR_ENV, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

// Get script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Get sticker ID from command line or environment
const stickerId = parseInt(process.argv[2] || process.env.STICKER_ID);

if (!stickerId || isNaN(stickerId)) {
    console.error('❌ Error: Sticker ID is required');
    console.error('Usage: node generate-single-sticker.js <sticker_id>');
    console.error('Or set STICKER_ID environment variable');
    process.exit(1);
}

console.log(`🚀 Generating pages for sticker #${stickerId}...\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/**
 * Convert original image URL to optimized WebP version URL
 */
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

function getDetailImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

function getThumbnailUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_thumb');
}

function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
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

function generateStickerDate(sticker) {
    if (!sticker.found) return '';
    const dateObj = new Date(sticker.found);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    return `<p class="sticker-detail-date">Hunted on ${formattedDate}</p>`;
}

function generateStickerLocation(sticker) {
    if (!sticker.location || sticker.location.trim() === '') return '';
    return `<p class="sticker-detail-location">${sticker.location}</p>`;
}

function generateDifficulty(sticker) {
    const difficulty = sticker.difficulty || 1;
    let circles = '';
    if (difficulty === 1) {
        circles = '🟢';
    } else if (difficulty === 2) {
        circles = '🟡🟡';
    } else if (difficulty === 3) {
        circles = '🔴🔴🔴';
    }
    return `<p class="sticker-detail-difficulty">Difficulty: ${circles}</p>`;
}

function generateAddedDate(sticker) {
    if (!sticker.created_at) return '';
    const dateObj = new Date(sticker.created_at);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    return `<p class="sticker-detail-added">Added on ${formattedDate}</p>`;
}

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

function generateMapSection(sticker) {
    const hasCoordinates = sticker.latitude != null && sticker.longitude != null;

    if (hasCoordinates) {
        return `
            <div class="sticker-map-section sticker-map-full-width">
                <div id="sticker-map" class="sticker-map-container"></div>
                <div class="sticker-detail-actions">
                    <a href="/map.html" class="btn btn-nav">View Full Map</a>
                    <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="sticker-detail-actions sticker-actions-no-map">
                <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
            </div>
        `;
    }
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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

    nearby.sort((a, b) => a.distance - b.distance);
    return nearby.slice(0, maxCount);
}

function generateMapInitScript(sticker, clubName, nearbyStickers = []) {
    if (!sticker.latitude || !sticker.longitude) return '';

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

                ${nearbyMarkersCode}

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
                         alt="Sticker ID ${sticker.id} for ${clubName}"
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

/**
 * Generate a single sticker page
 */
async function generateStickerPage(sticker, club, prevStickerId, nextStickerId, allStickers = []) {
    const template = loadTemplate('sticker-page.html');

    const countryName = getCountryName(club.country);
    const pageTitle = `Sticker #${sticker.id} - ${club.name} - ${countryName} - StickerHunt`;
    const metaDescription = `Football sticker #${sticker.id} from ${club.name}, ${countryName}. View this sticker in our collection.`;
    const canonicalUrl = `${BASE_URL}/stickers/${sticker.id}.html`;

    let keywords = `football stickers, ${club.name}, ${countryName}, panini, sticker collection`;
    if (club.media) {
        const cleanMedia = club.media.replace(/[#\uD800-\uDFFF]/g, '').trim();
        if (cleanMedia) {
            keywords += ', ' + cleanMedia;
        }
    }

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${club.country.toUpperCase()}.html` },
        { text: club.name, url: `/clubs/${club.id}.html` },
        { text: `Sticker #${sticker.id}`, url: `/stickers/${sticker.id}.html` }
    ]);

    const nearbyStickers = findNearbyStickers(sticker, allStickers, 50, 10);

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
        MAP_INIT_SCRIPT: generateMapInitScript(sticker, club.name, nearbyStickers)
    };

    const html = replacePlaceholders(template, data);

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
async function generateClubPage(club, stickers) {
    const template = loadTemplate('club-page.html');

    const countryName = getCountryName(club.country);
    const pageTitle = `${club.name} - ${countryName} - Sticker Catalogue`;
    const stickerCount = stickers ? stickers.length : 0;
    const metaDescription = `View ${stickerCount} stickers from ${club.name} (${countryName}) in our football sticker collection.`;
    const canonicalUrl = `${BASE_URL}/clubs/${club.id}.html`;

    let keywords = `football stickers, ${club.name}, ${countryName}, panini, sticker collection`;
    if (club.media) {
        const cleanMedia = club.media.replace(/[#\uD800-\uDFFF]/g, '').trim();
        if (cleanMedia) {
            keywords += ', ' + cleanMedia;
        }
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
        OG_IMAGE: ogImage,
        CLUB_ID: club.id,
        CLUB_NAME: club.name,
        CLUB_CITY: club.city || '',
        CLUB_WEB: club.web || '',
        CLUB_MEDIA: club.media || '',
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: `${club.name} - Sticker Gallery`,
        CLUB_INFO: generateClubInfo(club),
        STICKER_GALLERY: generateStickerGallery(stickers, club.name),
        CLUB_MAP_SECTION: generateClubMapSection(stickersWithCoordinates),
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name)
    };

    const html = replacePlaceholders(template, data);

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
async function generateCountryPage(countryCode, clubs, stickerCountsByClub) {
    const template = loadTemplate('country-page.html');

    const countryName = getCountryName(countryCode);
    const pageTitle = `${countryName} - Sticker Catalogue`;
    const metaDescription = `Browse ${clubs.length} football clubs from ${countryName} in our sticker database. Explore club stickers and discover the complete collection.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `football stickers, ${countryName}, panini catalogue, football clubs, sticker collection`;

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
        MAIN_HEADING: countryName,
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

/**
 * Main function
 */
async function generatePagesForSticker() {
    try {
        // 1. Fetch the specific sticker with club info
        console.log(`📦 Fetching sticker #${stickerId} from Supabase...`);

        const { data: sticker, error: stickerError } = await supabase
            .from('stickers')
            .select('*, clubs(*)')
            .eq('id', stickerId)
            .single();

        if (stickerError || !sticker) {
            throw new Error(`Sticker #${stickerId} not found: ${stickerError?.message || 'No data'}`);
        }

        const club = sticker.clubs;
        if (!club) {
            throw new Error(`Club not found for sticker #${stickerId}`);
        }

        console.log(`  ✓ Found sticker #${stickerId} for club: ${club.name}`);

        // 2. Get prev/next sticker IDs for navigation
        const { data: prevSticker } = await supabase
            .from('stickers')
            .select('id')
            .lt('id', stickerId)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        const { data: nextSticker } = await supabase
            .from('stickers')
            .select('id')
            .gt('id', stickerId)
            .order('id', { ascending: true })
            .limit(1)
            .single();

        const prevStickerId = prevSticker?.id || null;
        const nextStickerId = nextSticker?.id || null;

        console.log(`  ✓ Navigation: prev=#${prevStickerId || 'none'}, next=#${nextStickerId || 'none'}`);

        // 3. Fetch nearby stickers for map (within 50km)
        let nearbyStickers = [];
        if (sticker.latitude && sticker.longitude) {
            const { data: allStickers } = await supabase
                .from('stickers')
                .select('id, latitude, longitude, clubs(name)')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (allStickers) {
                nearbyStickers = allStickers.map(s => ({
                    ...s,
                    clubs: s.clubs
                }));
            }
        }

        // 4. Generate sticker page
        console.log('\n🔨 Generating sticker page...');
        const stickerPath = await generateStickerPage(sticker, club, prevStickerId, nextStickerId, nearbyStickers);
        console.log(`  ✓ Generated: ${stickerPath}`);

        // 5. Fetch all stickers for this club and generate club page
        console.log('\n🔨 Generating club page...');
        const { data: clubStickers } = await supabase
            .from('stickers')
            .select('*')
            .eq('club_id', club.id)
            .order('id', { ascending: true });

        const clubPath = await generateClubPage(club, clubStickers || []);
        console.log(`  ✓ Generated: ${clubPath}`);

        // 6. Generate country page
        console.log('\n🔨 Generating country page...');
        const countryCode = club.country.toUpperCase();

        // Get all clubs for this country
        const { data: countryClubs } = await supabase
            .from('clubs')
            .select('*')
            .eq('country', club.country)
            .order('name');

        // Count stickers per club
        const { data: stickerCounts } = await supabase
            .from('stickers')
            .select('club_id');

        const stickerCountsByClub = {};
        if (stickerCounts) {
            stickerCounts.forEach(s => {
                stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
            });
        }

        const countryPath = await generateCountryPage(countryCode, countryClubs || [], stickerCountsByClub);
        console.log(`  ✓ Generated: ${countryPath}`);

        // 7. Update previous sticker's navigation (if exists)
        if (prevStickerId) {
            console.log('\n🔄 Updating previous sticker navigation...');
            const { data: prevStickerData } = await supabase
                .from('stickers')
                .select('*, clubs(*)')
                .eq('id', prevStickerId)
                .single();

            if (prevStickerData) {
                // Get the prev of prev
                const { data: prevPrevSticker } = await supabase
                    .from('stickers')
                    .select('id')
                    .lt('id', prevStickerId)
                    .order('id', { ascending: false })
                    .limit(1)
                    .single();

                await generateStickerPage(
                    prevStickerData,
                    prevStickerData.clubs,
                    prevPrevSticker?.id || null,
                    stickerId,
                    nearbyStickers
                );
                console.log(`  ✓ Updated: stickers/${prevStickerId}.html`);
            }
        }

        // Summary
        console.log('\n✅ Generation complete!');
        console.log(`\n📁 Generated files:`);
        console.log(`   - /stickers/${stickerId}.html`);
        console.log(`   - /clubs/${club.id}.html`);
        console.log(`   - /countries/${countryCode}.html`);
        if (prevStickerId) {
            console.log(`   - /stickers/${prevStickerId}.html (navigation updated)`);
        }

        // Output sticker URL for webhook
        const stickerUrl = `${BASE_URL}/stickers/${stickerId}.html`;
        console.log(`\n🔗 Sticker URL: ${stickerUrl}`);

        // Return data for CI/CD integration
        return {
            success: true,
            sticker_id: stickerId,
            sticker_url: stickerUrl,
            club_id: club.id,
            club_name: club.name,
            country_code: countryCode,
            files_generated: [
                `stickers/${stickerId}.html`,
                `clubs/${club.id}.html`,
                `countries/${countryCode}.html`,
                ...(prevStickerId ? [`stickers/${prevStickerId}.html`] : [])
            ]
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the generator
generatePagesForSticker();
