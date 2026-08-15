# Backlog

Deferred items with context. A major functional + visual overhaul is planned
(new options, new features, new visual style) — everything here is minor
against that backdrop; pick these up during or after the overhaul touches
the same area.

## From the 2026-08-15 audit (all verified, deliberately deferred)

- **Corpus healing: 2352/4386 sticker pages miss the "Similar from country" block.**
  Root cause fixed (`d925ccae6` — prev-regeneration now passes all 7 args), so
  no page degrades anymore; old pages stay stripped until regenerated.
  Plan when picked up: local batches of 200–300 via `regenerate-stickers-batch.js`,
  one commit per batch, outside upload hours. NOT via GHA (blocks the
  `generate-pages` concurrency group for 2+ hours). If the overhaul regenerates
  the corpus anyway (new visual style will), this heals for free — prefer that.
- TTR percentile compares against the classic Easy pool instead of its own
  (`script.js:1893`; TTR scores save with `difficulty=null` but query `.eq(1)`).
- `getPercentileRank` has no limit → silently truncates at PostgREST's 1000-row
  cap once a difficulty pool grows past it (352 rows today). Fix: count-based
  `.gt(score)` + `head:true` like `getRankForTimeframe`.
- Batch upload UI claims "sent for generation / Telegram will arrive" even when
  the n8n webhook call failed (`upload-batch.js:565-600`); single-upload path
  surfaces the failure — port that half back.
- Single upload: submit isn't gated on EXIF/geocode completion when replacing
  a file — narrow race that saves a sticker without GPS/location
  (`upload.js:254-444`; batch path awaits `geocodeChain`, single should too).
- `upload.js:228` injects `club.name` raw into a `data-name` attribute —
  add `escapeAttr` like `upload-batch.js:309` (latent: no quoted names in DB today).
- No sync test for the triplicated country dictionaries (iron rule 6) —
  ~20-line test asserting seo-helpers' code set ⊆ catalogue.js + stickerstat.js.
- No runtime interlock on full-mode `generate-static-pages.js` (iron rule 1) —
  3-line refusal unless `--homepage-only`/`--test`/`FORCE_FULL_GENERATE=1`.
- `og:image`/`twitter:image` on city pages carry raw `%2F` Supabase URLs
  (work fine, cosmetic split identity) — normalize via `toLocalImgAbs` if touched.
- supabase-js loaded from jsdelivr CDN without SRI (leaflet already has it).

## Earlier deferred

- Club #865 "SC Harten" is likely a typo of Sport-Club **Herten** — renaming
  changes the page URL; awaiting Victor's call.
- ~905 pages with invisible junk in map popups — heal via city sweeps as
  uploads touch those cities (mass sweep cancelled 15.08: ~270 MB git cost).
