# StickerHunt

Global football fan sticker database with quiz, battle mode, and interactive map.

**Domain:** https://stickerhunt.club/
**Repo:** https://github.com/zahareus/football-sticker-quiz/
**Backend:** Supabase (`rbmeslzlbsolkxnvesqb.supabase.co`)
**Hosting:** Vercel + GitHub Pages

## Documentation

- [Architecture](docs/architecture.md) -- tech stack, pipelines, database, generators, file structure
- [SEO](docs/seo.md) -- strategy, performance metrics, completed improvements
- [Commands](docs/commands.md) -- generation, optimization, testing, deployment

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
