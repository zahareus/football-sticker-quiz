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

## Security follow-ups (from CLAUDE-SECURITY-20260815-200225)

- **Votes are not bound to a served pair** (F9/F15). Investigated 16.08, decided
  NOT to build for now — the measurement that would justify it is already
  available for free. Across all 3392 votes: 1130 sessions, 3.1 votes each on
  average, busiest session 581 votes spread over 127 hours and 2 days, peak 29
  votes in a minute (one per two seconds — reachable by hand), and **zero**
  sessions sustaining more than 30 votes/minute. That is a human playing a lot,
  not a script.

  Two premortems shaped the design if it is ever needed. Do NOT use a separate
  served-pairs table: every anonymous pair request would become an insert.
  Use a `served_pairs TEXT[]` column on `user_recent`, keep ~10 hashes (built
  with the existing `LEAST(a,b) || ':' || GREATEST(a,b)`, same as `002:212`),
  because `battle.js:170` prefetches the next pair before the current vote
  lands — a one-pair window would reject nearly every honest vote.

  The reason it was not shipped as a harmless log-only phase: it moves a WRITE
  onto `get_battle_pair`, which today only reads and therefore cannot fail. With
  a write it can hit the `user_recent_session_id_shape` constraint from 007, a
  lock wait, or a genuine deadlock — the prefetch overlaps an in-flight
  `submit_vote`, one side holding `user_recent` and waiting on `stickers` while
  the other holds the reverse. The player would see an error instead of a pair,
  and `battle.js:286` shows nothing at all when a vote fails. Risking the game
  for a counter that blocks nobody is the wrong trade.

  If picked up: write strictly AFTER `UPDATE stickers SET last_shown_at` so both
  functions take locks in the same order; wrap the write in
  `EXCEPTION WHEN OTHERS THEN NULL`; `UPDATE`-only, never `INSERT`, or anonymous
  pair requests start creating rows and reopen F32 through another door; dump
  the live `pg_get_functiondef('get_battle_pair')` first, since the migration
  files are not proof of what runs in production.
- **`new-trigger-regeneration` can be triggered by any signed-in account.** The
  Edge Function holds a GITHUB_TOKEN with dispatch rights and only requires a
  valid JWT — not `can_upload`. Since ids are now normalised to digits the worst
  case is a spurious regeneration run, so this is an observation, not a hole.
  (Checked 16.08: it does `.join(',')`, so it does NOT send the array-shaped
  payload an earlier review suspected — that concern is closed.)
- **`optimize-image` is not deployed at all.** Only `trigger-regeneration` exists
  in the project; the hardening committed 16.08 is future-proofing. Nothing to
  configure, and no secret to set, unless the function is ever deployed — at
  which point it needs `OPTIMIZE_IMAGE_WEBHOOK_SECRET` plus the matching
  `x-webhook-secret` header on whatever calls it.
- The three sibling workflows with `github.event.inputs.days` in `run:`
  (`reconcile-images.yml:48`, `reconcile-stickers.yml:53`,
  `backfill-images.yml:49`) — `workflow_dispatch` only, so the value comes from
  someone who already has repo write. Different trust boundary; low priority.

## Earlier deferred

- Club #865 "SC Harten" is likely a typo of Sport-Club **Herten** — renaming
  changes the page URL; awaiting Victor's call.
- ~905 pages with invisible junk in map popups — heal via city sweeps as
  uploads touch those cities (mass sweep cancelled 15.08: ~270 MB git cost).
