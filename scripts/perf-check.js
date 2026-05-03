#!/usr/bin/env node

/**
 * Weekly performance check via PageSpeed Insights API.
 *
 * Runs mobile audits on key pages, prints metrics, fails if mobile LCP > 2.5s
 * or Performance score < 85. Output saved to seo-reports/perf-YYYY-MM-DD.json.
 *
 * Run locally: node scripts/perf-check.js
 * In CI: weekly cron via .github/workflows/perf-check.yml
 *
 * Optional: PSI_API_KEY env var raises rate limit; without it the public
 * unauthenticated endpoint is used (slower, ~25/day).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORTS_DIR = join(ROOT, 'seo-reports');

const URLS = [
    'https://stickerhunt.club/',
    'https://stickerhunt.club/stickers/3201.html',
    'https://stickerhunt.club/clubs/695.html',
];

const BUDGET = {
    lcpMs: 2500,
    performance: 0.85,
};

async function audit(url) {
    const apiKey = process.env.PSI_API_KEY;
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' });
    if (apiKey) params.set('key', apiKey);
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`PSI ${res.status} for ${url}`);
    const json = await res.json();

    const audits = json.lighthouseResult?.audits || {};
    const lcpMs = audits['largest-contentful-paint']?.numericValue ?? null;
    const performance = json.lighthouseResult?.categories?.performance?.score ?? null;
    const cls = audits['cumulative-layout-shift']?.numericValue ?? null;
    const tbtMs = audits['total-blocking-time']?.numericValue ?? null;

    return { url, performance, lcpMs, cls, tbtMs };
}

async function main() {
    const results = [];
    for (const url of URLS) {
        try {
            const r = await audit(url);
            results.push(r);
            console.log(`${url}: perf=${r.performance} LCP=${Math.round(r.lcpMs)}ms CLS=${r.cls?.toFixed(3)} TBT=${Math.round(r.tbtMs)}ms`);
        } catch (e) {
            console.error(`❌ ${url}: ${e.message}`);
            results.push({ url, error: e.message });
        }
    }

    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const out = join(REPORTS_DIR, `perf-${date}.json`);
    writeFileSync(out, JSON.stringify({ date, budget: BUDGET, results }, null, 2));
    console.log(`📄 ${out}`);

    let failed = 0;
    for (const r of results) {
        if (r.error) { failed++; continue; }
        if (r.lcpMs > BUDGET.lcpMs) { console.error(`❌ ${r.url}: LCP ${Math.round(r.lcpMs)}ms > ${BUDGET.lcpMs}ms`); failed++; }
        if (r.performance < BUDGET.performance) { console.error(`❌ ${r.url}: Perf ${r.performance} < ${BUDGET.performance}`); failed++; }
    }
    if (failed > 0) {
        console.error(`\n${failed} budget violation(s)`);
        process.exit(1);
    }
    console.log('✅ All pages within budget');
}

main();
