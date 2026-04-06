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

## Quick Reference

- `templates/index-page.html` is SOURCE OF TRUTH for homepage
- All generator scripts must stay in sync (see architecture.md)
- Run `node test-generators.js` after any generator change
- SEO reports are in `seo-reports/` (dated .md files)

## Documentation Maintenance

Stats in `docs/architecture.md` (marked `<!-- AUTO-UPDATED -->`) are refreshed by `generate-static-pages.js`.
After any significant architectural change, update the relevant doc in `docs/`.
