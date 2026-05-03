#!/usr/bin/env node

/**
 * One-shot patcher: applies critical-CSS inlining + logo.webp + script defers
 * to all already-generated HTML files (4178 generated + 16 static root pages).
 *
 * Templates and generators are already updated; this patcher exists so the
 * fix lands immediately without regenerating thousands of pages.
 *
 * Idempotent — running twice is a no-op on already-patched files.
 *
 * Run: node scripts/perf-critical-css-images.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Build critical.css fresh, then load it
import('./build-critical-css.js').catch(() => {});

const CRITICAL_CSS_PATH = join(ROOT, 'templates', '_critical', 'critical.css');
if (!existsSync(CRITICAL_CSS_PATH)) {
    console.error('❌ critical.css missing. Run: node scripts/build-critical-css.js');
    process.exit(1);
}
const CRITICAL_CSS = readFileSync(CRITICAL_CSS_PATH, 'utf8');

const STYLE_BLOCK = `<!-- Inlined critical CSS (above-the-fold). Generated from style.css by scripts/build-critical-css.js -->
<style>${CRITICAL_CSS}</style>
<!-- Full stylesheet loaded async (non-blocking) -->
<link rel="preload" href="/style.css?v=5" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/style.css?v=5"></noscript>`;

const REPLACEMENTS = [
    // Blocking style.css → critical CSS inline + async preload
    // Matches "/style.css", "style.css", with or without ?v=N
    {
        match: /<link rel="stylesheet" href="\/?style\.css(?:\?v=\d+)?">/g,
        replace: STYLE_BLOCK,
        skipIfPresent: 'Inlined critical CSS'
    },
    // Header logo.png → logo.webp with intrinsic dimensions and fetchpriority
    {
        match: /<a href="\/index\.html"><img src="\/logo\.png" alt="StickerHunt Logo" id="app-logo"><\/a>/g,
        replace: '<a href="/index.html"><img src="/logo.webp" alt="StickerHunt Logo" id="app-logo" width="280" height="71" fetchpriority="high"></a>'
    },
    // Footer logo.png → logo.webp with dimensions
    {
        match: /<img src="\/logo\.png" alt="StickerHunt" style="height:14px;width:auto;">/g,
        replace: '<img src="/logo.webp" alt="StickerHunt" width="55" height="14" loading="lazy" decoding="async" style="height:14px;width:auto;">'
    },
    // Defer Supabase CDN
    {
        match: /<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2)"><\/script>/g,
        replace: '<script defer src="$1"></script>'
    },
    // Defer shared.js
    {
        match: /<script src="\/shared\.js"><\/script>/g,
        replace: '<script defer src="/shared.js"></script>'
    },
    // Defer index-static.js (homepage only)
    {
        match: /<script src="\/index-static\.js"><\/script>/g,
        replace: '<script defer src="/index-static.js"></script>'
    },
    // Sticker thumbnail width/height — match `<img ... loading="lazy" decoding="async">` without width/height
    // Heuristic: only inside hp-sticker-card or sticker-strip-item anchor preceding the img
    // Skipping per-sticker thumbs in this patcher to keep it safe — generators will re-emit on next regen.
];

function patchFile(path) {
    let html = readFileSync(path, 'utf8');
    const original = html;
    for (const r of REPLACEMENTS) {
        if (r.skipIfPresent && html.includes(r.skipIfPresent)) continue;
        html = html.replace(r.match, r.replace);
    }
    if (html !== original) {
        writeFileSync(path, html);
        return true;
    }
    return false;
}

function walk(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'templates' || entry === 'scripts' || entry === 'tests' || entry === 'docs' || entry === 'seo-reports') continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...walk(full));
        else if (entry.endsWith('.html')) out.push(full);
    }
    return out;
}

function main() {
    const files = walk(ROOT);
    let changed = 0;
    let scanned = 0;
    for (const f of files) {
        scanned++;
        if (patchFile(f)) changed++;
    }
    console.log(`✅ Scanned ${scanned} HTML files, patched ${changed}`);
}

main();
