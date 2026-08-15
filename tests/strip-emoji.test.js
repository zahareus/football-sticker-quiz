import { describe, it, expect } from 'vitest';
import { stripEmoji, escapeForJsHtmlString } from '../scripts/seo-helpers.js';

describe('stripEmoji', () => {
    it('strips regional-indicator flags', () => {
        expect(stripEmoji('🇩🇪 Chemnitzer FC')).toBe('Chemnitzer FC');
    });

    it('strips subdivision flags without leaving tag chars', () => {
        const out = stripEmoji('🏴󠁧󠁢󠁥󠁮󠁧󠁿 Derby County F.C.');
        expect(out).toBe('Derby County F.C.');
        expect(/[\u{E0000}-\u{E007F}]/u.test(out)).toBe(false);
    });

    it('leaves plain names untouched', () => {
        expect(stripEmoji('Vis Novafeltria Calcio')).toBe('Vis Novafeltria Calcio');
    });
});

describe('escapeForJsHtmlString', () => {
    // Club names are user-supplied and land inside a single-quoted JS string
    // that Leaflet re-parses as HTML, so both layers have to be neutralised.
    it('neutralises HTML so a name cannot become markup', () => {
        const out = escapeForJsHtmlString('<img src=x onerror=alert(1)>');
        expect(out).not.toContain('<');
        expect(out).not.toContain('>');
        expect(out).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('escapes quotes and backslashes so the JS string cannot be broken out of', () => {
        expect(escapeForJsHtmlString("O'Brien FC")).toBe("O\\'Brien FC");
        expect(escapeForJsHtmlString('A\\B')).toBe('A\\\\B');
    });

    it('flattens line terminators that would split the statement', () => {
        expect(escapeForJsHtmlString('A\nB C')).toBe('A B C');
    });

    it('leaves ordinary club names alone', () => {
        expect(escapeForJsHtmlString('Chemnitzer FC')).toBe('Chemnitzer FC');
    });

    it('handles null and undefined', () => {
        expect(escapeForJsHtmlString(null)).toBe('');
        expect(escapeForJsHtmlString(undefined)).toBe('');
    });
});
