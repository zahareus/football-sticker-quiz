import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The club page strips flag emoji from the <h1> (CLS guard) but its inline edit
// form writes its own value straight back to clubs.name. Feeding the stripped
// name into that input silently ate the flag on every save — guard both halves.

const template = readFileSync(join(process.cwd(), 'templates/club-page.html'), 'utf8');

describe('club page edit form', () => {
    it('prefills the name input from the raw name, not the stripped heading', () => {
        const input = template.match(/<input[^>]*id="edit-club-name"[^>]*>/)[0];
        expect(input).toContain('{{CLUB_NAME_RAW}}');
        expect(input).not.toContain('{{CLUB_NAME}}"');
    });

    it('keeps the flag out of the heading', () => {
        expect(template).toContain('<span id="club-name-display">{{CLUB_NAME}}</span>');
    });

    it('only sends name to the DB when it actually changed', () => {
        expect(template).toContain('if (nameChanged) clubPayload.name = newName;');
    });
});

describe('generated club pages', () => {
    const dir = join(process.cwd(), 'clubs');
    const pages = readdirSync(dir).filter(f => f.endsWith('.html'));

    it('carry the flag emoji in the edit input', () => {
        let withInput = 0;
        let flagged = 0;
        for (const page of pages) {
            const input = readFileSync(join(dir, page), 'utf8')
                .match(/<input[^>]*id="edit-club-name"[^>]*value="([^"]*)"/);
            if (!input) continue;
            withInput++;
            // Every club name is entered with a leading country flag by hand.
            if (!/^[\p{L}\p{N}]/u.test(input[1])) flagged++;
        }
        expect(withInput).toBeGreaterThan(0);
        // Was 0% while the input was fed the stripped name; a handful of rows may
        // still be missing their flag, so allow a small tail rather than demanding 100%.
        expect(flagged / withInput).toBeGreaterThan(0.95);
    });
});
