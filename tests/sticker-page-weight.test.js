import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Guard against the 2026-09 regression: map markers for every same-city
// sticker were baked into each page as inline JS, so pages in big cities hit
// ~295 KB and stickers/ grew to 380 MB — which Vercel stores per deploy.
// Markers now load client-side; a sticker page is markup + one small script.

const STICKERS_DIR = join(import.meta.dirname, '..', 'stickers');
const MAX_BYTES = 60 * 1024;

const pages = readdirSync(STICKERS_DIR).filter(f => /^\d+\.html$/.test(f));

describe('sticker page weight', () => {
    it('has sticker pages to check', () => {
        expect(pages.length).toBeGreaterThan(0);
    });

    it(`every sticker page is <= ${MAX_BYTES / 1024} KB`, () => {
        const heavy = pages
            .map(f => ({ f, size: statSync(join(STICKERS_DIR, f)).size }))
            .filter(p => p.size > MAX_BYTES)
            .sort((a, b) => b.size - a.size);
        expect(heavy.slice(0, 10), `${heavy.length} pages over budget`).toEqual([]);
    });

    it('no page bakes nearby markers inline (at most 2 L.marker calls)', () => {
        const baked = pages.filter(f => {
            const html = readFileSync(join(STICKERS_DIR, f), 'utf8');
            return (html.match(/L\.marker\(/g) || []).length > 2;
        });
        expect(baked.slice(0, 10), `${baked.length} pages with baked markers`).toEqual([]);
    });
});
