#!/usr/bin/env node

/**
 * Regenerate club and country pages by club IDs
 * Now with: top-rated OG images, descriptive alt text, multilingual meta, improved schema
 *
 * Usage: node regenerate-club-pages.js <club_ids>
 * Example: node regenerate-club-pages.js 123,456
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import {
    COUNTRY_NAMES, getCountryName, getOptimizedImageUrl, getThumbnailUrl,
    cleanTrailingQuery, stripEmoji, loadTemplate, replacePlaceholders,
    generateBreadcrumbs, generateBreadcrumbSchema,
    selectTopRatedStickers, generateDescriptiveAltText, generateMultilingualMeta,
    generateFeaturedGallery, fetchAllPaginated
} from './seo-helpers.js';

const __scriptsDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__scriptsDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = "https://stickerhunt.club";

const PROJECT_ROOT = join(__scriptsDir, '..');

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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load wiki cache
let wikiCache = {};
try {
    wikiCache = JSON.parse(readFileSync(join(PROJECT_ROOT, 'scripts/wiki-cache.json'), 'utf-8'));
} catch {}

// ─── Wiki Section ────────────────────────────────────────────────────────────

function generateWikiSection(clubId, club, countryName) {
    const wiki = wikiCache[clubId];

    // Meta bar: city, country, founded, stadium, league, website
    const metaItems = [];
    if (club.city) {
        const countryLink = `<a href="/countries/${club.country.toUpperCase()}.html">${countryName}</a>`;
        metaItems.push(`<span class="club-meta-item">${club.city}, ${countryLink}</span>`);
    }
    if (wiki?.founded) metaItems.push(`<span class="club-meta-item">Founded <strong>${wiki.founded}</strong></span>`);
    if (wiki?.stadium) {
        const cap = wiki.capacity ? ` (${wiki.capacity.toLocaleString()})` : '';
        metaItems.push(`<span class="club-meta-item">Stadium <strong>${wiki.stadium}</strong>${cap}</span>`);
    }
    if (wiki?.league) metaItems.push(`<span class="club-meta-item">League <strong>${wiki.league}</strong></span>`);
    if (wiki?.website) {
        try {
            const domain = new URL(wiki.website).hostname.replace('www.', '');
            metaItems.push(`<span class="club-meta-item"><a href="${wiki.website}" target="_blank" rel="noopener noreferrer">${domain}</a></span>`);
        } catch {}
    }

    let html = '';
    if (metaItems.length > 0) {
        html += `<div class="club-meta">\n    ${metaItems.join('\n    ')}\n</div>`;
    }

    // Wiki intro as clean text
    if (wiki?.intro && wiki.intro.trim().length > 0) {
        html += `\n<div class="club-about">\n    <p>${wiki.intro}</p>`;
        if (wiki.wikiUrl) {
            html += `\n    <p class="club-about-source">Source: <a href="${wiki.wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a></p>`;
        } else if (wiki.source === 'ai') {
            html += `\n    <p class="club-about-source">AI-generated description</p>`;
        }
        html += `\n</div>`;
    }

    return html;
}

// ─── Sticker Stats ───────────────────────────────────────────────────────────

function generateStickerStats(stickers) {
    if (!stickers || stickers.length === 0) return '';
    const tags = [];

    const withDates = stickers.filter(s => s.found).sort((a, b) => new Date(a.found) - new Date(b.found));
    if (withDates.length > 0) {
        const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        tags.push(`<span class="club-stat-tag">📅 First found: ${fmt(withDates[0].found)}</span>`);
        if (withDates.length > 1) {
            tags.push(`<span class="club-stat-tag">📅 Latest: ${fmt(withDates[withDates.length - 1].found)}</span>`);
        }
    }

    const cities = [...new Set(stickers.filter(s => s.location).map(s => s.location.split(',')[0].trim()))];
    if (cities.length > 0) {
        const cityLinks = cities.map(city => {
            const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            return `<a href="/cities/${slug}.html">${city}</a>`;
        });
        tags.push(`<span class="club-stat-tag">📍 Found in: ${cityLinks.join(', ')}</span>`);
    }

    if (tags.length === 0) return '';
    return `<div class="club-stats">\n${tags.join('\n')}\n</div>`;
}

// ─── Other Clubs / Club Info / Description ───────────────────────────────────

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
        const countryCode = allClubsInCountry[0]?.country?.toUpperCase();
        html += `\n<li><a href="/countries/${countryCode}.html">View all ${others.length + 1} clubs →</a></li>`;
    }
    html += '\n</ul>\n</div>';
    return html;
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
    const items = [];
    if (club.web) {
        let safeUrl;
        try { safeUrl = encodeURI(decodeURI(club.web)); } catch { safeUrl = club.web; }
        items.push(`<span class="club-stat-tag">🌐 <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${club.web}</a></span>`);
    }
    if (club.media) items.push(`<span class="club-stat-tag">#️⃣ ${club.media}</span>`);
    if (items.length === 0) return '';
    return `<div class="club-stats">${items.join('\n')}</div>`;
}

// ─── Sticker Gallery (with descriptive alt text) ─────────────────────────────

function generateStickerGallery(stickers, clubName, countryName) {
    if (!stickers || stickers.length === 0) {
        return '<p>No stickers found for this club.</p>';
    }
    const club = stripEmoji(clubName);
    let html = '';
    stickers.forEach(sticker => {
        const thumbnailUrl = getThumbnailUrl(sticker.image_url);
        const altText = generateDescriptiveAltText({
            clubName: club,
            stickerId: sticker.id,
            context: 'club',
            countryName: countryName
        });
        html += `
                <a href="/stickers/${sticker.id}.html" class="sticker-preview-link">
                    <img src="${thumbnailUrl}"
                         alt="${altText}"
                         class="sticker-preview-image"
                         loading="lazy"
                         decoding="async">
                </a>`;
    });
    return html;
}

// ─── Map ─────────────────────────────────────────────────────────────────────

function generateClubMapSection(stickersWithCoordinates) {
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) return '';
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
    if (!stickersWithCoordinates || stickersWithCoordinates.length === 0) return '';
    const avgLat = stickersWithCoordinates.reduce((sum, s) => sum + s.latitude, 0) / stickersWithCoordinates.length;
    const avgLng = stickersWithCoordinates.reduce((sum, s) => sum + s.longitude, 0) / stickersWithCoordinates.length;
    const escapedClubName = clubName.replace(/'/g, "\\'");
    const markers = stickersWithCoordinates.map(sticker => `
                (function() {
                    const marker = L.marker([${sticker.latitude}, ${sticker.longitude}]).addTo(clubMap);
                    marker.bindPopup('<div class="nearby-sticker-popup"><strong>${escapedClubName}</strong><a href="/stickers/${sticker.id}.html" class="map-popup-link">View</a></div>');
                    marker.on('mouseover', function() { this.openPopup(); });
                    marker.on('click', function() { this.openPopup(); });
                })();`).join('\n');
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

// ─── Schema ──────────────────────────────────────────────────────────────────

function generateSchemaJsonLd(club, stickers, canonicalUrl, metaDescription, pageTitle) {
    const clubNameClean = stripEmoji(club.name);
    const wiki = wikiCache[club.id];
    const topStickers = selectTopRatedStickers(stickers, 3);

    const schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": pageTitle,
        "description": metaDescription,
        "url": canonicalUrl,
        "about": {
            "@type": "SportsTeam",
            "name": clubNameClean,
            "sport": "Association football"
        },
        "isPartOf": {
            "@type": "WebSite",
            "name": "StickerHunt",
            "url": "https://stickerhunt.club"
        }
    };

    if (wiki) {
        if (wiki.founded) schema.about.foundingDate = wiki.founded;
        if (wiki.website) schema.about.url = wiki.website;
        if (wiki.stadium) {
            schema.about.location = { "@type": "StadiumOrArena", "name": wiki.stadium };
            if (wiki.capacity) {
                schema.about.location.maximumAttendeeCapacity = parseInt(String(wiki.capacity).replace(/[^0-9]/g, ''));
            }
        }
        if (wiki.league) {
            schema.about.memberOf = { "@type": "SportsOrganization", "name": wiki.league };
        }
    }

    // Add top-rated sticker images to schema
    if (topStickers.length > 0) {
        schema.image = topStickers.map(s => ({
            "@type": "ImageObject",
            "contentUrl": cleanTrailingQuery(getOptimizedImageUrl(s.image_url)),
            "thumbnailUrl": cleanTrailingQuery(getThumbnailUrl(s.image_url))
        }));
    }

    return `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2).split('\n').join('\n    ')}\n    </script>`;
}

// ─── Page Generators ─────────────────────────────────────────────────────────

async function generateClubPage(club, stickers, allClubsInCountry = [], stickerCountsByClub = {}) {
    const template = loadTemplate('club-page.html', PROJECT_ROOT);
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

    // Top-rated sticker for OG image (optimized WebP)
    const topStickers = selectTopRatedStickers(stickers, 3);
    const ogImage = topStickers.length > 0
        ? cleanTrailingQuery(getOptimizedImageUrl(topStickers[0].image_url))
        : 'https://stickerhunt.club/metash.png';

    // Multilingual meta
    const wiki = wikiCache[club.id];
    const multilingualMeta = generateMultilingualMeta({
        type: 'club',
        countryCode: club.country,
        vars: { club: clubNameClean, count: stickerCount, country: countryName }
    });

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: ogImage,
        MULTILINGUAL_META: multilingualMeta,
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
        WIKI_SECTION: generateWikiSection(club.id, club, countryName),
        CLUB_INFO: generateClubInfo(club),
        STICKER_STATS: generateStickerStats(stickers),
        CLUB_DESCRIPTION: generateClubDescription(club, stickerCount, countryName),
        STICKER_GALLERY: generateStickerGallery(stickers, club.name, countryName),
        CLUB_MAP_SECTION: generateClubMapSection(stickersWithCoordinates),
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name),
        OTHER_CLUBS: generateOtherClubs(club.id, allClubsInCountry, stickerCountsByClub, countryName),
        SCHEMA_JSON_LD: generateSchemaJsonLd(club, stickers, canonicalUrl, metaDescription, pageTitle)
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'clubs');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${club.id}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

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

    const topStickers = selectTopRatedStickers(countryStickers, 6);
    const ogImage = topStickers.length > 0
        ? cleanTrailingQuery(getOptimizedImageUrl(topStickers[0].image_url))
        : 'https://stickerhunt.club/metash.png';

    const featuredHtml = generateFeaturedGallery(topStickers, allClubsMap, `Top Rated Stickers from ${countryName}`);
    const multilingualMeta = generateMultilingualMeta({
        type: 'country',
        countryCode: countryCode,
        vars: { country: countryName, clubCount: clubs.length, total: totalStickers }
    });

    const clubsWithStickerCounts = clubs.map(club => ({ ...club, stickerCount: stickerCountsByClub[club.id] || 0 }));
    clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));

    let clubListHtml = '';
    clubsWithStickerCounts.forEach(club => {
        const countText = `(${club.stickerCount} sticker${club.stickerCount !== 1 ? 's' : ''})`;
        clubListHtml += `<li><a href="/clubs/${club.id}.html">${club.name} ${countText}</a></li>`;
    });

    const schemaItems = clubs.map((club, i) => ({
        "@type": "ListItem", "position": i + 1,
        "name": stripEmoji(club.name), "url": `${BASE_URL}/clubs/${club.id}.html`
    }));
    const schema = {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": `Football clubs from ${countryName}`, "description": metaDescription,
        "url": canonicalUrl, "numberOfItems": clubs.length, "itemListElement": schemaItems
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
        PAGE_TITLE: pageTitle, META_DESCRIPTION: metaDescription, META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl, OG_IMAGE: ogImage, COUNTRY_NAME: countryName,
        CLUB_COUNT: clubs.length, BREADCRUMBS: breadcrumbs,
        BREADCRUMB_SCHEMA: generateBreadcrumbSchema([
            { text: 'Catalogue', url: '/catalogue.html' },
            { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
        ]),
        MAIN_HEADING: `${countryName} Football Stickers`,
        FEATURED_STICKERS: featuredHtml, MULTILINGUAL_META: multilingualMeta,
        SCHEMA_JSON_LD: schemaJsonLd, CLUB_LIST: clubListHtml
    };

    const html = replacePlaceholders(template, data);
    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function regenerateClubPages() {
    try {
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .in('id', clubIds);

        if (clubsError) throw clubsError;
        if (!clubs || clubs.length === 0) {
            console.log('No clubs found with provided IDs');
            return;
        }

        // Fetch all stickers with rating data (paginated)
        const allStickers = await fetchAllPaginated(supabase, 'stickers', 'id, club_id, image_url, rating, games');

        const stickerCountsByClub = {};
        allStickers.forEach(s => { stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1; });

        // Build clubs map for country pages
        const { data: allClubsList } = await supabase.from('clubs').select('id, name, country').order('name');
        const allClubsMap = {};
        const clubsByCountryMap = {};
        (allClubsList || []).forEach(c => {
            allClubsMap[c.id] = c;
            const cc = c.country.toUpperCase();
            if (!clubsByCountryMap[cc]) clubsByCountryMap[cc] = [];
            clubsByCountryMap[cc].push(c);
        });

        // Group stickers by country for country page gallery
        const stickersByCountry = {};
        allStickers.forEach(s => {
            const club = allClubsMap[s.club_id];
            if (!club) return;
            const cc = club.country.toUpperCase();
            if (!stickersByCountry[cc]) stickersByCountry[cc] = [];
            stickersByCountry[cc].push(s);
        });

        const countriesToRegenerate = new Set();

        for (const club of clubs) {
            console.log(`\n📦 Processing club: ${club.name} (ID: ${club.id})`);

            const { data: clubStickers } = await supabase
                .from('stickers')
                .select('*')
                .eq('club_id', club.id)
                .order('id', { ascending: true });

            const countryClubs = clubsByCountryMap[club.country.toUpperCase()] || [];
            const clubPath = await generateClubPage(club, clubStickers || [], countryClubs, stickerCountsByClub);
            console.log(`  ✓ Generated: ${clubPath}`);

            countriesToRegenerate.add(club.country.toUpperCase());
        }

        for (const countryCode of countriesToRegenerate) {
            console.log(`\n🌍 Regenerating country page: ${countryCode}`);

            const { data: countryClubs } = await supabase
                .from('clubs')
                .select('*')
                .ilike('country', countryCode)
                .order('name');

            if (countryClubs && countryClubs.length > 0) {
                const countryStickers = stickersByCountry[countryCode] || [];
                const countryPath = await generateCountryPage(countryCode, countryClubs, stickerCountsByClub, countryStickers, allClubsMap);
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
