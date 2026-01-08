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

// Check for test mode or LIMIT environment variable
const isTestMode = process.argv.includes('--test');
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT) : (isTestMode ? 10 : null);

console.log(`🚀 Starting static page generation${LIMIT ? ` (LIMIT: ${LIMIT} stickers)` : ''}...\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Country code mapping (complete version)
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
    // UK nations
    'ENG': 'England', 'SCO': 'Scotland', 'WLS': 'Wales', 'NIR': 'Northern Ireland'
};

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
 * Get thumbnail URL (150x150 WebP)
 */
function getThumbnailUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_thumb');
}

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
        const sanitizedUrl = encodeURI(club.web);
        html += `<p class="club-info-item">🌐 <a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${club.web}</a></p>`;
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
                         alt="Sticker ID ${sticker.id} for ${clubName}"
                         class="sticker-preview-image"
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
async function generateStickerPage(sticker, club, prevStickerId, nextStickerId, allStickers = []) {
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
        OG_IMAGE: sticker.image_url,
        STICKER_NAME: `${club.name} Sticker #${sticker.id}`,
        IMAGE_URL: getDetailImageUrl(sticker.image_url),
        IMAGE_FULL_URL: sticker.image_url,
        IMAGE_ALT: `Sticker ${sticker.id} - ${club.name}`,
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: `Sticker #${sticker.id}`,
        STICKER_ID: sticker.id,
        CLUB_NAME: club.name,
        ADDED_DATE: generateAddedDate(sticker),
        STICKER_DATE: generateStickerDate(sticker),
        STICKER_LOCATION: generateStickerLocation(sticker),
        NAVIGATION_BUTTONS: generateNavigationButtons(prevStickerId, nextStickerId),
        MAP_SECTION: generateMapSection(sticker),
        MAP_INIT_SCRIPT: generateMapInitScript(sticker, club.name, nearbyStickers)
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
async function generateClubPage(club, stickers) {
    const template = loadTemplate('club-page.html');

    const countryName = getCountryName(club.country);
    const pageTitle = `${club.name} - ${countryName} - Sticker Catalogue`;
    const stickerCount = stickers ? stickers.length : 0;
    const metaDescription = `View ${stickerCount} stickers from ${club.name} (${countryName}) in our football sticker collection.`;
    const canonicalUrl = `${BASE_URL}/clubs/${club.id}.html`;

    // Build keywords
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
        OG_IMAGE: ogImage,
        CLUB_NAME: club.name,
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: `${club.name} - Sticker Gallery`,
        CLUB_INFO: generateClubInfo(club),
        STICKER_GALLERY: generateStickerGallery(stickers, club.name),
        CLUB_MAP_SECTION: generateClubMapSection(stickersWithCoordinates),
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name)
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
async function generateCountryPage(countryCode, clubs, stickerCountsByClub) {
    const template = loadTemplate('country-page.html');

    const countryName = getCountryName(countryCode);
    const pageTitle = `${countryName} - Sticker Catalogue`;
    const metaDescription = `Browse ${clubs.length} football clubs from ${countryName} in our sticker database. Explore club stickers and discover the complete collection.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `football stickers, ${countryName}, panini catalogue, football clubs, sticker collection`;

    // Generate breadcrumbs
    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

    // Add sticker counts to clubs and sort
    const clubsWithStickerCounts = clubs.map(club => ({
        ...club,
        stickerCount: stickerCountsByClub[club.id] || 0
    }));
    clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));

    // Generate club list HTML
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

    // Save to file
    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

/**
 * Generate static index.html with pre-embedded random sticker pool
 */
async function generateIndexPage(stickers) {
    const template = loadTemplate('index-page.html');

    // Select random stickers for the pool (50 stickers for variety)
    const poolSize = Math.min(50, stickers.length);
    const shuffled = [...stickers].sort(() => Math.random() - 0.5);
    const selectedStickers = shuffled.slice(0, poolSize);

    // Create sticker pool with optimized image URLs
    const stickerPool = selectedStickers.map(sticker => ({
        id: sticker.id,
        url: getOptimizedImageUrl(sticker.image_url, '_web')
    }));

    // First sticker for preload and initial display
    const firstSticker = stickerPool[0];

    const data = {
        TOTAL_STICKERS: stickers.length,
        FIRST_STICKER_URL: firstSticker.url,
        FIRST_STICKER_LINK: `/stickers/${firstSticker.id}.html`,
        STICKER_POOL_JSON: JSON.stringify(stickerPool)
    };

    const html = replacePlaceholders(template, data);

    // Save directly to project root as index.html
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
                await generateCountryPage(countryCode, countryClubs, stickerCountsByClub);
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
            await generateIndexPage(stickers);
            console.log('  ✓ Generated index.html with random sticker pool');
        } catch (error) {
            console.error('  ✗ Error generating index page:', error.message);
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

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the generator
generateAllPages();
