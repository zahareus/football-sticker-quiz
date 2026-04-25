#!/usr/bin/env node

/**
 * Generate city pages for StickerHunt
 * Groups stickers by city name and generates a page for each city with 3+ stickers
 *
 * Usage: node generate-city-pages.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
    COUNTRY_NAMES,
    createSupabaseClient,
    getOptimizedImageUrl as _getOptimizedImageUrl,
    selectTopRatedStickers, generateMultilingualMeta
} from './seo-helpers.js';

// Configuration
const BASE_URL = "https://stickerhunt.club";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const MIN_STICKERS_PER_CITY = 3;
const WIKI_API_DELAY_MS = 500;

// Initialize Supabase client
const supabase = createSupabaseClient();

// Reverse mapping: country name -> code
const COUNTRY_CODES = {};
for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
    COUNTRY_CODES[name] = code;
}

function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

function getCountryCode(name) {
    return COUNTRY_CODES[name] || null;
}

function cleanTrailingQuery(url) {
    return url ? url.replace(/\?$/, '') : url;
}

function cityToSlug(cityName) {
    return cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
    return links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' &rarr; ');
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

// ============================================================
// Wikipedia / Wikidata fetching for cities
// ============================================================

let cityWikiCache = {};
const CITY_WIKI_CACHE_PATH = join(PROJECT_ROOT, 'scripts/city-wiki-cache.json');

function loadCityWikiCache() {
    try {
        cityWikiCache = JSON.parse(readFileSync(CITY_WIKI_CACHE_PATH, 'utf-8'));
        console.log(`  Loaded city wiki cache with ${Object.keys(cityWikiCache).length} entries`);
    } catch {
        cityWikiCache = {};
    }
}

function saveCityWikiCache() {
    writeFileSync(CITY_WIKI_CACHE_PATH, JSON.stringify(cityWikiCache, null, 2), 'utf-8');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCityWikiData(cityName) {
    // Check cache first
    if (cityWikiCache[cityName]) {
        return cityWikiCache[cityName];
    }

    console.log(`    Fetching Wikipedia data for: ${cityName}`);
    const result = { intro: '', population: null, country: null, wikiUrl: null };

    try {
        // Step 1: Get Wikidata entity by English Wikipedia title
        const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(cityName)}&props=claims|sitelinks&format=json`;
        const wdResponse = await fetch(wdUrl);
        const wdData = await wdResponse.json();

        const entities = wdData.entities || {};
        const entityId = Object.keys(entities).find(id => id !== '-1');

        if (entityId && entities[entityId]) {
            const entity = entities[entityId];
            const claims = entity.claims || {};

            // Population (P1082) — get most recent value
            if (claims.P1082 && claims.P1082.length > 0) {
                const popClaim = claims.P1082[claims.P1082.length - 1];
                const popValue = popClaim?.mainsnak?.datavalue?.value?.amount;
                if (popValue) {
                    result.population = parseInt(popValue.replace('+', ''));
                }
            }

            // Country (P17)
            if (claims.P17 && claims.P17.length > 0) {
                const countryClaim = claims.P17[claims.P17.length - 1];
                const countryEntityId = countryClaim?.mainsnak?.datavalue?.value?.id;
                if (countryEntityId) {
                    // Fetch country name from Wikidata
                    try {
                        const countryUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${countryEntityId}&props=labels&languages=en&format=json`;
                        const countryResp = await fetch(countryUrl);
                        const countryData = await countryResp.json();
                        result.country = countryData.entities?.[countryEntityId]?.labels?.en?.value || null;
                    } catch {}
                }
            }

            // Get Wikipedia URL from sitelinks
            if (entity.sitelinks?.enwiki?.title) {
                result.wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks.enwiki.title)}`;
            }
        }

        // Step 2: Fetch English Wikipedia intro (first 2 sentences)
        await sleep(200);
        const wpUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`;
        const wpResponse = await fetch(wpUrl);
        if (wpResponse.ok) {
            const wpData = await wpResponse.json();
            if (wpData.extract) {
                // Take first 2 sentences
                const sentences = wpData.extract.match(/[^.!?]+[.!?]+/g) || [];
                result.intro = sentences.slice(0, 2).join(' ').trim();
                if (!result.wikiUrl && wpData.content_urls?.desktop?.page) {
                    result.wikiUrl = wpData.content_urls.desktop.page;
                }
            }
        }

    } catch (err) {
        console.log(`    Warning: Could not fetch wiki data for ${cityName}: ${err.message}`);
    }

    // Cache result
    cityWikiCache[cityName] = result;
    saveCityWikiCache();

    return result;
}

function generateCityWikiSection(wikiData) {
    if (!wikiData) return '';

    const facts = [];
    if (wikiData.population) {
        facts.push(`<div class="wiki-fact"><span class="wiki-fact-label">Population</span><span class="wiki-fact-value">${wikiData.population.toLocaleString()}</span></div>`);
    }
    // Country shown in details block, not in wiki facts

    const hasIntro = wikiData.intro && wikiData.intro.trim().length > 0;
    if (facts.length === 0 && !hasIntro) return '';

    let html = '<div class="wiki-section">';
    if (facts.length > 0) {
        html += `\n    <div class="wiki-facts">\n        ${facts.join('\n        ')}\n    </div>`;
    }
    if (hasIntro) {
        html += `\n    <div class="wiki-intro">\n        <p>${wikiData.intro}</p>`;
        if (wikiData.wikiUrl) {
            html += `\n        <p class="wiki-source">Source: <a href="${wikiData.wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>`;
        }
        html += `\n    </div>`;
    }
    html += '\n</div>';
    return html;
}

// ============================================================
// City page generation functions
// ============================================================

function generateCityDetails(cityData, clubsMap) {
    const items = [];

    // Clubs represented
    const clubCount = cityData.clubs.length;
    const countriesCount = cityData.countriesRepresented.size;
    items.push(`<p class="club-info-item">📦 Clubs represented: ${clubCount} club${clubCount !== 1 ? 's' : ''} from ${countriesCount} ${countriesCount !== 1 ? 'countries' : 'country'}</p>`);

    // First and latest found
    const withDates = cityData.stickers.filter(s => s.found).sort((a, b) => new Date(a.found) - new Date(b.found));
    if (withDates.length > 0) {
        const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const first = withDates[0];
        const latest = withDates[withDates.length - 1];
        if (withDates.length > 1) {
            items.push(`<p class="club-info-item">📅 First found: ${fmt(first.found)} | Latest: ${fmt(latest.found)}</p>`);
        } else {
            items.push(`<p class="club-info-item">📅 Found: ${fmt(first.found)}</p>`);
        }
    }

    // Top countries by sticker count in this city
    const countryStickers = {};
    cityData.stickers.forEach(s => {
        const club = clubsMap[s.club_id];
        if (!club) return;
        const cc = club.country?.toUpperCase();
        if (cc) countryStickers[cc] = (countryStickers[cc] || 0) + 1;
    });
    const topCountries = Object.entries(countryStickers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topCountries.length > 0) {
        const countryLinks = topCountries.map(([code, count]) => {
            const name = getCountryName(code);
            return `<a href="/countries/${code}.html">${name}</a> (${count})`;
        });
        items.push(`<p class="club-info-item">🌍 Most common: ${countryLinks.join(', ')}</p>`);
    }

    return items.join('\n');
}

function generateCityStickerGallery(stickers, clubsMap) {
    if (!stickers || stickers.length === 0) {
        return '<p>No stickers found for this city.</p>';
    }
    let html = '';
    stickers.forEach(sticker => {
        const thumbnailUrl = getThumbnailUrl(sticker.image_url);
        const club = clubsMap[sticker.club_id];
        const clubName = club ? stripEmoji(club.name) : 'Unknown club';
        html += `
                <a href="/stickers/${sticker.id}.html" class="sticker-preview-link">
                    <img src="${thumbnailUrl}"
                         alt="${clubName} football sticker #${sticker.id} found in this city"
                         data-sticker-id="${sticker.id}"
                         class="sticker-preview-image"
                         loading="lazy"
                         decoding="async">
                </a>`;
    });
    return html;
}

function generateCityMapSection(stickersWithCoordinates) {
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

function generateCityMapInitScript(stickersWithCoordinates, clubsMap) {
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) {
        return '';
    }
    const avgLat = stickersWithCoordinates.reduce((sum, s) => sum + s.latitude, 0) / stickersWithCoordinates.length;
    const avgLng = stickersWithCoordinates.reduce((sum, s) => sum + s.longitude, 0) / stickersWithCoordinates.length;

    const markers = stickersWithCoordinates.map(sticker => {
        const club = clubsMap[sticker.club_id];
        const clubName = club ? stripEmoji(club.name).replace(/'/g, "\\'") : 'Unknown';
        return `
                (function() {
                    const marker = L.marker([${sticker.latitude}, ${sticker.longitude}]).addTo(cityMap);
                    marker.bindPopup('<div class="nearby-sticker-popup"><strong>${clubName}</strong><a href="/stickers/${sticker.id}.html" class="map-popup-link">View</a></div>');
                    marker.on('mouseover', function() { this.openPopup(); });
                    marker.on('click', function() { this.openPopup(); });
                })();`;
    }).join('\n');

    return `
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof L !== 'undefined' && document.getElementById('club-map')) {
                const cityMap = L.map('club-map').setView([${avgLat}, ${avgLng}], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(cityMap);
                ${markers}
                ${stickersWithCoordinates.length > 1 ? `
                const bounds = L.latLngBounds([
                    ${stickersWithCoordinates.map(s => `[${s.latitude}, ${s.longitude}]`).join(',\n                    ')}
                ]);
                cityMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
                ` : ''}
            }
        });
    `;
}

// ============================================================
// Index page generation
// ============================================================

function generateCityIndexPage(cities) {
    const template = loadTemplate('country-page.html');

    const totalStickers = cities.reduce((sum, c) => sum + c.stickerCount, 0);
    const pageTitle = `Cities — Football Stickers Found Worldwide | StickerHunt`;
    const metaDescription = `Football stickers found in ${cities.length} cities worldwide. Browse ${totalStickers}+ stickers by city location.`;
    const canonicalUrl = `${BASE_URL}/cities/`;
    const keywords = `football stickers cities, sticker locations, street stickers map, football stickers worldwide`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: 'Cities', url: '/cities/' }
    ]);

    // Sort by sticker count descending
    const sorted = [...cities].sort((a, b) => b.stickerCount - a.stickerCount);

    let clubListHtml = '';
    sorted.forEach(city => {
        const countText = `(${city.stickerCount} sticker${city.stickerCount !== 1 ? 's' : ''})`;
        const countryLabel = city.country ? `, ${city.country}` : '';
        clubListHtml += `<li><a href="/cities/${city.slug}.html">${city.name}${countryLabel} ${countText}</a></li>`;
    });

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: 'https://stickerhunt.club/metash.png',
        MULTILINGUAL_META: '',
        FEATURED_STICKERS: '',
        SCHEMA_JSON_LD: '',
        COUNTRY_NAME: 'Cities',
        CLUB_COUNT: cities.length,
        BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: 'Cities', url: '/cities/' }
        ]),
        MAIN_HEADING: `Cities — ${totalStickers} Football Stickers Found Worldwide`,
        CLUB_LIST: clubListHtml
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'cities');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, 'index.html');
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

// ============================================================
// Data fetching
// ============================================================

async function fetchAllStickers() {
    console.log('Fetching all stickers with location data...');
    let allStickers = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('stickers')
            .select('id, club_id, image_url, location, latitude, longitude, found')
            .not('location', 'is', null)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching stickers:', error.message);
            break;
        }

        if (data && data.length > 0) {
            allStickers = allStickers.concat(data);
            offset += PAGE_SIZE;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`  Fetched ${allStickers.length} stickers with location data`);
    return allStickers;
}

async function fetchAllClubs() {
    console.log('Fetching all clubs...');
    let allClubs = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('clubs')
            .select('id, name, country, city')
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching clubs:', error.message);
            break;
        }

        if (data && data.length > 0) {
            allClubs = allClubs.concat(data);
            offset += PAGE_SIZE;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`  Fetched ${allClubs.length} clubs`);
    return allClubs;
}

// ============================================================
// Main
// ============================================================

async function main() {
    console.log('=== StickerHunt City Pages Generator ===\n');

    // Fetch data
    const allStickers = await fetchAllStickers();
    const allClubs = await fetchAllClubs();

    // Build clubs map
    const clubsMap = {};
    allClubs.forEach(club => { clubsMap[club.id] = club; });

    // Group stickers by city name (first part of location before comma)
    const cityGroups = {};
    allStickers.forEach(sticker => {
        if (!sticker.location) return;
        const cityName = sticker.location.split(',')[0].trim();
        if (!cityName) return;

        if (!cityGroups[cityName]) {
            cityGroups[cityName] = [];
        }
        cityGroups[cityName].push(sticker);
    });

    // Filter cities with MIN_STICKERS_PER_CITY+ stickers
    const qualifiedCities = Object.entries(cityGroups)
        .filter(([_, stickers]) => stickers.length >= MIN_STICKERS_PER_CITY)
        .sort((a, b) => b[1].length - a[1].length);

    console.log(`\nFound ${Object.keys(cityGroups).length} unique cities, ${qualifiedCities.length} with ${MIN_STICKERS_PER_CITY}+ stickers\n`);

    // Load wiki cache
    loadCityWikiCache();

    // Prepare output directory
    const outputDir = join(PROJECT_ROOT, 'cities');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const template = loadTemplate('city-page.html');
    const cityIndexData = [];

    // Generate city pages
    for (const [cityName, stickers] of qualifiedCities) {
        const slug = cityToSlug(cityName);
        const stickerCount = stickers.length;

        console.log(`\nGenerating: ${cityName} (${stickerCount} stickers) -> ${slug}.html`);

        // Determine clubs and countries represented
        const clubIds = [...new Set(stickers.map(s => s.club_id))];
        const clubs = clubIds.map(id => clubsMap[id]).filter(Boolean);
        const countriesRepresented = new Set(clubs.map(c => getCountryName(c.country)).filter(Boolean));

        // Determine the city's country from sticker location data (second part after comma)
        const locationCountries = stickers.map(s => s.location?.split(',')[1]?.trim()).filter(Boolean);
        const cityCountry = locationCountries.length > 0 ? locationCountries[0] : null;

        // Fetch Wikipedia data
        const wikiData = await fetchCityWikiData(cityName);
        await sleep(WIKI_API_DELAY_MS);

        // Use our location data for country (Wikidata often returns historical names)
        const resolvedCountry = cityCountry || wikiData.country;

        const cityData = {
            name: cityName,
            slug,
            stickerCount,
            stickers,
            clubs,
            countriesRepresented,
            country: resolvedCountry,
            wikiData
        };

        // Build page data
        const stickerWord = stickerCount !== 1 ? 'Stickers' : 'Sticker';
        const pageTitle = `${cityName} Football Stickers — ${stickerCount} ${stickerWord} Found | StickerHunt`;
        const clubCount = clubs.length;
        const metaDescription = `${stickerCount} football stickers from ${clubCount} clubs found on streets of ${cityName}${resolvedCountry ? `, ${resolvedCountry}` : ''}. Browse the collection and see where they were found.`;
        const canonicalUrl = `${BASE_URL}/cities/${slug}.html`;
        const keywords = `${cityName} football stickers, ${cityName} street stickers, football stickers ${resolvedCountry || ''}, sticker locations ${cityName}`.trim();

        const breadcrumbs = generateBreadcrumbs([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: 'Cities', url: '/cities/' },
            { text: cityName, url: `/cities/${slug}.html` }
        ]);

        const stickersWithCoordinates = stickers.filter(
            s => s.latitude != null && s.longitude != null
        );

        const topCityStickers = selectTopRatedStickers(stickers, 1);
        const ogImage = topCityStickers.length > 0
            ? _getOptimizedImageUrl(topCityStickers[0].image_url)
            : 'https://stickerhunt.club/metash.png';

        // Determine country code from first club for multilingual meta
        const firstClub = Object.values(clubsMap)[0];
        const cityCountryCode = firstClub?.country || null;
        const multilingualMeta = generateMultilingualMeta({
            type: 'city', countryCode: cityCountryCode,
            vars: { city: cityName, count: stickerCount }
        });

        const data = {
            PAGE_TITLE: pageTitle,
            META_DESCRIPTION: metaDescription,
            META_KEYWORDS: keywords,
            CANONICAL_URL: canonicalUrl,
            OG_IMAGE: cleanTrailingQuery(ogImage),
            MULTILINGUAL_META: multilingualMeta,
            CITY_NAME: cityName,
            BREADCRUMBS: breadcrumbs,
            BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
                { text: 'Catalogue', url: '/catalogue.html' },
                { text: 'Cities', url: '/cities/' },
                { text: cityName, url: `/cities/${slug}.html` }
            ]),
            MAIN_HEADING: resolvedCountry
                ? `${cityName}, <a href="/countries/${(getCountryCode(resolvedCountry) || '').toUpperCase()}.html">${resolvedCountry}</a> — ${stickerCount} Football ${stickerWord}`
                : `${cityName} — ${stickerCount} Football ${stickerWord}`,
            WIKI_SECTION: generateCityWikiSection(wikiData),
            CITY_DETAILS: generateCityDetails(cityData, clubsMap),
            STICKER_GALLERY: generateCityStickerGallery(stickers, clubsMap),
            CITY_MAP_SECTION: generateCityMapSection(stickersWithCoordinates),
            CITY_MAP_INIT_SCRIPT: generateCityMapInitScript(stickersWithCoordinates, clubsMap)
        };

        const html = replacePlaceholders(template, data);
        const outputPath = join(outputDir, `${slug}.html`);
        writeFileSync(outputPath, html, 'utf-8');
        console.log(`  -> ${outputPath}`);

        // Collect for index
        cityIndexData.push({
            name: cityName,
            slug,
            stickerCount,
            country: resolvedCountry
        });
    }

    // Generate index page
    console.log('\nGenerating cities index page...');
    const indexPath = generateCityIndexPage(cityIndexData);
    console.log(`  -> ${indexPath}`);

    console.log(`\n=== Done! Generated ${qualifiedCities.length} city pages + 1 index page ===`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
