import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

const TEMPLATES = [
    'templates/index-page.html',
    'templates/sticker-page.html',
    'templates/club-page.html',
    'templates/country-page.html',
    'templates/city-page.html',
];

// Sample of generated pages — covers all four kinds.
const SAMPLES = [
    'index.html',
    'about.html',
    'battle.html',
    'catalogue.html',
];

const ALL = [...TEMPLATES, ...SAMPLES];

describe('perf budget — head', () => {
    it('critical.css is built and < 25 KB', () => {
        const p = join(ROOT, 'templates/_critical/critical.css');
        expect(existsSync(p), 'critical.css missing — run scripts/build-critical-css.js').toBe(true);
        const size = statSync(p).size;
        expect(size).toBeLessThan(25 * 1024);
    });

    it.each(ALL)('%s has inline critical CSS', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        expect(html, `${rel}: missing inline critical CSS`).toMatch(/Inlined critical CSS/);
    });

    it.each(ALL)('%s loads style.css async (preload+onload, not blocking link)', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        // Strip <noscript> fallback (the blocking link inside is intentional and harmless)
        const stripped = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
        // Outside <noscript>, the blocking <link rel="stylesheet" href="...style.css"> must not appear
        expect(stripped).not.toMatch(/<link rel="stylesheet" href="\/?style\.css(\?v=\d+)?">/);
        // Has the async preload pattern
        expect(stripped).toMatch(/<link rel="preload" href="\/style\.css\?v=\d+" as="style" onload=/);
    });
});

describe('perf budget — images', () => {
    it.each(ALL)('%s uses logo.webp not logo.png', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        expect(html, `${rel}: still references logo.png`).not.toMatch(/src="\/?logo\.png"/);
    });

    it.each(TEMPLATES)('%s app-logo has explicit width and height', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        // Find the header logo
        const m = html.match(/<img[^>]+id="app-logo"[^>]*>/);
        expect(m, `${rel}: app-logo <img> not found`).not.toBeNull();
        expect(m[0]).toMatch(/width="\d+"/);
        expect(m[0]).toMatch(/height="\d+"/);
    });
});

describe('perf budget — scripts', () => {
    const THIRD_PARTY = [
        'cdn.jsdelivr.net/npm/@supabase/supabase-js',
    ];

    it.each(TEMPLATES)('%s defers Supabase CDN script', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        for (const url of THIRD_PARTY) {
            const re = new RegExp(`<script[^>]*src="https://${url.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[^"]*"[^>]*>`);
            const m = html.match(re);
            if (m) {
                expect(m[0], `${rel}: ${url} must have async or defer`).toMatch(/\b(async|defer)\b/);
            }
        }
    });

    it.each(TEMPLATES)('%s defers /shared.js', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        const m = html.match(/<script[^>]*src="\/shared\.js"[^>]*>/);
        if (m) {
            expect(m[0], `${rel}: /shared.js must have async or defer`).toMatch(/\b(async|defer)\b/);
        }
    });
});
