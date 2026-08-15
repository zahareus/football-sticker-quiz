// Regression tests for the 2026-08-15 audit findings.
// Each test reproduces a confirmed bug; written RED first, then the fix turns it GREEN.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

describe('breadcrumbs escape club names (audit: stored XSS path)', () => {
    it('generateBreadcrumbs escapes HTML in text and url', async () => {
        const { generateBreadcrumbs } = await import('../scripts/seo-helpers.js');
        const html = generateBreadcrumbs([
            { url: '/clubs/1.html" onmouseover="x', text: 'Foo<img src=x onerror=alert(1)>' },
        ]);
        expect(html).not.toContain('<img');
        expect(html).not.toContain('" onmouseover=');
    });
});

describe('single generator: no local shadow copies of hardened helpers', () => {
    it('generate-static-pages.js imports stripEmoji instead of redefining it', () => {
        const src = read('scripts/generate-static-pages.js');
        expect(src).not.toMatch(/^function stripEmoji/m);
        expect(src).toMatch(/import\s*\{[^}]*stripEmoji[^}]*\}\s*from\s*'\.\/seo-helpers\.js'/);
    });
    it('generate-city-pages.js imports toLocalImg/cleanTrailingQuery/replacePlaceholders', () => {
        const src = read('scripts/generate-city-pages.js');
        for (const fn of ['toLocalImg', 'cleanTrailingQuery', 'replacePlaceholders']) {
            expect(src, `${fn} must not be redefined locally`).not.toMatch(new RegExp(`^(function|const)\\s+${fn}\\b`, 'm'));
        }
        expect(src).toMatch(/from\s*'\.\/seo-helpers\.js'/);
    });
});

describe('prev-sticker regeneration keeps Similar-from-country (audit: 2352 pages stripped)', () => {
    it('the prev-sticker generateStickerPage call passes all 7 arguments', () => {
        const src = read('scripts/generate-single-sticker.js');
        // Every generateStickerPage( call site must have 7 comma-separated args.
        const calls = [...src.matchAll(/generateStickerPage\(([^;]*?)\)/gs)]
            .filter(m => !/^function|=>/.test(src.slice(Math.max(0, m.index - 30), m.index)));
        expect(calls.length).toBeGreaterThan(0);
        for (const m of calls) {
            const depth0Commas = (() => {
                let d = 0, n = 0;
                for (const ch of m[1]) {
                    if (ch === '(' || ch === '[' || ch === '{') d++;
                    else if (ch === ')' || ch === ']' || ch === '}') d--;
                    else if (ch === ',' && d === 0) n++;
                }
                return n;
            })();
            expect(depth0Commas, `call "${m[1].slice(0, 60)}…" must pass 7 args`).toBe(6);
        }
    });
});

describe('generated homepage/catalogue carry no ORPHANED invisible tag characters', () => {
    // Tag chars U+E0000–E007F are legitimate right after 🏴 (U+1F3F4) — they
    // spell the England/Scotland/Wales flags. Orphaned runs (base emoji
    // stripped, invisible tail left behind) are the audit bug.
    for (const f of ['index.html', 'catalogue.html']) {
        it(`${f} has zero orphaned tag chars`, () => {
            if (!fs.existsSync(path.join(root, f))) return; // fresh checkout without generated pages
            const orphaned = (read(f).match(/(?<!\u{1F3F4}[\u{E0000}-\u{E007F}]*)[\u{E0000}-\u{E007F}]/gu) || []).length;
            expect(orphaned).toBe(0);
        });
    }
});
