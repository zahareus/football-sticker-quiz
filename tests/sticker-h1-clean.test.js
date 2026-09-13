import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The edit anchor used to sit inside the <h1>. It is display:none for anonymous
// visitors, so nobody saw it — but the heading text read "FC Porto edit" to every
// crawler, on all 4722 sticker pages, for months. The anchor is now built at
// runtime instead; keep it out of the static markup.

const template = readFileSync(join(process.cwd(), 'templates/sticker-page.html'), 'utf8');

describe('sticker page heading', () => {
    it('keeps the edit anchor out of the static h1', () => {
        const h1 = template.match(/<h1 class="sticker-detail-club-name">[\s\S]*?<\/h1>/)[0];
        expect(h1).not.toContain('edit-sticker-btn');
    });

    it('still carries the club name span the edit form prefills from', () => {
        expect(template).toContain('<span id="club-name-display">{{CLUB_NAME}}</span>');
    });
});

describe('generated sticker pages', () => {
    const dir = join(process.cwd(), 'stickers');
    const pages = readdirSync(dir).filter(f => f.endsWith('.html'));

    it('carry no edit anchor in the heading', () => {
        const dirty = pages.filter(page => {
            const h1 = readFileSync(join(dir, page), 'utf8')
                .match(/<h1 class="sticker-detail-club-name">[\s\S]*?<\/h1>/);
            return h1 && h1[0].includes('edit-sticker-btn');
        });
        expect(dirty).toEqual([]);
    });
});
