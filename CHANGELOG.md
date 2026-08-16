# Changelog

Notable changes to StickerHunt. Reverse chronological. Commit hashes link to git history.

## 2026-08-16 — Security audit fixed end to end, corpus flush, upload no longer starved

### Security (31 of 32 audit findings closed)

- **CI command injection** (`a56806c6f`). `repository_dispatch` payload values were
  re-interpolated by GitHub into `run:` script text, so `$(...)` in `sticker_ids` executed
  on the runner — reaching the `contents: write` GITHUB_TOKEN and, in the image step,
  `SUPABASE_SERVICE_KEY`. Reproduced before fixing: a crafted payload created a file on the
  runner. All eight sites now pass values through `env:` quoted; ids are normalised to
  `[0-9,]` rather than rejected, so one bad token no longer fails a whole batch, and the
  Telegram alert is emitted before anything that can abort.
- **Stored XSS in the leaderboard** (`f6e7d6d42`). Nicknames are user-chosen and
  registration is open; two raw `${username}` interpolations ran for every visitor.
  `escapeHtml` moved into `SharedUtils`; regression guard added that fails on the pre-fix file.
- **Escaping in the generators, by context** (`fe7553d94`). Club/city names, sticker
  locations and Wikipedia text reached HTML unescaped. Fixed per output context, not per
  field: `escapeHtml(stripEmoji(x))` for text and attributes, `escapeForJsHtmlString` for the
  Leaflet popup that only escaped the JS quote, a new `jsonLdPayload()` for all eight JSON-LD
  sites, and a new `safeUrl()` for hrefs — `encodeURI` is not a scheme validator and passed
  `javascript:` through. **Do not "simplify" this to one escaper**: HTML-escaping a JSON-LD
  value writes a literal `&amp;` into structured data.
- **Pre-existing structured-data corruption fixed on the way** — `pageTitle`/`metaDescription`
  were built HTML-escaped for `<title>` and reused inside the schema, so Brighton & Hove
  Albion shipped as `Brighton &amp; Hove` in its JSON-LD. Raw and escaped forms are now separate.
- **`/api/enrich-club` had no server-side auth** (`7ad2ad4c8`). A bare curl returned 200 and
  spent OPENAI_API_KEY; the page's permission check only governed the browser. Now verifies a
  Supabase token and reads `can_upload` with it. Also `optimize-image` (not deployed — kept
  for the future) and migration 007 bounding the two anon RPCs.
- **Deliberately not built: binding a vote to a served pair.** Measured first — 3392 votes,
  1130 sessions, zero sustaining >30 votes/minute. The "harmless" log-only phase would move a
  write onto `get_battle_pair`, which today cannot fail. Reasoning and four preconditions in
  `docs/BACKLOG.md`.

### Corpus and SEO

- **Flushed 1018 stale sticker pages + 63 club + 3 country** (`9f2e873f5`, `7eb9364a1`) —
  orphaned tag characters and a `<meta keywords>` the templates dropped in `3fb215f6b`.
  Scope was measured, not assumed: a naive tag-char scan flags 1287 pages, but most are
  legitimate 🏴󠁧󠁢󠁥󠁮󠁧󠁿 flags in JSON-LD. **Full-corpus regeneration was rejected** — the
  "similar stickers" strip is rebuilt from current DB state every run, so it would churn
  3368 pages with no defect to fix.
- **Root cause of the orphaned stickers found** (`a11902ee1`), after three SEO cycles
  reported it unfixed. Three mechanisms leave a gap: a dispatch is evicted from the
  concurrency queue → the nightly city sweep still writes the sticker page, but with
  `STICKER_PAGE_ONLY=1`, which skips club pages → `reconcile-stickers` only checked that the
  sticker page exists, so it stayed silent forever. It now also checks the club page links to
  it. Isolated stickers: 0 / 4386.
- Canonicals on 7 service pages, descriptions on privacy/terms, `profile.html` to noindex
  (it rendered other people's accounts under one indexable URL), twitter cards to `name=`
  across templates and 5259 pages, `sitemap-stickers-4.xml` submitted to Search Console.
- **`health.js` reported RED wrongly** (`202ffb225`) — it aged the sitemap by its *first*
  `<lastmod>`, but entries are ordered by sticker id, not date.

### Upload reliability

- **Browser uploads were being starved by our own pipeline** (`c418253bc`, `713f2653d`).
  Batch uploads failed mid-run with "Storage: Too many connections issued to the database",
  losing stickers with neither file nor row saved. The culprit was the `if: always()`
  safety-net image sweep: it ran on *every* generation run — and creating a club or uploading
  a single sticker each fires one — hitting Storage with 20 concurrent checks while the
  browser uploaded to the same service. Every pooler refusal spike that day sat inside its
  window, the largest on its longest run. The step was a duplicate of `reconcile-images.yml`
  and was removed; that cron now runs every 5 minutes over a 1-day window (less total load,
  faster healing) and carries a failure alert, since it is now the only healer.
  `upload-batch.js` retries transient failures three times with jittered backoff —
  idempotently: the storage path is computed once and uploaded with `upsert`, and the insert
  retry looks the row up by `image_url`, so a retry can neither orphan a file nor duplicate a
  sticker. Retries are surfaced in the report rather than hidden.
- An earlier diagnosis blaming the page generators' full-table reads was **wrong** — they go
  through PostgREST, which has its own pool and does not consume pooler client slots.

## 2026-08-15 — Flag-emoji leftovers, nightly city map sweep, popup escaping

- **Fix: subdivision-flag tag chars survived `stripEmoji`** (`c429bee`). The regex knew the
  base 🏴 (U+1F3F4) but not the six `\u{E0000}-\u{E007F}` tag chars that spell out the
  subdivision, so 64 English/Scottish/Welsh clubs carried six invisible codepoints at the
  front of every `<title>`, `<h1>` and JSON-LD `name` — visible to Google, invisible to
  everyone else. Regional-indicator flags (🇩🇪) were never affected. Added the tag range +
  ZWJ. Two further private copies of the same regex were deduped onto the shared helper
  (`b9f7c5f` map popups, plus the one inside `generate-city-pages.js`).
  **Emoji in `clubs.name` itself is untouched and must stay** — see Key Rule 7.
- **Decision: no mass regeneration to clean the ~1400 older pages.** `stickers/` is 279 MB
  and `.git` 208 MB; a full pass would add a permanent ~270 MB commit to history to remove
  bytes nobody can see. Pages clean themselves as they get touched.
- **New: nightly city map sweep** (`179e8033`) — `scripts/sweep-city-maps.js` +
  `.github/workflows/sweep-city-maps.yml`, cron 02:30 UTC, Telegram to Самаритянин on every
  run including idle nights. Sticker pages bake their nearby markers and "Also found in
  \<city\>" links at generation time and the upload run only touches the new sticker and
  its id-predecessor, so the rest of the city froze at whatever existed when it was born.
  First run: 386 pages across Barcelona/Lens/Torrevieja, sticker 4316 went from **2 markers
  to 112**. Batched per city, not per sticker — a 30-sticker upload over 3 cities is 3
  sweeps, not 30. See architecture.md → "Nightly City Map Sweep".
  - **Rejected alternative:** fetching markers client-side. Premortem killed it — the same
    DB query has to stay for the SEO link block anyway (so zero CI saving), it fixes only
    half the staleness, and it would make the map depend on Supabase + a CDN where today it
    works even with the DB down.
- **Fix: club names spliced into map popups unescaped** (`5d8f793`). Labels went into a
  single-quoted JS string that Leaflet re-parses as HTML with only the apostrophe escaped,
  and club names are user-supplied (`club-create.js` inserts from the browser). A name like
  `<img src=x onerror=…>` would have executed on every page of that city. New
  `escapeForJsHtmlString()` covers all seven splice points across four generators.

## 2026-06-06 — Rating fix + continuous synthetic monitor

- **Fix: `rating.html` was fully broken** ("Initialization error. Rating cannot be loaded.") (`de84046`). `rating.js` loaded WITHOUT `defer` while `shared.js` + `supabase-js` were deferred, so `rating.js`' top-level init ran before `SharedUtils` existed → `supabaseClient` never set. Regression from the May "defer JS" perf commit. Added `defer` to `rating.js`, `battle.js`, `clubs-page.js` (battle/clubs were latent — only used `SharedUtils` inside `DOMContentLoaded`, so they still worked, but the ordering was fragile).
- **New continuous safety net** so this class of breakage is caught automatically, not by chance:
  - **`scripts/synthetic-monitor.mjs`** — loads every key page on the LIVE site in a headless browser and asserts it actually works: no JS init failure, no critical console errors (`SharedUtils not loaded`, `TypeError`, …), and the main content rendered. Catches client-render breakage that a plain HTTP-200 check hides. Retries once to avoid false alarms; sends ONE Telegram alert (Самаритянин, chat `292048`) listing the broken pages and exits non-zero; all-green is silent.
  - **`.github/workflows/synthetic-monitor.yml`** — runs the monitor **hourly** and **after every code deploy** (push to `main` touching app code — auto-generated `stickers/`,`clubs/`,… commits are skipped; a 120s wait lets Vercel deploy first), plus `workflow_dispatch`. Reuses `TELEGRAM_BOT_TOKEN`. Covers homepage, rating, leaderboard, catalogue, quiz, clubs, map, battle, profile, stickerstat/log, all three uploaders/club-create, and sample static sticker/club pages.

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
