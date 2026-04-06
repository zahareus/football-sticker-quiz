# StickerHunt Commands

## Page Generation

```bash
cd "/Users/victorzakharchenko/Claude Code/stickerhunt/scripts"

# Install dependencies (first time)
npm install

# Generate ALL pages (stickers + clubs + countries + cities)
npm run generate

# Test generation (first 10)
npm run generate:test

# Homepage only
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

## GitHub Actions (remote)

Triggered automatically by n8n on sticker upload. Manual trigger:

```bash
curl -X POST \
  -H "Authorization: token $GITHUB_PAT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/zahareus/football-sticker-quiz/dispatches \
  -d '{"event_type":"generate-sticker-pages","client_payload":{"sticker_ids":"123","club_ids":"27"}}'
```

## Supabase Queries

```sql
-- Check sticker/club/country counts
SELECT 'stickers' as type, COUNT(*) as count FROM stickers
UNION ALL SELECT 'clubs', COUNT(*) FROM clubs
UNION ALL SELECT 'countries', COUNT(DISTINCT country) FROM clubs;
```
