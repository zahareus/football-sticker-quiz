# StickerHunt SEO

## Current Performance (31.03.2026)

| Metric | Value | Change vs baseline (22.02) |
|--------|-------|---------------------------|
| Clicks/28d | 196 | +717% |
| Impressions/28d | 4,063 | -- |
| CTR | 4.82% | +52% |
| Avg position | 8.5 | +1.8 up |

**Record:** 20 clicks/day (17 March 2026)

## SEO Architecture

### Page Types & Title Format

| Type | Title | Meta description |
|------|-------|-----------------|
| Sticker | `{Club} Sticker #{id} -- Identify This Football Sticker \| StickerHunt` | `Football sticker #{id} from {Club} ({Country})...` |
| Club | `{Club} Stickers -- {N} Football Stickers \| StickerHunt` | `Browse {N} {Club} football stickers...` |
| Country | `{Country} Football Stickers -- {N} Clubs \| StickerHunt` | `Browse football stickers from {N} clubs...` |
| Homepage | `StickerHunt -- Football Sticker Database & Quiz \| N+ Stickers` | -- |

`stripEmoji()` removes emoji from `<title>` but keeps them in `<h1>`.

### Schema.org (JSON-LD)

- **Sticker pages:** ImageObject, BreadcrumbList, club mini-card
- **Club pages:** SportsTeam (foundingDate, StadiumOrArena), CollectionPage, BreadcrumbList
- **Country pages:** ItemList, BreadcrumbList
- **City pages:** multilingual meta

Breadcrumb path: `Home > Catalogue > Country > Club > Sticker #N`

### SEO Features (current)

1. Top-rated OG images (ELO-based, WebP)
2. Descriptive alt text with club/city/country/league
3. Multilingual meta in 13 languages
4. Country page featured gallery (top 6 stickers)
5. AI-enriched club descriptions (114 clubs via Claude Haiku)
6. Wiki facts cards on club pages (558/675 coverage)
7. Internal links: "Other clubs from {Country}" on club pages
8. City pages with Leaflet map and Wikipedia intro

### URL Redirects (vercel.json)

```
/catalogue.html?sticker_id=123 -> /stickers/123.html (302)
/catalogue.html?club_id=456   -> /clubs/456.html (302)
/catalogue.html?country=UKR   -> /countries/ukr.html (302)
```

### Sitemaps

- `sitemap.xml` -- index
- `sitemap-main.xml` -- core pages
- `sitemap-stickers-1/2/3.xml` -- stickers (split)
- `sitemap-cities.xml` -- city pages

### Monitoring

- **GSC property:** sc-domain:stickerhunt.club
- **Google Analytics:** G-4Y0MJKGDZS
- **PostHog:** phc_vCytndcOuQlIFqf3BGRcoERk2lzpS8w72vA14Hx5qDV
- **SEO reports:** `seo-reports/` directory (dated .md files)

## Strategy

### Core Problem

StickerHunt creates a new category (fan sticker identification) with almost no existing search demand. Technical SEO is solid. Growth requires content strategy.

### No Direct Competitors

Nobody else does fan sticker identification. Adjacent competitors: Redbubble/Etsy (sell stickers), Sporcle (Panini quizzes), football-logos.cc (logo downloads).

### Three Growth Strategies (prioritized)

1. **Content that defines the category** -- 5-8 articles about fan sticker culture. Long-term (6-12 months).
2. **Geographic content** -- "Football stickers spotted in {City}" pages. Leverages unique geo-data. Mid-term (3-6 months). Partially done with city pages.
3. **Quiz as SEO product** -- Improve quiz.html SEO, add FAQ, descriptive landing. Short-term (2-4 months).

### What NOT to do

- Club logos (legal risk + impossible to compete)
- Panini/MatchAttax content (wrong product)
- Technical-only SEO optimization (already done)

## Completed Improvements

### 22.02.2026 -- SEO Foundation
- New title/meta for all stickers, clubs, countries
- Text descriptions on club pages
- BreadcrumbList JSON-LD
- stripEmoji() for titles

### 17.03.2026 -- Enrichment
- Wiki facts cards on club pages (Wikidata API)
- Sticker page mini-cards and "more from club" strips
- City pages (22) with maps and Wikipedia intros
- Broken links fixed, empty clubs removed
- All generators synchronized

### Backlog

- Country page enrichment (Wikipedia intro, league grouping)
- Culture content hub (editorial articles)
- Collection pages (rarest, newest, top-rated) -- deprioritized
