# StickerHunt — SEO Improvements Roadmap

**Created:** 17.03.2026 | **Last updated:** 17.03.2026

---

## Completed (17.03.2026)

### SEO Audit & Technical Fixes
- **SEO report** with GSC + Crawler.sh analysis. Baseline: 185 clicks, 4308 impr, CTR 4.29%, pos 9.2
- **Country pages (53):** new titles ("Norway Football Stickers — 16 Clubs | StickerHunt") + H1 tags
- **Club pages (671):** shortened titles, improved meta descriptions with city + CTA
- **Homepage + Quiz:** added H1 tags (sr-only)
- **Sticker count** updated 2942 → 2955
- **Copyright** 2025 → 2026 across all templates and static pages
- **Amplitude** removed entirely, **PostHog** moved before `</body>`
- **OG image** trailing "?" stripped via cleanTrailingQuery()
- **Orphan pages** fixed: leaderboard (button→a), stickerstat (static link)
- **15 broken external links** identified and fixed
- **2 empty clubs** removed (Ararat Yerevan, Modica Calcio), Armenia country page removed
- **Sticker count pagination bug** fixed in regenerate-club-pages.js
- **City names normalized** in Supabase (7 fixes: Prague, Brussels districts, etc.)
- **reverseGeocode()** fixed in upload.js (municipality before borough)
- **Sitemaps** regenerated: 3844 URLs + sitemap-cities.xml (23 URLs). All submitted to GSC

### Club Page Enrichment (Phase 1)
- **1.1 Wiki Facts Card:** Founded, Stadium, Capacity, League, Website from Wikidata API
- **1.2 Wiki Intro:** First 2 sentences from Wikipedia (English, with attribution)
- **1.3 Sticker Statistics:** First/latest found dates, cities, avg difficulty
- **1.4 Internal Links:** "Other clubs from {Country}" section (top 10 by sticker count)
- **1.5 Schema.org:** SportsTeam with foundingDate, StadiumOrArena, SportsOrganization, URL
- **Wikipedia coverage:** 558/671 clubs (83%) with wiki data. wiki-cache.json committed to repo
- **Unified design:** All info blocks in grey cards matching wiki-section style (0.88rem)

### Sticker Page Enrichment
- **Club mini-card:** Founded, league, stadium + "View all N stickers" link
- **More from club:** 6 thumbnail strip of other stickers from same club
- **Location → city link:** Location text links to /cities/{slug}.html
- **Map shows ALL city stickers:** Not just 10 nearby — all stickers from same city on map
- **Current sticker highlighted:** Larger marker (30x49) with "← this sticker" popup
- **Nearby stickers:** 6 thumbnail strip under map from same city
- **Layout:** mini-card under title, strips full-width, nav buttons at bottom
- **All 3088 sticker pages regenerated** with new layout

### New Page Types (Phase 2)
- **2.1 City Pages:** 22 pages + index at /cities/. Each has: Wikipedia intro + population, city details, sticker gallery, Leaflet map with all markers. Minimum 3 stickers per city.

### Generator Updates
All 6 generator scripts updated consistently:
- `generate-single-sticker.js` (GitHub Actions — new stickers)
- `regenerate-club-pages.js` (club edits)
- `regenerate-club-sticker-pages.js` (club name changes)
- `regenerate-country-pages.js` (standalone country regen)
- `regenerate-stickers-batch.js` (batch sticker regen)
- `generate-static-pages.js` (full batch generator)

Plus new scripts:
- `fetch-wiki-data.js` — builds wiki-cache.json from Wikidata + Wikipedia APIs
- `generate-city-pages.js` — generates city pages + index
- `regenerate-all-stickers.js` — batch regeneration of all sticker pages

### Tools Installed
- **Crawler.sh** — local Rust SEO spider at ~/.crawler/bin/crawler

---

## Backlog (not started)

### Country Page Enrichment
- Add Wikipedia intro about the country
- Group clubs by league (where data available)
- Add city/sticker statistics
- **Blocked by:** many lower-division clubs don't have league data in Wikidata

### Collection Pages (2.2) — Deprioritized
- Rarest, newest, top-rated, hardest stickers
- Low search intent — more of an engagement feature than SEO play

### Culture Content Hub (2.4)
- "What Are Football Ultras Stickers?" — editorial article
- "How to Identify a Football Sticker" — guide
- "Street Sticker Spotting Guide" — guide
- **Requires:** manual content writing, not automated

---

## Monitoring

- **Next SEO audit:** ~31.03.2026
- **GSC property:** sc-domain:stickerhunt.club
- **Baseline (17.03.2026):** 185 clicks, 4308 impr, CTR 4.29%, pos 9.2
- **Previous report:** ~/Claude Code/stickerhunt/seo-reports/2026-03-17_report.pdf

### What to check at next audit
1. Impact of new titles/H1/meta on impressions and CTR
2. Brand query "sticker hunt" position (regressed to 18.4)
3. City pages indexation (22 new URLs)
4. Sticker page enrichment impact on bounce rate
5. Core Web Vitals after Amplitude removal
6. New sitemaps crawl status

---

*Last updated: 17.03.2026 by Claude Code*
