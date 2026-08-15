# StickerHunt

Global football fan sticker database with quiz, battle mode, and interactive map.

**Domain:** https://stickerhunt.club/
**Repo:** https://github.com/zahareus/football-sticker-quiz/
**Backend:** Supabase (`rbmeslzlbsolkxnvesqb.supabase.co`)
**Hosting:** Vercel + GitHub Pages

> **Backend decision (2026-06-22):** StickerHunt stays **fully on Supabase Pro** and we
> maximize its built-in features. It is the one project that genuinely needs an integrated
> backend (Postgres + Auth with real OAuth users + Storage + Edge Functions + RPC logic).
> Rejected: moving images to R2 (pointless hybrid — DB/Auth/RPC still need Supabase) and a
> full Cloudflare migration (would require rebuilding auth from scratch + porting PL/pgSQL).
> No storage problem exists on Pro (100 GB limit, ~1.9 GB used; DB only 28 MB). See
> `docs/architecture.md` → "Backend platform decision".

## Documentation

- [Architecture](docs/architecture.md) -- tech stack, pipelines, database, generators, file structure
- [SEO](docs/seo.md) -- strategy, performance metrics, completed improvements
- [Commands](docs/commands.md) -- generation, optimization, testing, deployment
- [Backlog](docs/BACKLOG.md) -- deferred items awaiting the planned functional/visual overhaul

## Domain Vocabulary

- **Sticker** — one photographed fan sticker; row in `stickers` table; static page `stickers/<id>.html`. ~4400 stickers; ~half have no `location` (no map).
- **Club** — row in `clubs`; static page `clubs/<id>.html`. ~770 clubs.
- **Club name** — in DB it ALWAYS starts with a country flag emoji (`🇩🇪 Chemnitzer FC`). See Iron Rules.
- **Generator** — Node script that renders static HTML from DB + `templates/`. Several page types have DUPLICATE generator code paths; only the canonical one per type is safe (see Iron Rules).
- **Placeholder** — `{{TOKEN}}` in templates. A generator whose data object lags the template would leak raw `{{...}}` to prod; guards make it throw instead.
- **Poller** — hourly n8n workflow "SH clubs poller" that diffs `clubs` and catches regenerations lost by GitHub's concurrency queue. Load-bearing fallback.
- **City sweep** — nightly workflow (`scripts/sweep-city-maps.js`, 02:30 UTC) regenerating all sticker pages of cities touched by uploads (map markers / "Also found in" blocks are baked at generation time and go stale otherwise).
- **Upload / batch upload** — `upload.html` (single, triggers Zernio social post) and `upload-batch.html` (many, no posts) → n8n → Supabase → repository_dispatch page generation.

## 🔴 Iron Rules (violating any of these has caused real production incidents)

1. **NEVER run `npm run generate`** (full `generate-static-pages.js`). Its sticker/club render paths are stale copies; the 2026-05-27 incident baked raw `{{MULTILINGUAL_META}}` into 712 club + 3534 sticker pages. Canonical generators only:
   - stickers → `scripts/generate-single-sticker.js` (bulk: parallel with `STICKER_PAGE_ONLY=1`)
   - clubs → `scripts/regenerate-club-pages.js`
   - countries → `scripts/regenerate-country-pages.js`
   - cities → `scripts/generate-city-pages.js`
   - homepage + catalogue + sitemaps → `generate-static-pages.js --homepage-only` (this mode ONLY)
2. **Placeholder guards are Chesterton's fences — never remove:** `replacePlaceholders` throws on leftover `{{...}}` (3 copies: `seo-helpers.js`, `generate-static-pages.js`, `generate-city-pages.js`); corpus guard `npm run test:placeholders` scans ALL generated HTML and runs in CI. If a generator throws `missing data keys` — add the key to its data object, do NOT remove the throw. Sample-based `test-generators.js` alone is blind (checks ~5 pages).
3. **`clubs.name` in DB always keeps its flag emoji.** Never UPDATE/normalize emoji out of the DB — Victor enters flags by hand; a club without one is a gap to fill, not noise to clean. `stripEmoji()` in `seo-helpers.js` is a RENDER-layer concern only.
4. **No emoji in `<h1>`/`<h2>`/`<title>` club names.** Flag emoji above the fold cause CLS 0.35+ on Android/Linux (emoji font swap). Every generator writing `CLUB_NAME` into HTML must wrap it in `stripEmoji()`.
5. **Never delete the hourly clubs poller** (n8n `qESondLX2tc7dMmH`). GitHub keeps only 1 pending run per `generate-pages` concurrency group, so bulk club edits lose per-row dispatches; only the poller catches them.
6. **Country dictionaries are triplicated.** A new country code must be added in ALL of: `scripts/seo-helpers.js` (COUNTRY_NAMES/FLAGS), `catalogue.js`, `stickerstat.js` — otherwise pages show the raw code (Kosovo/XKX incident).
7. **After deploy — curl the live prod pages.** Green GitHub Actions ≠ deployed; verify actual URLs.
8. **No anon-role write policies, ever** (migration 006, audit 2026-08-15). Writes go through `authenticated` (can_upload/can_edit) or the service-role key. RLS policies live in the dashboard and are invisible to repo review — any policy change must be mirrored as a migration file. Migrations are applied manually via Management API; never `supabase db push`.

## ⚠️ Known Traps

- Local green `npx vitest run` ≠ green CI: root and `scripts/` have separate `package.json`; CI needs deps installed in both (fixed in `test.yml`, keep the "Install scripts deps" step).
- `npm run test:generators` WRITES real files (`stickers/2332.html`, `2333.html`) — dirty tree after tests is a test artifact; `git restore`, don't commit.
- Batch upload silently skips rows without a selected club — no warning exists yet.
- Rotated Supabase keys do NOT propagate to n8n credentials automatically; edit them by hand in the n8n UI (`Supabase account` credential, used by "SH webhook poster").
- Generators re-read the whole `stickers` table per page (~3.6 s/page) — bulk regeneration is slow by design; don't "optimize" it inline into upload flows.

## Testing

### Unit Tests (Vitest)
- `tests/game-logic.test.js` — TTR difficulty pattern, time ranges, session IDs, CONFIG constants
- `tests/client-sanity.test.js` — no leaked secrets, HTML structure, script load order

### Generator Tests
- `scripts/test-generators.js` — 53 tests for static page generators (sticker, club, country, city)
- `scripts/tests/test-keywords-sync.js`, `test-country-page-sync.js` — sync checks

### E2E Tests (Playwright)
- `tests/e2e/smoke.spec.js` — homepage, quiz, battle, catalogue, leaderboard, sticker pages, mobile, console errors

### Shared Logic
- `lib/game-logic.js` — pure game logic extracted from `script.js` and `shared.js`

### Commands
```bash
npm test              # Run unit tests (Vitest)
npm run test:e2e      # Run E2E smoke tests (Playwright)
npm run test:generators  # Run generator tests
```

### CI/CD
- GitHub Actions: `.github/workflows/test.yml` — unit + generators + E2E on push/PR
- `.github/workflows/generate-sticker-pages.yml` — page generation pipeline

### Test Protocol
When modifying code:
1. Run `npm test` after changes to game logic or client JS
2. Run `npm run test:generators` after changes to generators or templates
3. Run `npm run test:e2e` after changes to HTML pages or frontend
4. If tests fail — fix the issue before committing
5. Never push code that breaks existing tests without updating them

## Quick Reference

- `templates/index-page.html` is SOURCE OF TRUTH for homepage
- All generator scripts must stay in sync (see architecture.md)
- Run `node test-generators.js` after any generator change
- SEO reports are in `seo-reports/` (dated .md files)

## Documentation Maintenance

Stats in `docs/architecture.md` (marked `<!-- AUTO-UPDATED -->`) are refreshed by `generate-static-pages.js`.
After any significant architectural change, update the relevant doc in `docs/`.
