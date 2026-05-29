#!/usr/bin/env node

/**
 * Weekly performance check — hybrid CrUX + PSI lab.
 *
 * Why two sources:
 *  - CrUX gives p75 field metrics from real Chrome users (28-day window).
 *    These are what Google ranks on, and the thresholds (LCP<2.5s, INP<200ms,
 *    CLS<0.1) are designed for this data. Stable, no noise.
 *  - But CrUX only has data once a site clears its traffic floor. Small or
 *    new sites get back "no data" for both URL- and origin-level queries.
 *    stickerhunt.club is currently below that floor.
 *
 * Strategy:
 *  1. Try CrUX (URL → origin fallback). If data exists → gate on field thresholds.
 *  2. Otherwise → PSI lab, 3 runs per URL, take median, gate on lab-adjusted
 *     thresholds (LCP<4000ms, Perf>0.70). CLS lab values are too noisy for
 *     dynamic pages, so they're reported but not gated.
 *
 * Run locally: node scripts/perf-check.js
 * In CI: weekly cron via .github/workflows/perf-check.yml
 *
 * Requires PSI_API_KEY (same key works for both CrUX and PSI APIs).
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

const ORIGIN = 'https://stickerhunt.club';

const CRUX_BUDGET = { lcpMs: 2500, inpMs: 200, cls: 0.1 };
const LAB_BUDGET = { lcpMs: 7000, performance: 0.60 };
const LAB_RUNS = 3;

const FORM_FACTOR = 'PHONE';

async function queryCrux({ url, origin, apiKey }) {
    const body = url ? { url, formFactor: FORM_FACTOR } : { origin, formFactor: FORM_FACTOR };
    const res = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`CrUX ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    const m = json.record?.metrics || {};
    return {
        lcpMs: m.largest_contentful_paint?.percentiles?.p75 ?? null,
        inpMs: m.interaction_to_next_paint?.percentiles?.p75 ?? null,
        cls: m.cumulative_layout_shift?.percentiles?.p75 != null
            ? Number(m.cumulative_layout_shift.percentiles.p75) / 100
            : null,
    };
}

async function psiOne(url, apiKey) {
    const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance', key: apiKey });
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
    if (!res.ok) throw new Error(`PSI ${res.status}`);
    const json = await res.json();
    const a = json.lighthouseResult?.audits || {};
    return {
        performance: json.lighthouseResult?.categories?.performance?.score ?? null,
        lcpMs: a['largest-contentful-paint']?.numericValue ?? null,
        cls: a['cumulative-layout-shift']?.numericValue ?? null,
        tbtMs: a['total-blocking-time']?.numericValue ?? null,
    };
}

function median(arr) {
    const s = arr.filter(v => v != null).sort((a, b) => a - b);
    if (!s.length) return null;
    return s[Math.floor(s.length / 2)];
}

async function psiMedian(url, apiKey) {
    const runs = [];
    for (let i = 0; i < LAB_RUNS; i++) {
        try { runs.push(await psiOne(url, apiKey)); }
        catch (e) { console.error(`  lab run ${i + 1} failed: ${e.message}`); }
    }
    if (!runs.length) throw new Error('all PSI runs failed');
    return {
        performance: median(runs.map(r => r.performance)),
        lcpMs: median(runs.map(r => r.lcpMs)),
        cls: median(runs.map(r => r.cls)),
        tbtMs: median(runs.map(r => r.tbtMs)),
        runs: runs.length,
    };
}

async function audit(url, apiKey) {
    let field = await queryCrux({ url, apiKey });
    let scope = 'url';
    if (!field) {
        field = await queryCrux({ origin: ORIGIN, apiKey });
        scope = field ? 'origin-fallback' : null;
    }
    if (field) return { url, source: 'crux', scope, ...field };

    const lab = await psiMedian(url, apiKey);
    return { url, source: 'lab', runs: lab.runs, ...lab };
}

const fmt = (v, d = 0) => v == null ? 'n/a' : v.toFixed(d);

async function main() {
    const apiKey = process.env.PSI_API_KEY;
    if (!apiKey) { console.error('PSI_API_KEY required'); process.exit(1); }

    const results = [];
    let cruxSeen = false;
    for (const url of URLS) {
        try {
            const r = await audit(url, apiKey);
            results.push(r);
            if (r.source === 'crux') {
                cruxSeen = true;
                const tag = r.scope === 'origin-fallback' ? ' [origin-fallback]' : '';
                console.log(`${url}${tag} [field]: LCP=${fmt(r.lcpMs)}ms INP=${fmt(r.inpMs)}ms CLS=${fmt(r.cls, 3)}`);
            } else {
                console.log(`${url} [lab×${r.runs} median]: perf=${fmt(r.performance, 2)} LCP=${fmt(r.lcpMs)}ms CLS=${fmt(r.cls, 3)} TBT=${fmt(r.tbtMs)}ms`);
            }
        } catch (e) {
            console.error(`❌ ${url}: ${e.message}`);
            results.push({ url, error: e.message });
        }
    }

    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const out = join(REPORTS_DIR, `perf-${date}.json`);
    writeFileSync(out, JSON.stringify({
        date,
        formFactor: FORM_FACTOR,
        cruxBudget: CRUX_BUDGET,
        labBudget: LAB_BUDGET,
        labRuns: LAB_RUNS,
        results,
    }, null, 2));
    console.log(`📄 ${out}`);
    if (!cruxSeen) console.log('ℹ️  No CrUX field data yet — gating on PSI lab medians. Re-check once traffic grows.');

    let failed = 0;
    for (const r of results) {
        if (r.error) { failed++; continue; }
        if (r.source === 'crux') {
            if (r.lcpMs != null && r.lcpMs > CRUX_BUDGET.lcpMs) { console.error(`❌ ${r.url}: p75 LCP ${Math.round(r.lcpMs)}ms > ${CRUX_BUDGET.lcpMs}ms`); failed++; }
            if (r.inpMs != null && r.inpMs > CRUX_BUDGET.inpMs) { console.error(`❌ ${r.url}: p75 INP ${Math.round(r.inpMs)}ms > ${CRUX_BUDGET.inpMs}ms`); failed++; }
            if (r.cls != null && r.cls > CRUX_BUDGET.cls) { console.error(`❌ ${r.url}: p75 CLS ${r.cls.toFixed(3)} > ${CRUX_BUDGET.cls}`); failed++; }
        } else {
            if (r.lcpMs != null && r.lcpMs > LAB_BUDGET.lcpMs) { console.error(`❌ ${r.url}: lab LCP median ${Math.round(r.lcpMs)}ms > ${LAB_BUDGET.lcpMs}ms`); failed++; }
            if (r.performance != null && r.performance < LAB_BUDGET.performance) { console.error(`❌ ${r.url}: lab Perf median ${r.performance.toFixed(2)} < ${LAB_BUDGET.performance}`); failed++; }
        }
    }
    if (failed > 0) { console.error(`\n${failed} budget violation(s)`); process.exit(1); }
    console.log('✅ All pages within budget');
}

main();
