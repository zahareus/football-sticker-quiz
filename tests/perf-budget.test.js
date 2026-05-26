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

// Sample generated pages that share the same head structure as templates.
// about/battle/catalogue are hand-maintained static pages on the legacy
// inline-critical layout; they are intentionally out of scope here.
const SAMPLES = [
    'index.html',
];

const ALL = [...TEMPLATES, ...SAMPLES];

describe('perf budget — head', () => {
    // style.css is now render-blocking. Inline critical CSS was removed because
    // its 40 KB caused a multi-phase paint that produced a 0.35 CLS spike on
    // desktop (Playwright trace showed main growing 82 px between paints).
    // Render-blocking single stylesheet adds ~50-150 ms to LCP but lands a
    // stable single paint with CLS 0.
    it.each(ALL)('%s loads style.css render-blocking', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        expect(html, `${rel}: missing blocking <link rel=stylesheet>`).toMatch(
            /<link rel="stylesheet" href="\/?style\.css(\?v=\d+)?">/
        );
    });

    it.each(ALL)('%s does not inline critical CSS', (rel) => {
        const html = readFileSync(join(ROOT, rel), 'utf8');
        expect(html, `${rel}: should not have unresolved {{CRITICAL_CSS}}`).not.toMatch(/\{\{CRITICAL_CSS\}\}/);
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
