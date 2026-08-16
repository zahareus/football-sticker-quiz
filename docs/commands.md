# StickerHunt Commands

## Page Generation

> 🔴 **Never run `npm run generate`.** Its sticker and club render paths in
> `generate-static-pages.js` are stale copies; running it on 2026-05-27 baked a
> raw `{{MULTILINGUAL_META}}` into 712 club and 3534 sticker pages. Use the
> canonical generator for the page type you actually want (iron rule 1 in
> `CLAUDE.md`). The `generate` / `generate:test` scripts stay in `package.json`
> for now, but nothing should call them.

```bash
cd "/Users/victorzakharchenko/Claude Code/stickerhunt/scripts"

# Install dependencies (first time)
npm install

# One sticker page (canonical). STICKER_PAGE_ONLY=1 skips the related club /
# country / nav rebuilds, which is what makes bulk runs safe to parallelise.
node generate-single-sticker.js <sticker_id>
STICKER_PAGE_ONLY=1 node generate-single-sticker.js <sticker_id>

# Club pages (canonical) — comma-separated ids; also refreshes their countries
node regenerate-club-pages.js 1175,1183

# Country pages (canonical) — takes no arguments, rebuilds every country
node regenerate-country-pages.js

# City pages (canonical) — takes no arguments, rebuilds every city
node generate-city-pages.js

# Homepage + catalogue + sitemaps — this mode ONLY
node generate-static-pages.js --homepage-only
```

## Image Optimization

```bash
cd "/Users/victorzakharchenko/Claude Code/stickerhunt/scripts"

# Dry run (preview what will be optimized)
npm run optimize:dry

# Optimize all images
npm run optimize
```

Note: full optimization takes 30-60 minutes for all stickers.

## Git Workflow

```bash
cd "/Users/victorzakharchenko/Claude Code/stickerhunt"

git add stickers/ clubs/ countries/ cities/ sitemap*.xml
git commit -m "Regenerate static pages"
git push
```

## Testing

```bash
cd "/Users/victorzakharchenko/Claude Code/stickerhunt/scripts"

# Run all 53 generator tests
node test-generators.js
```

Run after ANY generator change.

## Uploading stickers

- **Single (with social post):** `upload.html` — one sticker, "Post to media" checkbox.
- **Batch (no social post):** `upload-batch.html` — drop many JPEGs anywhere on the page, one row each (club + difficulty + EXIF geo), one "Upload all". On finish: one n8n webhook -> one generation run for the whole batch -> Telegram summary when done.

## GitHub Actions (remote)

Triggered automatically by n8n on sticker upload. Manual trigger (single or comma-list of IDs):

```bash
curl -X POST \
  -H "Authorization: token $GITHUB_PAT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/zahareus/football-sticker-quiz/dispatches \
  -d '{"event_type":"generate-sticker-pages","client_payload":{"sticker_ids":"123,124,125","club_ids":"27"}}'
```

Add `"notify":"true"` (plus `n_stickers`/`n_clubs`/`n_countries`) to the payload to get the Telegram summary at the end (this is what the batch uploader sends).

## Supabase Queries

```sql
-- Check sticker/club/country counts
SELECT 'stickers' as type, COUNT(*) as count FROM stickers
UNION ALL SELECT 'clubs', COUNT(*) FROM clubs
UNION ALL SELECT 'countries', COUNT(DISTINCT country) FROM clubs;
```
