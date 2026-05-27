#!/usr/bin/env node

/**
 * Internal links audit — build an incoming-link graph for all generated HTML
 * and surface pages that are likely under-crawled because nothing of value
 * points at them.
 *
 * What it does:
 *   1. Walk every *.html in PROJECT_ROOT, ROOT/stickers, ROOT/clubs,
 *      ROOT/countries, ROOT/cities.
 *   2. For each file, extract internal <a href="..."> targets and a few
 *      same-document signals (preloads, OG/canonical pointing at self —
 *      those don't count as incoming links).
 *   3. Build inverse map: targetURL -> [list of pages that link to it].
 *   4. Score each page by:
 *      - total incoming links
 *      - incoming from "high-authority" pages: /, /catalogue.html,
 *        /countries/*, /clubs/* (clubs link inside their own country).
 *   5. Output a markdown report listing the most-isolated club and
 *      sticker pages — these are the crawl-budget orphans the GSC
 *      audit on 13.05 identified for clubs/1095.html.
 *
 * Usage:
 *   node scripts/internal-links-audit.js
 *   node scripts/internal-links-audit.js --limit=50      # show top 50
 *   node scripts/internal-links-audit.js --json=path     # also write json
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const REPORT_DIR = join(PROJECT_ROOT, 'seo-reports');

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 30;
const jsonArg = args.find(a => a.startsWith('--json='));
const JSON_OUT = jsonArg ? jsonArg.split('=')[1] : null;

// Pages whose outbound links carry high weight (home + catalogue + countries +
// clubs). These pages are well-crawled themselves, so links from them are
// the strongest crawl signal.
const HIGH_AUTHORITY_PATTERNS = [
    /^index\.html$/,
    /^catalogue\.html$/,
    /^countries\/[A-Z]{3}\.html$/,
    /^clubs\/\d+\.html$/,
];

function isHighAuthority(relPath) {
    return HIGH_AUTHORITY_PATTERNS.some(re => re.test(relPath));
}

function walkHtmlFiles(root) {
    const out = [];
    function recurse(dir) {
        let entries;
        try { entries = readdirSync(dir); } catch { return; }
        for (const name of entries) {
            const full = join(dir, name);
            let s;
            try { s = statSync(full); } catch { continue; }
            if (s.isDirectory()) {
                // Skip node_modules and tooling dirs
                if (name === 'node_modules' || name === '.git' || name === 'tests'
                    || name === 'scripts' || name === 'docs' || name === 'fonts'
                    || name === 'images' || name === 'js' || name === '.github'
                    || name === 'api' || name === 'seo-reports') continue;
                recurse(full);
            } else if (name.endsWith('.html')) {
                out.push(relative(root, full));
            }
        }
    }
    recurse(root);
    return out;
}

const linkRe = /<a\s+[^>]*href\s*=\s*["']([^"'#]+)/gi;

function extractInternalLinks(html, fromRelPath) {
    const links = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) {
        let href = m[1];
        if (!href) continue;
        if (href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) continue;
        // External link
        if (/^https?:\/\//i.test(href)) {
            try {
                const u = new URL(href);
                if (u.hostname !== 'stickerhunt.club' && u.hostname !== 'www.stickerhunt.club') continue;
                href = u.pathname + u.search;
            } catch { continue; }
        }
        // Strip query and fragment for the link graph
        href = href.split('#')[0].split('?')[0];
        if (!href) continue;
        // Normalize: leading "/" -> relative path, ".html" expected
        if (href === '/' || href === '') href = 'index.html';
        else if (href.startsWith('/')) href = href.slice(1);
        // Skip non-html assets
        if (!href.endsWith('.html') && !href.endsWith('/')) continue;
        if (href.endsWith('/')) href = href + 'index.html';
        links.add(href);
    }
    return Array.from(links);
}

console.log('🔎 Walking HTML files…');
const files = walkHtmlFiles(PROJECT_ROOT);
console.log(`  found ${files.length} HTML files`);

const incoming = new Map(); // target -> Set(fromRelPath)
const outgoingCount = new Map(); // from -> int

for (const f of files) {
    const full = join(PROJECT_ROOT, f);
    let html;
    try { html = readFileSync(full, 'utf-8'); } catch { continue; }
    const links = extractInternalLinks(html, f);
    outgoingCount.set(f, links.length);
    for (const target of links) {
        if (target === f) continue; // skip self-links
        if (!incoming.has(target)) incoming.set(target, new Set());
        incoming.get(target).add(f);
    }
}

console.log(`  graph: ${incoming.size} unique targets`);

// Build per-page stats
const pages = files.map(f => {
    const incs = incoming.get(f) || new Set();
    const incFromHA = Array.from(incs).filter(isHighAuthority);
    return {
        path: f,
        type: f.startsWith('stickers/') ? 'sticker'
            : f.startsWith('clubs/') ? 'club'
            : f.startsWith('countries/') ? 'country'
            : f.startsWith('cities/') ? 'city'
            : 'other',
        incomingTotal: incs.size,
        incomingHA: incFromHA.length,
        incomingHASamples: incFromHA.slice(0, 5),
        outgoing: outgoingCount.get(f) || 0,
    };
});

// Isolated thresholds by page type. Different page types have different
// realistic floors:
//   - hub pages (clubs, countries) must have ≥2 HA incoming because hubs
//     are first-class destinations and should be discoverable from multiple
//     parent hubs (catalogue + own country, country + index, etc).
//   - leaf pages (stickers) are long-tail content with 3539+ instances —
//     each sticker has exactly one canonical hub (its club page). One HA
//     incoming is the structural floor; ≥2 is a "boost" indicator showing
//     extra hub mentions (featured strips on country/catalogue pages).
const ISO_HA_THRESHOLD = 2;            // for clubs/countries
const ISO_HA_THRESHOLD_LEAF = 1;       // for stickers (leaf content)

const isolatedClubs = pages.filter(p => p.type === 'club' && p.incomingHA < ISO_HA_THRESHOLD)
    .sort((a, b) => a.incomingHA - b.incomingHA || a.incomingTotal - b.incomingTotal);
const isolatedStickers = pages.filter(p => p.type === 'sticker' && p.incomingHA < ISO_HA_THRESHOLD_LEAF)
    .sort((a, b) => a.incomingHA - b.incomingHA || a.incomingTotal - b.incomingTotal);
// Boosted stickers — have ≥2 HA incoming (featured on country or catalogue
// in addition to their club page). Tracked as a positive signal, not isolation.
const boostedStickers = pages.filter(p => p.type === 'sticker' && p.incomingHA >= 2);

const totalClubs = pages.filter(p => p.type === 'club').length;
const totalStickers = pages.filter(p => p.type === 'sticker').length;

// Aggregate stats
const summary = {
    walked: files.length,
    targets: incoming.size,
    counts: {
        sticker: totalStickers,
        club: totalClubs,
        country: pages.filter(p => p.type === 'country').length,
        city: pages.filter(p => p.type === 'city').length,
        other: pages.filter(p => p.type === 'other').length,
    },
    isolated: {
        clubs: { total: isolatedClubs.length, percentOf: ((isolatedClubs.length / totalClubs) * 100).toFixed(1), threshold: `< ${ISO_HA_THRESHOLD} HA` },
        stickers: { total: isolatedStickers.length, percentOf: ((isolatedStickers.length / totalStickers) * 100).toFixed(1), threshold: `< ${ISO_HA_THRESHOLD_LEAF} HA` },
        boosted_stickers: { total: boostedStickers.length, percentOf: ((boostedStickers.length / totalStickers) * 100).toFixed(1), note: '≥2 HA — featured on country/catalogue hub' },
    },
};

console.log();
console.log('=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

// Outgoing audit — high-authority page link counts
const haPages = pages.filter(p => isHighAuthority(p.path));
console.log();
console.log('=== High-authority page outgoing-link counts ===');
haPages.slice(0, 20).forEach(p => {
    console.log(`  ${p.path.padEnd(35)} → ${p.outgoing} internal links`);
});

// Build report
const today = new Date().toISOString().slice(0, 10);

function fmtPagesList(pgs, limit) {
    return pgs.slice(0, limit).map(p => {
        const samples = p.incomingHASamples.length ? p.incomingHASamples.join(', ') : '(none)';
        return `| ${p.path} | ${p.incomingHA} | ${p.incomingTotal} | ${samples} |`;
    }).join('\n');
}

const reportLines = [
    `# Internal Links Audit — ${today}`,
    ``,
    `Generated by \`scripts/internal-links-audit.js\`. Builds a graph of all`,
    `internal links across the static site, then scores each page by how many`,
    `**high-authority** pages link to it (home, catalogue, countries, clubs).`,
    `Pages with fewer than ${ISO_HA_THRESHOLD} high-authority incoming links are`,
    `treated as "isolated" — they're the crawl-budget orphans Google rarely`,
    `re-visits.`,
    ``,
    `## Scope`,
    `- HTML files walked: ${files.length}`,
    `- Unique link targets: ${incoming.size}`,
    `- Sticker pages: ${totalStickers}`,
    `- Club pages: ${totalClubs}`,
    `- Country pages: ${summary.counts.country}`,
    `- City pages: ${summary.counts.city}`,
    ``,
    `## Headline`,
    `- **Isolated clubs:** ${isolatedClubs.length} / ${totalClubs} (${summary.isolated.clubs.percentOf}%)`,
    `- **Isolated stickers:** ${isolatedStickers.length} / ${totalStickers} (${summary.isolated.stickers.percentOf}%)`,
    `- Threshold: fewer than ${ISO_HA_THRESHOLD} incoming links from home/catalogue/country/club pages`,
    ``,
    `## High-authority outgoing-link counts`,
    `Most-orphan pages root cause is that few HA pages link to them. Below — outbound link counts on the top HA pages themselves.`,
    ``,
    `| Page | Internal links |`,
    `|---|---|`,
    ...haPages.slice(0, 10).map(p => `| ${p.path} | ${p.outgoing} |`),
    ``,
    `## Top isolated club pages (worst first)`,
    ``,
    `| Page | HA in | Total in | HA samples |`,
    `|---|---|---|---|`,
    fmtPagesList(isolatedClubs, LIMIT),
    ``,
    `## Top isolated sticker pages (worst first)`,
    ``,
    `| Page | HA in | Total in | HA samples |`,
    `|---|---|---|---|`,
    fmtPagesList(isolatedStickers, LIMIT),
    ``,
    `## Recommendations`,
    ``,
    `1. **catalogue.html** — currently has ${haPages.find(p => p.path === 'catalogue.html')?.outgoing ?? '?'} internal links. The catalogue page must link to every club + every country. Today it links to nothing — that's the single biggest structural orphan-generator.`,
    `2. **index.html** — currently has ${haPages.find(p => p.path === 'index.html')?.outgoing ?? '?'} internal links. Add a "Featured clubs" rotating block (random 10-20 with weekly rotation) so different clubs accumulate link juice over time.`,
    `3. **clubs/X.html template** — add "More clubs from {country}" section (5-10 random clubs from the same country) to crosslink intra-country.`,
    `4. **Bump sitemap lastmod** for the top-${LIMIT} isolated pages so Google re-crawls them after the new links are live.`,
];

if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
const reportPath = join(REPORT_DIR, `${today}_internal_links_audit.md`);
writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
console.log();
console.log(`📝 Report written: ${reportPath}`);

if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ summary, isolatedClubs, isolatedStickers, haPages }, null, 2));
    console.log(`📊 JSON written: ${JSON_OUT}`);
}
