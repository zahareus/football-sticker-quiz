# StickerHunt redesign v4 — Implementation Plan

**Branch:** `redesign-v4` · **Spec:** `docs/design.md` · **Previews:** `docs/design-prototypes/`

Big, high-risk migration: 22 page types, placeholder-coupled generators, JS-rendered pages, 4000+ generated files, SEO-critical. Strategy = **incremental, page-type by page-type, behind verification gates, nothing merged to main until green.** Each phase is independently revertable.

---

## Guiding constraints (from design.md §0 + project memory)

- **Mirror real pages** — no invented content/controls.
- **`replacePlaceholders` throws on any leftover `{{token}}`** → templates and the generator data objects must change together (the Phase-0 placeholder matrix is the contract).
- **Regenerate only via canonical per-type scripts** (`generate-single-sticker.js` per-type, `regenerate-club-pages.js`, `regenerate-country-pages.js`, `regenerate-stickers-batch.js`, `generate-city-pages.js`). The full `generate-static-pages.js` leaks raw placeholders for club/sticker — `--homepage-only` for that one.
- **CLS=0 on Linux/Android** (flag emoji in above-fold text caused CLS — use flag IMG; `stripEmoji` in H1/H2; explicit width/height on every image).
- **Verify live after deploy** — GHA green ≠ Vercel build green; curl production behavior.
- Atomic commits (~100 lines), all on `redesign-v4`.

---

## Phase 0 — Recon & contract freeze (NO functional changes)

Goal: remove the two biggest unknowns (placeholder coupling, CSS class coupling) and build the safety net before touching anything.

**0.1 Placeholder matrix.** For each template (`templates/sticker-page.html`, `club-page.html`, `country-page.html`, `index-page.html`, + cities) list every `{{TOKEN}}` and every generator/data-object that feeds it (`generate-single-sticker.js`, `seo-helpers.js`, `regenerate-*.js`, `generate-city-pages.js`). Output: `docs/_recon/placeholder-matrix.md`. This tells us exactly which generator code must change with each template.

**0.2 Class/JS-hook map.** For each JS-rendered page (`catalogue.js`, `clubs-page.js`, `rating.js`, `stickerlog.js`, `map.js`, `leaderboard.js`, `profile.js`, `battle.js`, `script.js`, `stickerstat.js`, `index-static.js`, upload*/club-create) list the markup classes it emits and the IDs/classes its logic READS (load-bearing hooks). Output: `docs/_recon/js-hooks.md`. Restyle must preserve read-hooks; only re-skin emitted markup.

**0.3 SEO regression harness.** Script that, for one live sample of each page type, extracts the §7 SEO surface (title, meta desc/keywords, canonical, og/twitter, every JSON-LD block, H1, alt patterns, the keyword-density paragraph, internal-link set, multilingual meta) into a JSON snapshot. After each page-type rebuild, re-extract and DIFF — fail on any dropped element. Output: `scripts/tests/seo-snapshot.js` + baseline snapshots.

**0.4 Critical-CSS pipeline check.** Confirm `scripts/build-critical-css.js` flow so Phase 1 can regenerate inlined critical CSS.

**Gate 0:** matrix + hook map + SEO baseline committed. No page changed yet.

---

## Phase 1 — CSS foundation (additive, non-breaking)

- Fold `docs/design-prototypes/shared.css` into `style.css` as the new component/plate/token layer. **Additive first**: keep legacy rules so un-migrated pages still render; new `.sh-*`/`.hdr`/`.chip`/etc. become available. Bump `style.css?v=6`.
- Regenerate inlined critical CSS (`build-critical-css.js`) — but per-page critical CSS changes as each page migrates, so re-run at the end of each later phase too.
- Self-host check: Poppins woff2 already self-hosted (keep). flagcdn vs self-host flags — decide (flagcdn is external; prefer the generator's existing flag mechanism / self-host for CWV).

**Gate 1:** `npm test` green; spot-check 3 existing pages unchanged; new classes resolve.

---

## Phase 2 — Static-generated DETAIL pages (the SEO core) — **highest care**

Order: **sticker → club → country → city** (sticker first: most pages, richest schema, the template others borrow patterns from).

Per page type, repeat this loop:
1. Add new plate/component render helpers to `seo-helpers.js` (`stPlate`, `clPlate`, `coPlate`, `ciPlate`, chips, metrics, provenance, etc.) — pure functions, unit-tested.
2. Rewrite `templates/{type}-page.html` body to design.md §5 structure. **Keep every SEO token** (title/meta/canonical/og/twitter/JSON-LD/multilingual/alts/context-paragraph) — move, don't delete. Add new tokens.
3. Update the data object in **all** generators feeding that template (per Phase-0 matrix): `generate-single-sticker.js` + `regenerate-{club,country}-pages.js` + batch scripts + `generate-city-pages.js`. Keep in sync or `replacePlaceholders` crashes.
4. `npm run test:generators` + `test:placeholders` + `test-country-page-sync`.
5. Regenerate ONE sample page → run SEO-snapshot diff (Gate) + visual vs prototype + CLS check.
6. Regenerate ALL of that type via its canonical script. Re-diff a random sample.
7. Atomic commit.

Special care:
- Sticker: preserve LCP preload, `/img/*` proxy, ImageObject JSON-LD, BreadcrumbList, multilingual alt, the context paragraph (now relocated to About — keep the text, keyword density intact). 2 metrics (Answer Rate removed from UI but keep `quiz_*` data hooks if rating JS needs them — verify).
- Club: CollectionPage+SportsTeam schema, wiki section (Wiki link only in tag block, no URL row), 3 metrics, gallery, no quiz CTA.
- Country: ItemList of ALL clubs (keep), flag as IMG in H1 (CLS — verify), all-clubs grid (no truncation), #rank-by-stickers metric.
- City: faithful 1:1 (H1 with count, Population fact, wiki intro+Source, 3 info lines, gallery, Sticker Locations). `generate-city-pages.js` feeds it.

**Gate 2 (per type):** generator tests green · SEO-diff clean · CLS=0 desktop+Linux/Android · prototype-match · sample curl OK.

---

## Phase 3 — Hub / index pages (JS-rendered)

Pages: home (`index.html`+`index-static.js`), catalogue (`catalogue.html`+`catalogue.js`), clubs (`clubs.html`+`clubs-page.js`), cities index (`cities/index.html`), rating (`rating.html`+`rating.js`), stickerlog (`stickerlog.html`+`stickerlog.js`).

- Rewrite each HTML shell + its JS render functions to new structure/classes/plate helpers (shared JS plate renderers in `shared.js`).
- **Resolve catalogue dual-render** (static prerender vs `catalogue.js` main render with mismatched stats) — pick ONE source of truth, gut the redundant renderer, keep sub-route handlers + meta/canonical updaters.
- **Extend Supabase selects**: rating + stickerlog plates need `image_url` (+ rating for log) — current queries don't fetch them; add or plates render broken. Add `.order('id')` tiebreaker to rating sort.
- 100/page on rating, stickerlog, clubs. Section-head metas → links to real pages. Home: drop Game Modes; plain-text stats. Cities index = `.sh-ci--col`.

**Gate 3:** SEO-diff · pagination/state behavior · plate images load · CLS · escape user strings (XSS in rating/stickerlog innerHTML).

---

## Phase 4 — Interactive game pages

Pages: quiz (`quiz.html`+`script.js`), battle (`battle.html`+`battle.js`), leaderboard (`leaderboard.html`+`leaderboard.js`), map (`map.html`+`map.js`), profile (`profile.html`+`profile.js`), stickerstat (`stickerstat.html`+`stickerstat.js`).

- Re-skin shells + the JS that emits markup (leaderboard 4 sections, profile blocks, stickerstat chart+tables, battle cards, quiz states). **Preserve every read-hook** from Phase-0 map (`#sticker-image`, `#options`, `#timer`, `#lives`, `#score`, body state classes, `correct-answer`/`incorrect-answer`/heart/timer animation class names, etc.). Auth nodes are JS-toggled with inline `!important` — don't rely on stylesheet display for them.
- Map: remove invented filters (none in real). Leaderboard: time + Results/Players filters + 4 difficulty sections (not pills). Stickerstat: real chart (Chart.js canvas) + two top-20 tables.

**Gate 4:** play a full quiz round, a battle vote, leaderboard filter switch, profile load, map markers (manual + extend `tests/e2e/smoke.spec.js`).

---

## Phase 5 — Forms + static

- `upload.html`/`upload-batch.html`/`club-create.html`: re-skin, keep exact fields/flow/JS hooks (batch = rows-after-drop). `about/terms/privacy`: re-skin wrapper, **keep real prose verbatim**, no bottom CTA/back-link.

**Gate 5:** admin flows still submit; access-denied state intact.

---

## Phase 6 — Global chrome unification

- Sticky header (logo + nav + Play Quiz + auth) and the **single canonical footer** on every page (extract to a shared partial/JS include where pages are static HTML; for generated pages, into the templates). Automated check: extract `<footer>` from every page type → assert identical (already passes on prototypes).

**Gate 6:** footer-identical assertion green sitewide; sticky header on all.

---

## Phase 7 — Full regeneration + sitewide verification

- Regenerate ALL pages via canonical per-type scripts; regenerate sitemaps (`generate-sitemaps.js`).
- Full suite: `npm test`, `npm run test:generators`, `test:placeholders`, `test-country-page-sync`, `npm run test:e2e`.
- SEO-snapshot diff across a sample of every type — zero dropped elements.
- CLS audit (the 2026-05 overhaul method: Playwright CLS trace, Linux/Android emoji-font check).
- Deploy preview → **curl production** for new behavior on each page type (Vercel build can fail where GHA passed).

**Gate 7:** all tests green · SEO clean · CLS=0 · live curl OK.

---

## Phase 8 — Cleanup & docs

- Remove dead legacy CSS now unreferenced; final polish pass; update `docs/architecture.md` (auto-stats) + `docs/seo.md`; bump cache versions.
- Merge `redesign-v4` → main only after Gate 7 + Victor sign-off.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Template token ↔ generator desync → generation crash | Phase-0 matrix; change together; `test:placeholders` after each |
| SEO regression (silent) | Phase-0 snapshot harness; diff gate every phase |
| CLS regression (flags/emoji/fonts) | flag IMG + stripEmoji + width/height; CLS audit gate |
| Catalogue double-render / stale stats | resolve to one renderer in Phase 3 |
| rating/stickerlog plates broken (no image in query) | extend Supabase select in Phase 3 |
| Broken JS game hooks | Phase-0 hook map; preserve read-hooks; e2e gate |
| 4000+ page regen time/races | canonical per-type scripts; STICKER_PAGE_ONLY parallelism guard |
| Vercel build passes locally, fails deploy | curl production after deploy (Gate 7) |
| Data bug "City, Country, Country" | flag to Victor, do NOT auto-rewrite in a layout pass |

## Effort shape (relative)

Phase 0 small-but-critical · Phase 2 is the bulk (4 detail types × full loop) · Phase 3–4 medium each · Phase 5–6 small · Phase 7 medium. Phases 2 detail-types and some Phase-4 pages parallelize well via worktree-isolated agents under max-effort.

## Suggested first action

Execute **Phase 0** (recon + SEO harness) and report the placeholder matrix + hook map before any page is touched — that is the contract everything else depends on.
