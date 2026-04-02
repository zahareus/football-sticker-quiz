#!/usr/bin/env node

/**
 * AI enrichment for clubs without Wikipedia data
 * Uses Claude API to generate 2-sentence factual intros
 * Saves to wiki-cache.json with source: "ai" marker
 *
 * Usage: node enrich-clubs-ai.js
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __scriptsDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__scriptsDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is required. Set it in environment or scripts/.env');
    process.exit(1);
}

const PROJECT_ROOT = join(__scriptsDir, '..');
const WIKI_CACHE_PATH = join(__scriptsDir, 'wiki-cache.json');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { COUNTRY_NAMES, getCountryName, fetchAllPaginated } from './seo-helpers.js';

// Load wiki cache
let wikiCache = {};
try {
    wikiCache = JSON.parse(readFileSync(WIKI_CACHE_PATH, 'utf-8'));
} catch {}

function saveCache() {
    writeFileSync(WIKI_CACHE_PATH, JSON.stringify(wikiCache, null, 2));
}

// ─── Wikipedia retry for 4 failed clubs ──────────────────────────────────────

async function retryWikipediaFetch(club) {
    if (!club.web || !club.web.includes('wikipedia.org')) return false;

    console.log(`  📚 Retrying Wikipedia for ${club.name}...`);
    try {
        const url = new URL(club.web);
        const lang = url.hostname.split('.')[0];
        const title = decodeURIComponent(url.pathname.replace('/wiki/', ''));
        const ua = { headers: { 'User-Agent': 'StickerHuntBot/1.0 (https://stickerhunt.club)' }};

        const r1 = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&prop=pageprops&format=json`, ua);
        const d1 = await r1.json();
        const page = Object.values(d1.query?.pages || {})[0];
        const qid = page?.pageprops?.wikibase_item;
        if (!qid) { console.log('    ✗ No Wikidata QID'); return false; }

        const r2 = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims|sitelinks&format=json`, ua);
        const d2 = await r2.json();
        const entity = d2.entities[qid];
        const claims = entity?.claims || {};

        const resolveEntity = async (eid) => {
            const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${eid}&props=labels&languages=en&format=json`, ua);
            const d = await r.json();
            return d.entities[eid]?.labels?.en?.value || null;
        };

        let founded = null;
        if (claims.P571) {
            const t = claims.P571[0]?.mainsnak?.datavalue?.value?.time;
            if (t) founded = t.split('-')[0].replace('+', '');
        }

        let league = null;
        if (claims.P118) {
            for (const c of claims.P118) {
                if (!c.qualifiers?.P582) {
                    const lid = c.mainsnak?.datavalue?.value?.id;
                    if (lid) { league = await resolveEntity(lid); break; }
                }
            }
        }

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

        let website = claims.P856?.[0]?.mainsnak?.datavalue?.value || null;

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

        if (!intro && !founded && !stadium && !league) {
            console.log('    ✗ No useful data found');
            return false;
        }

        wikiCache[String(club.id)] = { wikiUrl: club.web, intro, founded, stadium, capacity, league, website };
        saveCache();
        console.log(`    ✓ Wikipedia: ${founded || '-'} | ${stadium || '-'} | ${league || '-'}`);
        return true;
    } catch (e) {
        console.log(`    ✗ Error: ${e.message}`);
        return false;
    }
}

// ─── Claude API enrichment ───────────────────────────────────────────────────

async function enrichWithAI(club) {
    const countryName = getCountryName(club.country);
    const clubName = club.name.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();

    const prompt = `Write a brief factual description for a football club database entry.

Club name: ${clubName}
Country: ${countryName}
City: ${club.city || 'unknown'}
Website/social: ${club.web || club.media || 'none'}

Return ONLY a valid JSON object with these fields:
- "intro": A 2-sentence factual introduction. Include the city, country, and any known facts (founding year, league level, notable history). If you don't know specific facts, write a general but accurate description.
- "founded": The founding year as a number, or null if unknown
- "league": The current league name as a string, or null if unknown
- "stadium": The home stadium name as a string, or null if unknown

Be concise and factual. Do not invent specific statistics or achievements you're not sure about.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API ${response.status}: ${err.slice(0, 200)}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        const result = JSON.parse(jsonMatch[0]);

        if (!result.intro) throw new Error('No intro in response');

        wikiCache[String(club.id)] = {
            source: 'ai',
            intro: result.intro,
            founded: result.founded || null,
            league: result.league || null,
            stadium: result.stadium || null,
            capacity: null,
            website: null,
            wikiUrl: null
        };
        saveCache();
        return true;
    } catch (e) {
        console.log(`    ✗ AI error: ${e.message}`);
        return false;
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🤖 AI Club Enrichment\n');

    // Fetch all clubs
    const { data: clubs, error } = await supabase.from('clubs').select('*').order('name');
    if (error) throw new Error(error.message);

    const cachedIds = new Set(Object.keys(wikiCache));
    const missing = clubs.filter(c => !cachedIds.has(String(c.id)));

    console.log(`Total clubs: ${clubs.length}`);
    console.log(`Already cached: ${cachedIds.size}`);
    console.log(`Missing: ${missing.length}\n`);

    if (missing.length === 0) {
        console.log('✅ All clubs enriched!');
        return;
    }

    // Phase 1: Retry Wikipedia for clubs with wiki URLs
    const withWiki = missing.filter(c => c.web && c.web.includes('wikipedia.org'));
    const withoutWiki = missing.filter(c => !c.web || !c.web.includes('wikipedia.org'));

    console.log(`📚 Phase 1: Retrying Wikipedia (${withWiki.length} clubs with wiki URLs)...\n`);
    let wikiSuccess = 0;
    for (const club of withWiki) {
        const ok = await retryWikipediaFetch(club);
        if (ok) wikiSuccess++;
        await new Promise(r => setTimeout(r, 500)); // rate limit
    }
    console.log(`\n  Wikipedia: ${wikiSuccess}/${withWiki.length} successful\n`);

    // Phase 2: AI enrichment for remaining
    const stillMissing = [...withoutWiki, ...withWiki.filter(c => !wikiCache[String(c.id)])];
    console.log(`🤖 Phase 2: AI enrichment (${stillMissing.length} clubs)...\n`);

    let aiSuccess = 0;
    let aiErrors = 0;
    for (let i = 0; i < stillMissing.length; i++) {
        const club = stillMissing[i];
        const countryName = getCountryName(club.country);
        process.stdout.write(`  [${i + 1}/${stillMissing.length}] ${club.name} (${countryName})...`);

        const ok = await enrichWithAI(club);
        if (ok) {
            aiSuccess++;
            console.log(' ✓');
        } else {
            aiErrors++;
            console.log(' ✗');
        }

        // Rate limit: ~1 req/sec
        if (i < stillMissing.length - 1) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Wikipedia retry: ${wikiSuccess}/${withWiki.length}`);
    console.log(`   AI enrichment: ${aiSuccess}/${stillMissing.length}`);
    if (aiErrors > 0) console.log(`   AI errors: ${aiErrors}`);
    console.log(`   Total cached: ${Object.keys(wikiCache).length}/${clubs.length}`);
}

main().catch(e => {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
});
