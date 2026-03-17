#!/usr/bin/env node

/**
 * Fetch Wikipedia/Wikidata enrichment data for clubs
 * Fetches: founded year, stadium (most recent), capacity, league, official website, intro text
 * Saves to wiki-cache.json for use by page generators
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CACHE_PATH = join(__dirname, 'wiki-cache.json');

// Wikipedia API requires a User-Agent header
const HEADERS = {
    'User-Agent': 'StickerHuntBot/1.0 (https://stickerhunt.club; zahareus@gmail.com) Node.js',
    'Accept': 'application/json'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry and rate-limit handling
 */
async function fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const resp = await fetch(url, { headers: HEADERS });

            // Check for rate limiting
            if (resp.status === 429 || resp.status === 503) {
                const retryAfter = parseInt(resp.headers.get('retry-after') || '5');
                const waitMs = Math.max(retryAfter * 1000, 5000) * (attempt + 1);
                console.log(`  Rate limited, waiting ${waitMs/1000}s...`);
                await delay(waitMs);
                continue;
            }

            // Check content type - rate limit responses are plain text
            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('json')) {
                const text = await resp.text();
                if (text.includes('too many requests') || text.includes('rate')) {
                    const waitMs = 5000 * (attempt + 1);
                    console.log(`  Rate limited (text), waiting ${waitMs/1000}s...`);
                    await delay(waitMs);
                    continue;
                }
                return null; // Not JSON and not rate limit - skip
            }

            return await resp.json();
        } catch (err) {
            if (attempt < maxRetries) {
                await delay(2000 * (attempt + 1));
                continue;
            }
            throw err;
        }
    }
    return null;
}

/**
 * Extract Wikipedia article title and language from URL
 */
function parseWikiUrl(url) {
    try {
        const parsed = new URL(url);
        const match = parsed.hostname.match(/^(\w+)\.wikipedia\.org$/);
        if (!match) return null;
        const lang = match[1];
        const pathMatch = parsed.pathname.match(/^\/wiki\/(.+)$/);
        if (!pathMatch) return null;
        const title = decodeURIComponent(pathMatch[1]);
        return { lang, title };
    } catch {
        return null;
    }
}

/**
 * Get Wikidata QID from a Wikipedia page
 */
async function getWikidataQID(lang, title) {
    try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return null;
        const pages = data.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        return page?.pageprops?.wikibase_item || null;
    } catch {
        return null;
    }
}

/**
 * Parse a Wikidata time value to extract year
 */
function parseWikidataYear(timeValue) {
    if (!timeValue) return null;
    const match = timeValue.match(/^[+-]?(\d{4})/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Parse a Wikidata time value to a comparable date string
 */
function parseWikidataDate(timeValue) {
    if (!timeValue) return null;
    const match = timeValue.match(/^[+-]?(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

/**
 * Get entity label (resolve QID to human-readable name)
 */
async function getEntityLabel(entityId) {
    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=labels&languages=en&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return null;
        return data.entities?.[entityId]?.labels?.en?.value || null;
    } catch {
        return null;
    }
}

/**
 * Get stadium capacity from stadium entity
 */
async function getStadiumCapacity(stadiumEntityId) {
    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${stadiumEntityId}&props=claims&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return null;
        const claims = data.entities?.[stadiumEntityId]?.claims;
        if (!claims) return null;

        const capacityClaims = claims['P1083'];
        if (!capacityClaims || capacityClaims.length === 0) return null;

        let bestCapacity = null;
        let bestRank = -1;
        const rankOrder = { deprecated: 0, normal: 1, preferred: 2 };

        for (const claim of capacityClaims) {
            const rank = rankOrder[claim.rank] || 0;
            if (rank >= bestRank) {
                const amount = claim.mainsnak?.datavalue?.value?.amount;
                if (amount) {
                    bestRank = rank;
                    bestCapacity = parseInt(amount.replace('+', ''));
                }
            }
        }

        return bestCapacity;
    } catch {
        return null;
    }
}

/**
 * Fetch Wikidata properties for a club entity
 */
async function fetchWikidataProps(qid) {
    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return {};
        const claims = data.entities?.[qid]?.claims;
        if (!claims) return {};

        const result = {};

        // P571 = founded (inception)
        const foundedClaims = claims['P571'];
        if (foundedClaims && foundedClaims.length > 0) {
            const timeValue = foundedClaims[0].mainsnak?.datavalue?.value?.time;
            result.founded = parseWikidataYear(timeValue);
        }

        // P115 = stadium (home venue)
        const stadiumClaims = claims['P115'];
        if (stadiumClaims && stadiumClaims.length > 0) {
            let bestStadium = null;
            let bestDate = null;

            for (const claim of stadiumClaims) {
                const stadiumId = claim.mainsnak?.datavalue?.value?.id;
                if (!stadiumId) continue;

                const qualifiers = claim.qualifiers || {};
                const startDates = qualifiers['P580'];
                const endDates = qualifiers['P582'];
                const hasEndDate = endDates && endDates.length > 0;

                let startDate = null;
                if (startDates && startDates.length > 0) {
                    startDate = parseWikidataDate(startDates[0].datavalue?.value?.time);
                }

                if (!hasEndDate) {
                    if (bestStadium === null || (startDate && (!bestDate || startDate > bestDate))) {
                        bestStadium = stadiumId;
                        bestDate = startDate;
                    } else if (!startDate && bestStadium === null) {
                        bestStadium = stadiumId;
                    }
                } else if (bestStadium === null) {
                    if (startDate && (!bestDate || startDate > bestDate)) {
                        bestStadium = stadiumId;
                        bestDate = startDate;
                    }
                }
            }

            if (!bestStadium && stadiumClaims.length > 0) {
                const lastClaim = stadiumClaims[stadiumClaims.length - 1];
                bestStadium = lastClaim.mainsnak?.datavalue?.value?.id;
            }

            if (bestStadium) {
                result._stadiumEntityId = bestStadium;
            }
        }

        // P118 = league
        const leagueClaims = claims['P118'];
        if (leagueClaims && leagueClaims.length > 0) {
            let bestLeague = null;
            for (const claim of leagueClaims) {
                const leagueId = claim.mainsnak?.datavalue?.value?.id;
                if (!leagueId) continue;
                const endDates = claim.qualifiers?.['P582'];
                if (!endDates || endDates.length === 0) {
                    bestLeague = leagueId;
                }
            }
            if (!bestLeague && leagueClaims.length > 0) {
                bestLeague = leagueClaims[leagueClaims.length - 1].mainsnak?.datavalue?.value?.id;
            }
            if (bestLeague) {
                result._leagueEntityId = bestLeague;
            }
        }

        // P856 = official website
        const websiteClaims = claims['P856'];
        if (websiteClaims && websiteClaims.length > 0) {
            let bestWebsite = null;
            for (const claim of websiteClaims) {
                if (claim.rank === 'preferred') {
                    bestWebsite = claim.mainsnak?.datavalue?.value;
                    break;
                }
                bestWebsite = claim.mainsnak?.datavalue?.value;
            }
            result.website = bestWebsite;
        }

        return result;
    } catch (err) {
        console.error(`  Error fetching Wikidata props for ${qid}:`, err.message);
        return {};
    }
}

/**
 * Fetch Wikipedia intro text (first 2 sentences)
 */
async function fetchWikiIntro(lang, title, qid) {
    try {
        let introLang = lang;
        let introTitle = title;

        if (lang !== 'en' && qid) {
            const enTitle = await getEnglishSitelink(qid);
            if (enTitle) {
                introLang = 'en';
                introTitle = enTitle;
            }
        }

        const url = `https://${introLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(introTitle)}&prop=extracts&exintro=1&explaintext=1&exsentences=2&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return null;
        const pages = data.query?.pages;
        if (!pages) return null;
        const page = Object.values(pages)[0];
        const extract = page?.extract;
        if (!extract || extract.trim().length === 0) return null;
        return extract.trim();
    } catch {
        return null;
    }
}

/**
 * Get English Wikipedia title from Wikidata QID via sitelinks
 */
async function getEnglishSitelink(qid) {
    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json`;
        const data = await fetchWithRetry(url);
        if (!data) return null;
        return data.entities?.[qid]?.sitelinks?.enwiki?.title || null;
    } catch {
        return null;
    }
}

/**
 * Fetch all clubs with Wikipedia URLs from Supabase (with pagination)
 */
async function fetchClubsWithWiki() {
    const PAGE_SIZE = 1000;
    let allClubs = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('clubs')
            .select('id, name, web')
            .like('web', '%wikipedia.org%')
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

    return allClubs;
}

async function main() {
    console.log('Fetching clubs with Wikipedia URLs from Supabase...');
    const clubs = await fetchClubsWithWiki();
    console.log(`Found ${clubs.length} clubs with Wikipedia URLs\n`);

    // Load existing cache to preserve data for clubs we might skip on error
    let cache = {};
    if (existsSync(CACHE_PATH)) {
        try {
            cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
            console.log(`Loaded existing cache with ${Object.keys(cache).length} entries\n`);
        } catch {
            cache = {};
        }
    }

    let processed = 0;
    let enriched = 0;
    let skippedCached = 0;

    // Save cache periodically (every 50 clubs)
    const saveInterval = 50;

    for (const club of clubs) {
        processed++;

        // Skip clubs already in cache
        if (cache[club.id]) {
            skippedCached++;
            continue;
        }

        const parsed = parseWikiUrl(club.web);
        if (!parsed) {
            console.log(`[${processed}/${clubs.length}] ${club.name} — invalid wiki URL: ${club.web}`);
            continue;
        }

        console.log(`[${processed}/${clubs.length}] ${club.name} (${parsed.lang}.wikipedia.org)...`);

        try {
            // Step 1: Get Wikidata QID
            await delay(500);
            const qid = await getWikidataQID(parsed.lang, parsed.title);
            if (!qid) {
                console.log(`  No Wikidata QID found, skipping`);
                continue;
            }

            // Step 2: Fetch Wikidata properties
            await delay(500);
            const props = await fetchWikidataProps(qid);

            const entry = {
                wikiUrl: club.web
            };

            if (props.founded) entry.founded = props.founded;
            if (props.website) entry.website = props.website;

            // Step 3: Resolve stadium name and get capacity
            if (props._stadiumEntityId) {
                await delay(500);
                const stadiumName = await getEntityLabel(props._stadiumEntityId);
                if (stadiumName) {
                    entry.stadium = stadiumName;

                    await delay(500);
                    const capacity = await getStadiumCapacity(props._stadiumEntityId);
                    if (capacity) entry.capacity = capacity;
                }
            }

            // Step 4: Resolve league name
            if (props._leagueEntityId) {
                await delay(500);
                const leagueName = await getEntityLabel(props._leagueEntityId);
                if (leagueName) entry.league = leagueName;
            }

            // Step 5: Fetch Wikipedia intro
            await delay(500);
            const intro = await fetchWikiIntro(parsed.lang, parsed.title, qid);
            if (intro) entry.intro = intro;

            // Only save if we got at least some data
            if (Object.keys(entry).length > 1) {
                cache[club.id] = entry;
                enriched++;
                const fields = Object.keys(entry).filter(k => k !== 'wikiUrl').join(', ');
                console.log(`  OK: ${fields}`);
            } else {
                console.log(`  No useful data found`);
            }

        } catch (err) {
            console.error(`  Error: ${err.message}`);
        }

        // Periodic save
        if (processed % saveInterval === 0) {
            writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
            console.log(`  [Saved cache: ${Object.keys(cache).length} entries]`);
        }
    }

    // Final save
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`\nDone! Enriched ${enriched} new clubs (${skippedCached} already cached)`);
    console.log(`Cache saved to ${CACHE_PATH} (${Object.keys(cache).length} total entries)`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
