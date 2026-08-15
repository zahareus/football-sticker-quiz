import { describe, it, expect } from 'vitest';
import { stripEmoji } from '../scripts/seo-helpers.js';

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
