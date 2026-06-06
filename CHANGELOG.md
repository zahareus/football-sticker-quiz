# Changelog

Notable changes to StickerHunt. Reverse chronological. Commit hashes link to git history.

## 2026-06-06 — Rating fix + continuous synthetic monitor

- **Fix: `rating.html` was fully broken** ("Initialization error. Rating cannot be loaded.") (`de84046`). `rating.js` loaded WITHOUT `defer` while `shared.js` + `supabase-js` were deferred, so `rating.js`' top-level init ran before `SharedUtils` existed → `supabaseClient` never set. Regression from the May "defer JS" perf commit. Added `defer` to `rating.js`, `battle.js`, `clubs-page.js` (battle/clubs were latent — only used `SharedUtils` inside `DOMContentLoaded`, so they still worked, but the ordering was fragile).
- **New continuous safety net** so this class of breakage is caught automatically, not by chance:
  - **`scripts/synthetic-monitor.mjs`** — loads every key page on the LIVE site in a headless browser and asserts it actually works: no JS init failure, no critical console errors (`SharedUtils not loaded`, `TypeError`, …), and the main content rendered. Catches client-render breakage that a plain HTTP-200 check hides. Retries once to avoid false alarms; sends ONE Telegram alert (Самаритянин, chat `292048`) listing the broken pages and exits non-zero; all-green is silent.
  - **`.github/workflows/synthetic-monitor.yml`** — runs the monitor **every 15 minutes** (+ `workflow_dispatch`). Reuses `TELEGRAM_BOT_TOKEN`. Covers homepage, rating, leaderboard, catalogue, quiz, clubs, map, battle, profile, stickerstat/log, all three uploaders/club-create, and sample static sticker/club pages.

## 2026-06-06 — Batch uploader + club Re-enrich

### Batch sticker uploader (no social post)

- **New `upload-batch.html` / `upload-batch.js`** (`aa4ce51`). For bulk uploads of stickers that should NOT go to social media. The single uploader (`upload.html`) is unchanged.
  - Drop any number of JPEGs **anywhere on the page** (full-page drop target with overlay) — one row per image, accumulating across multiple drops in one session (`6211a4b`).
  - Each row: 176×176 preview, club autocomplete, difficulty 1–3, EXIF geolocation, and the image filename (to cross-check against the catalog) (`0ab6989`).
  - `confirm()` before upload; then per row → Supabase Storage + `stickers` INSERT (no per-sticker webhook). After all rows: ONE POST to the batch webhook → a report view listing every sticker sent.
- **One run per batch.** The batch webhook → n8n **"SH batch reconcile"** (`kpeWoT8qqyq0Gdrq`) → ONE `repository_dispatch` with all `sticker_ids` as a comma list. `generate-sticker-pages.yml` already loops `generate-single-sticker.js` over them in a single run — no concurrency-group cancellations. Verified on batches up to 23 stickers (3677–3699) generating cleanly in ~1.5 min.
- **Telegram notify** (`generate-sticker-pages.yml`, `aa4ce51`): final workflow step fires only when `client_payload.notify == 'true'` (batch only) and reports stickers/clubs/countries counts (or a failure alert) to Victor via the Самаритянин bot (chat `292048`). New GitHub secret `TELEGRAM_BOT_TOKEN`. Single uploads stay silent.

### Geolocation fix (batch)

- **Root cause** (`597a29f`): a batch drop fired N concurrent reverse-geocode requests to Nominatim, which rate-limits/blocks bulk (HTTP 429) → place name never resolved, and the UI misleadingly showed "GPS not found" even when EXIF coordinates WERE extracted.
- **Fix:** decoupled coords from place name (coords read locally, shown immediately; "GPS not found" only when no coords at all); serialized reverse-geocoding through one queue ~1.1s apart with a retry on 429; upload waits for the queue to drain so place names are saved. Report falls back to coords when no name.

### Club Re-enrich

- **`club-create.html` / `club-create.js`** (`13af4cd`): picking an existing club from the autocomplete now reveals a **"Re-enrich this club"** button. It re-runs AI enrichment (`/api/enrich-club` → city / hashtags / website), updates the club row (only fields that came back; never wipes with null), and the clubs poller regenerates the page within ~1 min. Fixes one-off transient enrichment failures (e.g. IFK Norrköping #1210, whose `city/media/web` were backfilled manually) without re-creating the club.

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
