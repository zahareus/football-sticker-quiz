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

import {
    COUNTRY_NAMES, getCountryName as _getCountryName,
    getOptimizedImageUrl as _getOptimizedImageUrl, getThumbnailUrl as _getThumbnailUrl,
    getDetailImageUrl as _getDetailImageUrl, cleanTrailingQuery as _cleanTrailingQuery,
    stripEmoji as _stripEmoji, loadTemplate as _loadTemplate, replacePlaceholders as _replacePlaceholders,
    generateBreadcrumbs as _generateBreadcrumbs, generateBreadcrumbSchema as _generateBreadcrumbSchema,
    selectTopRatedStickers, generateDescriptiveAltText, generateMultilingualMeta,
    generateFeaturedGallery, fetchAllPaginated
} from './seo-helpers.js';

// Load environment variables from scripts dir
const __scriptsDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__scriptsDir, '.env') });

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

// Load wiki cache
let wikiCache = {};
let wikiCacheDirty = false;
try {
    wikiCache = JSON.parse(readFileSync(join(PROJECT_ROOT, 'scripts/wiki-cache.json'), 'utf-8'));
} catch {
    // No cache available
}

/**
 * Auto-fetch wiki data for a club if it has a wikipedia URL but is missing from cache
 */
async function ensureWikiData(club) {
    const clubId = String(club.id);
    if (wikiCache[clubId]) return; // already cached
    if (!club.web || !club.web.includes('wikipedia.org')) return; // no wiki URL

    console.log(`  📚 Fetching Wikipedia data for ${club.name}...`);
    try {
        const url = new URL(club.web);
        const lang = url.hostname.split('.')[0];
        const title = decodeURIComponent(url.pathname.replace('/wiki/', ''));
        const ua = { headers: { 'User-Agent': 'StickerHuntBot/1.0 (https://stickerhunt.club)' }};

        // Get QID via Wikipedia with redirects
        const r1 = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&prop=pageprops&format=json`, ua);
        const d1 = await r1.json();
        const page = Object.values(d1.query?.pages || {})[0];
        const qid = page?.pageprops?.wikibase_item;
        if (!qid) { console.log('    ✗ No Wikidata QID found'); return; }

        // Get Wikidata claims
        const r2 = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims|sitelinks&format=json`, ua);
        const d2 = await r2.json();
        const entity = d2.entities[qid];
        const claims = entity?.claims || {};

        const resolveEntity = async (eid) => {
            const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${eid}&props=labels&languages=en&format=json`, ua);
            const d = await r.json();
            return d.entities[eid]?.labels?.en?.value || null;
        };

        // Founded
        let founded = null;
        if (claims.P571) {
            const t = claims.P571[0]?.mainsnak?.datavalue?.value?.time;
            if (t) founded = t.split('-')[0].replace('+', '');
        }

        // League (current — no end date)
        let league = null;
        if (claims.P118) {
            for (const c of claims.P118) {
                if (!c.qualifiers?.P582) {
                    const lid = c.mainsnak?.datavalue?.value?.id;
                    if (lid) { league = await resolveEntity(lid); break; }
                }
            }
        }

        // Stadium (current — no end date, or latest)
        let stadium = null, capacity = null;
        if (claims.P115) {
            let best = null;
            for (const v of claims.P115) {
                if (!v.qualifiers?.P582) { best = v.mainsnak?.datavalue?.value?.id; break; }
            }
            if (!best) best = claims.P115[claims.P115.length - 1]?.mainsnak?.datavalue?.value?.id;
            if (best) {
                stadium = await resolveEntity(best);
                const sr = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${best}&props=claims&format=json`, ua);
                const sd = await sr.json();
                const cap = sd.entities[best]?.claims?.P1083?.[0]?.mainsnak?.datavalue?.value?.amount;
                if (cap) capacity = parseInt(cap.replace('+', '')).toLocaleString();
            }
        }

        // Website
        let website = claims.P856?.[0]?.mainsnak?.datavalue?.value || null;

        // English intro
        let intro = null;
        const enTitle = entity.sitelinks?.enwiki?.title;
        const introLang = enTitle ? 'en' : lang;
        const introTitle = enTitle || page.title;
        const ir = await fetch(`https://${introLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(introTitle)}&redirects=1&prop=extracts&exintro=true&explaintext=true&format=json`, ua);
        const id2 = await ir.json();
        const ip = Object.values(id2.query?.pages || {})[0];
        if (ip?.extract) {
            const s = ip.extract.split('. ');
            intro = s.slice(0, 2).join('. ') + '.';
        }

        wikiCache[clubId] = { wikiUrl: club.web, intro, founded, stadium, capacity, league, website };
        wikiCacheDirty = true;
        console.log(`    ✓ Cached: ${founded || '-'} | ${stadium || '-'} | ${league || '-'}`);
    } catch (e) {
        console.log(`    ✗ Error: ${e.message}`);
    }
}

function saveWikiCacheIfDirty() {
    if (wikiCacheDirty) {
        writeFileSync(join(PROJECT_ROOT, 'scripts/wiki-cache.json'), JSON.stringify(wikiCache, null, 2));
        console.log('  💾 Wiki cache updated');
    }
}

// Use imported helpers as local names for compatibility
const getOptimizedImageUrl = _getOptimizedImageUrl;
const getDetailImageUrl = _getDetailImageUrl;
const getThumbnailUrl = _getThumbnailUrl;
const getCountryName = _getCountryName;
const cleanTrailingQuery = _cleanTrailingQuery;
const stripEmoji = _stripEmoji;

function loadTemplate(templateName) {
    return _loadTemplate(templateName, PROJECT_ROOT);
}

function replacePlaceholders(template, data) {
    return _replacePlaceholders(template, data);
}

function generateBreadcrumbs(links) {
    return _generateBreadcrumbs(links);
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
            const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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

function generateClubDescription(club, countryName) {
    const clubName = stripEmoji(club.name);
    const city = club.city ? ` from ${club.city}` : '';
    const stickerWord = 'stickers';
    return `<p class="club-description-text">${clubName} is a football club${city}, ${countryName}. This page contains football stickers from ${clubName} found in different cities around the world. Identify your ${clubName} sticker by browsing our collection below.</p>`;
}

function generateBreadcrumbSchema(links) {
    return _generateBreadcrumbSchema(links);
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
    const city = sticker.location.split(',')[0].trim();
    const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `<p class="sticker-detail-location"><a href="/cities/${slug}.html">${sticker.location}</a></p>`;
}

function generateClubMiniCard(club, stickerCount) {
    const wiki = wikiCache[club.id];
    const clubNameClean = stripEmoji(club.name);
    const items = [];

    if (wiki) {
        const facts = [];
        if (wiki.founded) facts.push(`Est. ${wiki.founded}`);
        if (wiki.league) facts.push(wiki.league);
        if (wiki.stadium) facts.push(wiki.stadium);
        if (facts.length > 0) {
            items.push(`<p class="club-info-item">${facts.join(' · ')}</p>`);
        }
    }

    items.push(`<p class="club-info-item"><a href="/clubs/${club.id}.html">View all ${stickerCount} stickers from ${clubNameClean} →</a></p>`);

    return `<div class="club-details-block club-mini-card">\n${items.join('\n')}\n</div>`;
}

function generateMoreFromClub(currentStickerId, clubStickers, clubName) {
    const others = clubStickers.filter(s => s.id !== currentStickerId);
    if (others.length === 0) return '';

    // Take up to 6, spread evenly
    const shown = others.slice(0, 6);
    let html = '<div class="more-from-club">\n<h3>More from ' + stripEmoji(clubName) + '</h3>\n<div class="sticker-strip">';
    shown.forEach(s => {
        const thumbUrl = getThumbnailUrl(s.image_url);
        html += `\n<a href="/stickers/${s.id}.html" class="sticker-strip-item"><img src="${thumbUrl}" alt="Sticker #${s.id}" loading="lazy" decoding="async"></a>`;
    });
    html += '\n</div>\n</div>';
    return html;
}

function generateNearbyStickers(currentSticker, nearbyStickers) {
    if (!nearbyStickers || nearbyStickers.length === 0) return '';

    const shown = nearbyStickers.slice(0, 6);
    const city = currentSticker.location ? currentSticker.location.split(',')[0].trim() : 'this area';
    let html = '<div class="nearby-stickers-section">\n<h3>Also found in ' + city + '</h3>\n<div class="sticker-strip">';
    shown.forEach(s => {
        const thumbUrl = s.image_url ? getThumbnailUrl(s.image_url) : '';
        html += `\n<a href="/stickers/${s.id}.html" class="sticker-strip-item" title="${s.clubName}"><img src="${thumbUrl}" alt="${s.clubName}" loading="lazy" decoding="async"></a>`;
    });
    html += '\n</div>\n</div>';
    return html;
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
            </div>`;
    } else {
        return '';
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
                image_url: sticker.image_url,
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

    // Filter nearby stickers that have coordinates
    const withCoords = nearbyStickers.filter(s => s.latitude && s.longitude);

    let nearbyMarkersCode = '';
    if (withCoords.length > 0) {
        nearbyMarkersCode = withCoords.map(nearby => {
            const escapedClubName = (nearby.clubName || '').replace(/'/g, "\\'").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
            return `
                (function() {
                    L.marker([${nearby.latitude}, ${nearby.longitude}], {
                        icon: L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                            iconSize: [18, 30],
                            iconAnchor: [9, 30],
                            popupAnchor: [1, -25]
                        }),
                        opacity: 0.6
                    }).addTo(map)
                    .bindPopup('<div class="nearby-sticker-popup"><strong>${escapedClubName}</strong><a href="/stickers/${nearby.id}.html" class="map-popup-link">View</a></div>');
                })();`;
        }).join('\n');
    }

    const escapedName = clubName ? clubName.replace(/'/g, "\\'").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim() : 'This sticker';

    return `
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof L !== 'undefined' && document.getElementById('sticker-map')) {
                const map = L.map('sticker-map').setView([${sticker.latitude}, ${sticker.longitude}], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                ${nearbyMarkersCode}

                // Current sticker — larger marker, opened popup
                L.marker([${sticker.latitude}, ${sticker.longitude}], {
                    icon: L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [30, 49],
                        iconAnchor: [15, 49],
                        popupAnchor: [1, -40],
                        shadowSize: [49, 49]
                    }),
                    zIndexOffset: 1000
                }).addTo(map)
                    .bindPopup('<strong>${escapedName}</strong> ← this sticker').openPopup();

                ${withCoords.length > 0 ? `
                const bounds = L.latLngBounds([
                    [${sticker.latitude}, ${sticker.longitude}],
                    ${withCoords.slice(0, 50).map(n => `[${n.latitude}, ${n.longitude}]`).join(',\n                    ')}
                ]);
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
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

function generateStickerGallery(stickers, clubName, countryName) {
    if (!stickers || stickers.length === 0) {
        return '<p>No stickers found for this club.</p>';
    }
    const club = stripEmoji(clubName);
    let html = '';
    stickers.forEach(sticker => {
        const thumbnailUrl = getThumbnailUrl(sticker.image_url);
        const altText = generateDescriptiveAltText({
            clubName: club, stickerId: sticker.id, context: 'club', countryName
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
async function generateStickerPage(sticker, club, prevStickerId, nextStickerId, allStickers = [], clubStickers = []) {
    const template = loadTemplate('sticker-page.html');

    const countryName = getCountryName(club.country);
    const clubNameClean = stripEmoji(club.name);
    const pageTitle = `${clubNameClean} Sticker #${sticker.id} — Identify This Football Sticker | StickerHunt`;
    const metaDescription = `Football sticker #${sticker.id} from ${clubNameClean}, ${countryName}. Can you identify this ${clubNameClean} sticker? Browse our collection.`;
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

    // allStickers = city stickers passed from caller (all stickers from same location)
    const nearbyStickers = allStickers;

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: cleanTrailingQuery(getOptimizedImageUrl(sticker.image_url)),
        STICKER_NAME: `${club.name} Sticker #${sticker.id}`,
        IMAGE_URL: getDetailImageUrl(sticker.image_url),
        THUMBNAIL_URL: getThumbnailUrl(sticker.image_url),
        IMAGE_FULL_URL: sticker.image_url,
        IMAGE_ALT: generateDescriptiveAltText({
            clubName: clubNameClean, stickerId: sticker.id, context: 'sticker',
            countryName: countryName,
            cityName: sticker.location ? sticker.location.split(',')[0].trim() : null,
            league: wikiCache[club.id]?.league
        }),
        MULTILINGUAL_META: generateMultilingualMeta({
            type: 'sticker', countryCode: club.country,
            vars: { club: clubNameClean, id: sticker.id, country: countryName }
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
        CLUB_NAME: club.name,
        DIFFICULTY_VALUE: sticker.difficulty || 1,
        DIFFICULTY: generateDifficulty(sticker),
        ADDED_DATE: generateAddedDate(sticker),
        STICKER_DATE: generateStickerDate(sticker),
        STICKER_LOCATION: generateStickerLocation(sticker),
        NAVIGATION_BUTTONS: generateNavigationButtons(prevStickerId, nextStickerId),
        MAP_SECTION: generateMapSection(sticker),
        MAP_INIT_SCRIPT: generateMapInitScript(sticker, club.name, nearbyStickers),
        CLUB_MINI_CARD: generateClubMiniCard(club, clubStickers.length),
        MORE_FROM_CLUB: generateMoreFromClub(sticker.id, clubStickers, club.name),
        NEARBY_STICKERS: generateNearbyStickers(sticker, nearbyStickers)
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
async function generateClubPage(club, stickers, allClubsInCountry, stickerCountsByClub) {
    const template = loadTemplate('club-page.html');

    const countryName = getCountryName(club.country);
    const clubNameClean = stripEmoji(club.name);
    const stickerCount = stickers ? stickers.length : 0;
    const stickerWord = stickerCount !== 1 ? 'stickers' : 'sticker';
    const pageTitle = `${clubNameClean} Stickers — ${stickerCount} ${stickerWord.charAt(0).toUpperCase() + stickerWord.slice(1)} | StickerHunt`;
    const cityPart = club.city ? ` from ${club.city},` : ' from';
    const metaDescription = `${clubNameClean} —${cityPart} ${countryName}. ${stickerCount} football ${stickerWord} found on streets. Can you identify them? Browse the collection at StickerHunt.`;
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

    // Top-rated sticker for OG image (optimized WebP)
    const topStickers = selectTopRatedStickers(stickers, 3);
    const ogImage = topStickers.length > 0
        ? cleanTrailingQuery(getOptimizedImageUrl(topStickers[0].image_url))
        : 'https://stickerhunt.club/metash.png';

    const multilingualMetaClub = generateMultilingualMeta({
        type: 'club', countryCode: club.country,
        vars: { club: clubNameClean, count: stickerCount, country: countryName }
    });

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: ogImage,
        MULTILINGUAL_META: multilingualMetaClub,
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
        CLUB_DESCRIPTION: generateClubDescription(club, countryName),
        CLUB_INFO: generateClubInfo(club),
        STICKER_GALLERY: generateStickerGallery(stickers, club.name, countryName),
        CLUB_MAP_SECTION: generateClubMapSection(stickersWithCoordinates),
        CLUB_MAP_INIT_SCRIPT: generateClubMapInitScript(stickersWithCoordinates, club.name),
        OTHER_CLUBS: generateOtherClubs(club.id, allClubsInCountry || [], stickerCountsByClub || {}, countryName),
        SCHEMA_JSON_LD: generateSchemaJsonLd(club, stickerCount, canonicalUrl, metaDescription, pageTitle)
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
    const totalStickers = Object.values(stickerCountsByClub).reduce((a, b) => a + b, 0);
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

        // 1b. Auto-fetch wiki data if club has wiki URL but not in cache
        await ensureWikiData(club);

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

        // 3. Fetch all stickers from the same city (for map + nearby section)
        let nearbyStickers = [];
        if (sticker.location) {
            const { data: cityStickers } = await supabase
                .from('stickers')
                .select('id, latitude, longitude, image_url, location, clubs(name)')
                .eq('location', sticker.location)
                .neq('id', stickerId);

            if (cityStickers) {
                nearbyStickers = cityStickers.map(s => ({
                    id: s.id,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    image_url: s.image_url,
                    clubName: s.clubs?.name || 'Unknown Club',
                    distance: 0
                }));
            }
        }

        // 4. Fetch all stickers for this club (needed for sticker page + club page)
        const { data: clubStickers } = await supabase
            .from('stickers')
            .select('*')
            .eq('club_id', club.id)
            .order('id', { ascending: true });

        // 5. Generate sticker page
        console.log('\n🔨 Generating sticker page...');
        const stickerPath = await generateStickerPage(sticker, club, prevStickerId, nextStickerId, nearbyStickers, clubStickers || []);
        console.log(`  ✓ Generated: ${stickerPath}`);

        // 6. Generate club page
        console.log('\n🔨 Generating club page...');

        // Get all clubs for this country (needed for "Other clubs" section + country page)
        const { data: countryClubs } = await supabase
            .from('clubs')
            .select('id, name, country, city, web, media')
            .eq('country', club.country)
            .order('name');

        // Get sticker counts for other clubs section
        let allStickerIds = [];
        let scOffset = 0;
        while (true) {
            const { data: sc } = await supabase.from('stickers').select('club_id').range(scOffset, scOffset + 999);
            if (!sc || sc.length === 0) break;
            allStickerIds = allStickerIds.concat(sc);
            scOffset += 1000;
            if (sc.length < 1000) break;
        }
        const otherClubCounts = {};
        allStickerIds.forEach(s => { otherClubCounts[s.club_id] = (otherClubCounts[s.club_id] || 0) + 1; });

        const clubPath = await generateClubPage(club, clubStickers || [], countryClubs || [], otherClubCounts);
        console.log(`  ✓ Generated: ${clubPath}`);

        // 6. Generate country page
        console.log('\n🔨 Generating country page...');
        const countryCode = club.country.toUpperCase();

        // countryClubs already fetched above, get full data for country page
        const { data: countryClubsFull } = await supabase
            .from('clubs')
            .select('*')
            .eq('country', club.country)
            .order('name');

        // Count stickers per club (with pagination - Supabase limits to 1000)
        let allStickerCounts = [];
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('stickers')
                .select('club_id')
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) {
                console.error('Error fetching sticker counts:', error.message);
                break;
            }

            if (data && data.length > 0) {
                allStickerCounts = allStickerCounts.concat(data);
                offset += PAGE_SIZE;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        const stickerCountsByClub = {};
        allStickerCounts.forEach(s => {
            stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
        });

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

                // Fetch prev sticker's city stickers for map + nearby
                let prevNearby = [];
                if (prevStickerData.location) {
                    const { data: prevCityStickers } = await supabase
                        .from('stickers')
                        .select('id, latitude, longitude, image_url, location, clubs(name)')
                        .eq('location', prevStickerData.location)
                        .neq('id', prevStickerId);
                    if (prevCityStickers) {
                        prevNearby = prevCityStickers.map(s => ({
                            id: s.id, latitude: s.latitude, longitude: s.longitude,
                            image_url: s.image_url, clubName: s.clubs?.name || 'Unknown Club', distance: 0
                        }));
                    }
                }

                // Fetch prev sticker's club stickers for more-from-club
                const { data: prevClubStickers } = await supabase
                    .from('stickers')
                    .select('*')
                    .eq('club_id', prevStickerData.club_id)
                    .order('id', { ascending: true });

                await generateStickerPage(
                    prevStickerData,
                    prevStickerData.clubs,
                    prevPrevSticker?.id || null,
                    stickerId,
                    prevNearby,
                    prevClubStickers || []
                );
                console.log(`  ✓ Updated: stickers/${prevStickerId}.html`);
            }
        }

        // Save wiki cache if updated
        saveWikiCacheIfDirty();

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
