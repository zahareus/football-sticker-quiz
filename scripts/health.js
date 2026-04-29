#!/usr/bin/env node

/**
 * StickerHunt Health Check — JSON output for external monitoring.
 *
 * Run: node scripts/health.js
 *      npm run health
 *
 * Outputs JSON to stdout with key counts + age-of-state metrics.
 * Exit code:
 *   0  — all green
 *   1  — yellow (warnings: drift between DB and HTML)
 *   2  — red    (sitemap stale > 7 days, missing recent variants)
 *
 * Hook into UptimeRobot/Cloudflare Workers/cron to alert on non-zero exit.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fetchAll(table, select) {
    const PAGE = 1000;
    const out = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).order('id', { ascending: true }).range(offset, offset + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return out;
}

async function main() {
    const stickers = await fetchAll('stickers', 'id, image_url, created_at');
    const clubs = await fetchAll('clubs', 'id, country');

    const stickerHtmls = readdirSync(join(PROJECT_ROOT, 'stickers')).filter(f => f.endsWith('.html')).length;
    const clubHtmls = readdirSync(join(PROJECT_ROOT, 'clubs')).filter(f => f.endsWith('.html')).length;
    const countryHtmls = readdirSync(join(PROJECT_ROOT, 'countries')).filter(f => f.endsWith('.html')).length;
    const cityHtmls = readdirSync(join(PROJECT_ROOT, 'cities')).filter(f => f.endsWith('.html') && f !== 'index.html').length;

    // Sitemap state
    const stickerSitemaps = readdirSync(PROJECT_ROOT).filter(f => /^sitemap-stickers-\d+\.xml$/.test(f)).sort();
    let maxSitemapId = 0;
    let sitemapAgeDays = null;
    if (stickerSitemaps.length > 0) {
        const lastSitemap = readFileSync(join(PROJECT_ROOT, stickerSitemaps[stickerSitemaps.length - 1]), 'utf-8');
        const ids = [...lastSitemap.matchAll(/\/stickers\/(\d+)\.html/g)].map(m => parseInt(m[1]));
        maxSitemapId = ids.length ? Math.max(...ids) : 0;
        const lastmod = lastSitemap.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
        if (lastmod) {
            sitemapAgeDays = Math.round((Date.now() - new Date(lastmod[1]).getTime()) / 86400_000);
        }
    }

    // Missing _web.webp for last 30d (sample 30)
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const recent = stickers.filter(s => s.created_at && s.created_at >= since).slice(-30);
    const missingChecks = await Promise.all(recent.map(async s => {
        if (!s.image_url) return { id: s.id, missing: true };
        const webUrl = s.image_url.replace(/\.[a-z]+$/i, '_web.webp');
        const r = await fetch(webUrl, { method: 'HEAD' });
        return { id: s.id, missing: !r.ok };
    }));
    const missingThumbs30d = missingChecks.filter(c => c.missing).length;

    const maxDbId = stickers.length ? stickers[stickers.length - 1].id : 0;
    const sitemapDriftIds = maxDbId - maxSitemapId;

    const report = {
        ts: new Date().toISOString(),
        db: {
            stickers: stickers.length,
            clubs: clubs.length,
            countries: [...new Set(clubs.map(c => (c.country || '').toUpperCase()).filter(Boolean))].length,
            max_sticker_id: maxDbId
        },
        html: {
            stickers: stickerHtmls,
            clubs: clubHtmls,
            countries: countryHtmls,
            cities: cityHtmls
        },
        drift: {
            stickers: stickers.length - stickerHtmls,
            clubs: clubs.length - clubHtmls
        },
        sitemap: {
            sub_sitemaps_count: stickerSitemaps.length,
            max_sticker_id: maxSitemapId,
            drift_vs_db: sitemapDriftIds,
            age_days: sitemapAgeDays
        },
        images: {
            recent_30d_sampled: recent.length,
            recent_30d_missing_web: missingThumbs30d
        }
    };

    console.log(JSON.stringify(report, null, 2));

    let exitCode = 0;
    const reasons = [];
    if (Math.abs(report.drift.stickers) > 0) { exitCode = Math.max(exitCode, 1); reasons.push('sticker drift'); }
    if (Math.abs(report.drift.clubs) > 0) { exitCode = Math.max(exitCode, 1); reasons.push('club drift'); }
    if (sitemapDriftIds > 5) { exitCode = 2; reasons.push('sitemap drift > 5'); }
    if (sitemapAgeDays !== null && sitemapAgeDays > 7) { exitCode = 2; reasons.push('sitemap stale > 7d'); }
    if (missingThumbs30d > 0) { exitCode = 2; reasons.push(`${missingThumbs30d} missing _web in last 30d`); }

    if (reasons.length) {
        console.error(`\nHealth: ${exitCode === 1 ? 'YELLOW' : 'RED'} — ${reasons.join('; ')}`);
    } else {
        console.error('\nHealth: GREEN');
    }
    process.exit(exitCode);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(3); });
