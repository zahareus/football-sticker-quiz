#!/usr/bin/env node

/**
 * One-shot: convert blocking Poppins + leaflet.css <link>s into non-blocking
 * preload+onload pattern across all existing HTML files.
 *
 * Templates already updated separately. This script applies the same fix to
 * all generated HTML so the LCP improvement lands immediately, without
 * regenerating 4000+ files.
 *
 * Idempotent — running twice does nothing on already-fixed files.
 *
 * Usage: node scripts/perf-async-fonts-css.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ---- Replacements ----

const REPLACEMENTS = [
    // Poppins blocking <link href=...> → async preload+onload
    {
        match: /<link href="(https:\/\/fonts\.googleapis\.com\/css2\?family=Poppins[^"]+)" rel="stylesheet">/g,
        replace: '<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link href="$1" rel="stylesheet"></noscript>'
    },
    // Index page had a redundant preload + stylesheet pair — collapse to a single async preload+onload
    {
        match: /<link rel="preload" href="(https:\/\/fonts\.googleapis\.com\/css2\?family=Poppins[^"]+)" as="style">\s*<link href="\1" rel="stylesheet">/g,
        replace: '<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link href="$1" rel="stylesheet"></noscript>'
    },
    // Leaflet CSS blocking → async preload+onload
    {
        match: /<link rel="stylesheet" href="(https:\/\/unpkg\.com\/leaflet@[\d.]+\/dist\/leaflet\.css)" integrity="([^"]+)" crossorigin="">/g,
        replace: '<link rel="preload" as="style" href="$1" integrity="$2" crossorigin="" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="$1" integrity="$2" crossorigin=""></noscript>'
    }
];

const dirs = ['stickers', 'clubs', 'countries', 'cities'];
let totalChanged = 0;
let totalScanned = 0;
let totalAlreadyOk = 0;

const rootFiles = ['index.html', 'about.html', 'battle.html', 'catalogue.html', 'leaderboard.html', 'map.html', 'privacy.html', 'quiz.html', 'rating.html', 'stickerlog.html', 'stickerstat.html', 'terms.html', 'upload.html'];

const allFiles = [];
for (const f of rootFiles) {
    const path = join(PROJECT_ROOT, f);
    try {
        readFileSync(path, 'utf-8');
        allFiles.push(path);
    } catch {}
}
for (const dir of dirs) {
    const dirPath = join(PROJECT_ROOT, dir);
    try {
        const files = readdirSync(dirPath).filter(f => f.endsWith('.html'));
        files.forEach(f => allFiles.push(join(dirPath, f)));
    } catch {}
}

console.log(`Scanning ${allFiles.length} HTML files...\n`);

for (const path of allFiles) {
    totalScanned++;
    const original = readFileSync(path, 'utf-8');
    let updated = original;
    for (const r of REPLACEMENTS) {
        updated = updated.replace(r.match, r.replace);
    }
    if (updated !== original) {
        writeFileSync(path, updated, 'utf-8');
        totalChanged++;
        if (totalChanged <= 5 || totalChanged % 500 === 0) {
            console.log(`  ✓ ${path.replace(PROJECT_ROOT + '/', '')}`);
        }
    } else {
        totalAlreadyOk++;
    }
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`Scanned: ${totalScanned}`);
console.log(`Changed: ${totalChanged}`);
console.log(`Already non-blocking: ${totalAlreadyOk}`);
console.log('═'.repeat(50));
