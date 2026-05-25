#!/usr/bin/env node

/**
 * Critical CSS extractor.
 *
 * Reads style.css and extracts only the rules needed for above-the-fold
 * rendering on all templates (header + hero/h1 + buttons + base reset).
 *
 * Output: templates/_critical/critical.css
 *
 * The output is inlined via {{CRITICAL_CSS}} placeholder by every generator
 * that emits HTML, so the LCP-blocking style.css can be loaded async without
 * FOUC for above-the-fold elements.
 *
 * Run automatically by `npm run generate` (and any other generator entry
 * points). Also runnable standalone: `node scripts/build-critical-css.js`.
 *
 * Idempotent. Deterministic — the allowlist below is the contract.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const STYLE_CSS = join(ROOT, 'style.css');
const OUT_DIR = join(ROOT, 'templates', '_critical');
const OUT_FILE = join(OUT_DIR, 'critical.css');

// Selectors / blocks that contribute to above-the-fold rendering across
// every template (home, sticker, club, country, city). Keep this list
// minimal — every byte here is inlined into every HTML page.
const ALLOW = [
    // base reset + variables
    /^:root\b/,
    /^\*,\s*\*::before,\s*\*::after\b/,
    /^html\b/,
    /^body\b/,
    /^body:not\(\.logged-out\)\s+\.app-header\b/,
    /^body\.logged-out\s+\.app-header\b/,
    /^body\.logged-out\s+#auth-section\b/,
    /^body\.logged-out\s+#app-logo\b/,
    /^body\.home-page\s+\.app-header\b/,
    /^body\.home-page\s+\.logo-container\b/,
    /^body\.home-page\s+#app-logo\b/,
    /^body\.home-page\s+#auth-section\b/,
    /^h1\b/,
    /^h2\b/,
    /^p\b/,
    /^img\b/,
    /^button\b/,
    /^input\[type="text"\]/,
    /^ol,\s*ul\b/,
    // header
    /^\.app-header\b/,
    /^\.logo-container\b/,
    /^#app-logo\b/,
    /^#auth-section\b/,
    /^#user-status\b/,
    /^#user-nickname\b/,
    // buttons (used in hero CTAs)
    /^\.btn\b/,
    /^\.btn-primary\b/,
    /^\.btn-secondary\b/,
    /^\.btn-large\b/,
    /^\.btn-link\b/,
    // homepage hero
    /^\.hp-hero\b/,
    /^\.hp-hero\s+h1\b/,
    /^\.hp-hero-stats\b/,
    /^\.hp-hero-ctas\b/,
    /^\.hp-search-wrapper\b/,
    /^\.hp-search-input\b/,
    /^\.hp-text-link\b/,
    /^\.hp-divider\b/,
    /^\.hp-section\b/,
    // catalogue/sticker hero (above-fold on those templates)
    /^\.cat-hero\b/,
    /^\.sticker-page\b/,
    // sticker detail: reserve space to prevent CLS from JS-loaded rating/answer rate
    /^\.sticker-detail-info-block\b/,
    /^#rating-value\b/,
    /^#rating-rank\b/,
    /^#answer-rate-value\b/,
];

// Whole @media blocks are kept if any selector inside matches the allowlist
// (we just keep the entire media block to avoid mismatched braces).

function extractRules(css) {
    // Strip comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');

    const out = [];
    let i = 0;
    const n = css.length;

    function readBlock(start) {
        // start is at '{'
        let depth = 1;
        let j = start + 1;
        while (j < n && depth > 0) {
            if (css[j] === '{') depth++;
            else if (css[j] === '}') depth--;
            j++;
        }
        return j; // position after closing '}'
    }

    while (i < n) {
        // skip whitespace
        while (i < n && /\s/.test(css[i])) i++;
        if (i >= n) break;

        // detect at-rules (@media, @supports, @keyframes, etc.)
        if (css[i] === '@') {
            // find first '{' or ';' (e.g., @import, @charset end with ';')
            let k = i;
            while (k < n && css[k] !== '{' && css[k] !== ';') k++;
            if (k >= n) break;
            const prelude = css.slice(i, k).trim();
            if (css[k] === ';') { i = k + 1; continue; }

            const endBlock = readBlock(k);
            const fullBlock = css.slice(i, endBlock);

            if (/^@media\b/.test(prelude)) {
                // Extract inner rules and check if any matches allowlist
                const inner = css.slice(k + 1, endBlock - 1);
                const innerKept = extractRules(inner);
                if (innerKept.trim().length > 0) {
                    out.push(`${prelude} {\n${innerKept}\n}`);
                }
            }
            // skip @keyframes, @supports, @font-face — not needed above-fold
            i = endBlock;
            continue;
        }

        // selector { ... }
        let k = i;
        while (k < n && css[k] !== '{' && css[k] !== '}') k++;
        if (k >= n || css[k] === '}') { i = k + 1; continue; }

        const selectorRaw = css.slice(i, k).trim();
        const endBlock = readBlock(k);
        const body = css.slice(k, endBlock); // includes braces

        // selectors can be comma-separated; keep rule if ANY selector matches allowlist
        const selectors = selectorRaw.split(',').map(s => s.trim()).filter(Boolean);
        const matches = selectors.some(sel => ALLOW.some(re => re.test(sel)));
        if (matches) {
            out.push(`${selectorRaw} ${body}`);
        }
        i = endBlock;
    }

    return out.join('\n');
}

function build() {
    const css = readFileSync(STYLE_CSS, 'utf8');
    const extracted = extractRules(css);

    // Minify lightly: collapse runs of whitespace to single space, except newlines
    const minified = extracted
        .replace(/\s*\n\s*/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s*([{};:,])\s*/g, '$1')
        .replace(/;}/g, '}');

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, minified);

    const sizeKb = (Buffer.byteLength(minified, 'utf8') / 1024).toFixed(1);
    console.log(`✅ critical.css written: ${sizeKb} KB → ${OUT_FILE}`);
}

build();
