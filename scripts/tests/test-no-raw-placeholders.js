#!/usr/bin/env node

/**
 * Corpus-wide guard: NO generated HTML page may contain an unreplaced
 * {{PLACEHOLDER}}.
 *
 * Why this exists: test-generators.js only checks a handful of hardcoded
 * sample pages (sticker 311, club 617, country ENG, city amsterdam). On
 * 2026-05-27 a regen run replaced correct HTML with raw {{MULTILINGUAL_META}}
 * and {{CLUB_MINI_CARD}} across 712 club pages and 3534 sticker pages — and
 * the sample-based test stayed green because the samples happened to be in the
 * clean minority. This guard scans the ENTIRE deployed corpus so that can
 * never silently happen again.
 *
 * Exit code 1 if any raw {{...}} placeholder is found.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

// Directories of generated HTML to scan + root-level generated pages.
const SCAN_DIRS = ['clubs', 'stickers', 'countries', 'cities'];
const ROOT_PAGES = ['index.html', 'catalogue.html', 'leaderboard.html'];

// Matches {{ANYTHING}} — same shape replacePlaceholders() consumes.
const PLACEHOLDER_RE = /\{\{[A-Z0-9_]+\}\}/g;

function scanFile(absPath, relPath, offenders) {
    const html = readFileSync(absPath, 'utf-8');
    const matches = html.match(PLACEHOLDER_RE);
    if (matches && matches.length > 0) {
        const unique = [...new Set(matches)];
        offenders.push({ file: relPath, placeholders: unique });
    }
}

function run() {
    const offenders = [];
    let scanned = 0;

    for (const dir of SCAN_DIRS) {
        const abs = join(PROJECT_ROOT, dir);
        if (!existsSync(abs)) continue;
        for (const name of readdirSync(abs)) {
            if (!name.endsWith('.html')) continue;
            scanned++;
            scanFile(join(abs, name), `${dir}/${name}`, offenders);
        }
    }

    for (const name of ROOT_PAGES) {
        const abs = join(PROJECT_ROOT, name);
        if (!existsSync(abs)) continue;
        scanned++;
        scanFile(abs, name, offenders);
    }

    console.log(`Scanned ${scanned} generated HTML files for raw {{PLACEHOLDERS}}.`);

    if (offenders.length > 0) {
        console.error(`\n❌ ${offenders.length} file(s) contain unreplaced placeholders:\n`);
        // Show first 20 offenders in full, then a summary tally.
        const tally = {};
        offenders.forEach(o => o.placeholders.forEach(p => { tally[p] = (tally[p] || 0) + 1; }));
        offenders.slice(0, 20).forEach(o => {
            console.error(`  ${o.file} → ${o.placeholders.join(', ')}`);
        });
        if (offenders.length > 20) console.error(`  ... and ${offenders.length - 20} more file(s)`);
        console.error('\nPlaceholder tally across all offenders:');
        Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
            console.error(`  ${p}: ${n}`);
        });
        process.exit(1);
    }

    console.log('✅ No raw placeholders found across the corpus.');
}

run();
