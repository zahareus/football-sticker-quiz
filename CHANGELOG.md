# Changelog

Notable changes to StickerHunt. Reverse chronological. Commit hashes link to git history.

## 2026-04-29 — Generation drift recovery + LCP fix + CI guardrails

Triggered by 28-day post-overhaul SEO check that found a 42% click drop after 14.04 and a generation pipeline silently drifting from the database for 26 days.

### Data fixes (one-shot)

- 5 missing sticker pages generated (#3210, #3213, #3214, #3324, #3359). DB had records, HTML did not.
- 4 missing `_web.webp/_thumb.webp` variants backfilled (#3210, #3213, #3215, #3217 — visible 24 days as broken Torrevieja previews).
- Istanbul normalization completed: city page sticker count went from 7 to 100; 100 Istanbul-area sticker pages regenerated to point to `/cities/istanbul.html`; two zombie city pages deleted (`beyo-lu.html`, `kad-k-y.html`).
- 5 new city pages came online via threshold drop (Düsseldorf, Mrčevac, Leinfelden-Echterdingen, Valencia + Vigo emerged at 34 stickers).
- All sitemaps regenerated. `sitemap.xml` index now references all 6 sub-sitemaps (was missing `sitemap-cities.xml` and `sitemap-stickers-4.xml`). Newest sub-sitemap covers IDs up to 3406 (was stale at 3201).

### Foundation against recurrence

- **`scripts/generate-sitemaps.js`** — new dynamic generator (1000 stickers/file, includes cities sub-sitemap, fresh lastmod). Replaces the buggy hardcoded `generateSitemaps()` inside `generate-static-pages.js`. Wired into `generate-sticker-pages.yml` so every upload refreshes sitemaps.
- **`.github/workflows/backfill-images.yml`** — new weekly cron (Sun 03:00 UTC, `--days=90`) for deep-scan of missing image variants. Closes the gap that `reconcile-images.yml`'s 7-day window leaves.
- **`scripts/tests/test-data-integrity.js`** — 4 new test concerns (`npm run test:integrity`):
  1. DB↔HTML parity (no missing/orphan files)
  2. Storage variants (last 30d HEAD checks)
  3. Sitemap freshness (newest covers max DB ID, lastmod ≤7d)
  4. City sync (top-5 cities: HTML count == DB count)
- **`scripts/health.js`** — JSON health-check for external monitoring (`npm run health`). Exit 0/1/2 = green/yellow/red.
- **`.github/workflows/test.yml`** — added `generator-tests` and `integrity-tests` jobs. Marked flaky E2E `continue-on-error: true` so it stops blocking PRs.
- **`scripts/cleanup-orphans.js`** — orphan detector (`npm run cleanup:orphans` for dry-run, `npm run cleanup:orphans:apply` to delete). Safety guards: aborts if DB returns implausibly few records or >200 orphans found. Triggered weekly via Todoist task with manual approval.

### URL hygiene (cityToSlug)

- Centralized `cityToSlug` in `scripts/seo-helpers.js`. Removed 5 inline duplicates that had caused production drift (Beyoğlu→`beyo-lu`, Kadıköy→`kad-k-y` zombies).
- Added proper transliteration (NFD + special-char map). Düsseldorf→`dusseldorf`, Mrčevac→`mrcevac`, Łódź→`lodz`, Beyoğlu→`beyoglu`, Århus→`arhus`. GSC confirmed zero traffic on existing `/cities/*` URLs, so no redirect rules needed.
- Lowered `MIN_STICKERS_PER_CITY` 3→2.

### Performance (LCP)

- Lighthouse mobile baseline: homepage Perf 59 LCP 8.5s, club page 52/7.4s, sticker page 62/6.1s. Target LCP ≤2.5s.
- Render-blocking culprits: leaflet.css (848ms, loaded on every page), Poppins font (884ms), style.css (610ms).
- Fix: switched Poppins and leaflet.css to async preload+onload pattern. Added `<link rel="preload" as="image" fetchpriority="high">` for the LCP image element on sticker/club/city templates.
- Applied to 4166 existing HTML files via `scripts/perf-async-fonts-css.js` (idempotent, re-run safe). All 5 templates updated.
- Verification with PSI + CrUX scheduled for 30.04 (PSI quota exhausted today).

### Commits

- `cdf49b6d5` SEO: fix sitemap index (add cities + stickers-4) + bump homepage lastmod to 2026-04-14
- `84197feaa` scripts: add generate-sitemaps.js (dynamic chunks + cities sub-sitemap)
- `90ac78823` data: full sync after Istanbul normalization + sitemap regen
- `e7165d76a` audit: SEO + generation audit reports + city wiki cache update
- `c994f2f4d` ci+tests: prevent regression of generation drift (Phase 2 + 3)
- `ebbf982f3` scripts: centralize cityToSlug with transliteration + threshold=2
- `e439333f1` scripts: add cleanup-orphans.js (dry-run by default + safety guards)
- `a5436b777` perf: async-load Poppins + leaflet.css, preload LCP image (non-blocking pattern)

### Verification

- 57/57 generator tests pass
- 27/27 integrity tests pass
- 22/22 unit tests pass
- `npm run health`: GREEN, 0 drift, 32 cities, sitemap age 0d, 0 missing image variants
- LCP recheck on 30.04 with PSI + CrUX (Todoist `6gVmrJpVqwphmXwp`)
