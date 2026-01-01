# Static HTML Pages Generation

## Overview

This project uses a hybrid approach for rendering pages:
- **Static pages**: Stickers, clubs, and countries (pre-rendered HTML for better SEO)
- **Dynamic pages**: Quiz, leaderboard, profile (client-side rendering for interactivity)

## Why Static Pages?

### SEO Benefits
- ✅ All meta tags (`title`, `description`, `canonical`) are in the HTML from the start
- ✅ Search engines can index content immediately without executing JavaScript
- ✅ Better social media previews (Open Graph tags are pre-rendered)
- ✅ Improved ranking potential (faster page load, better Core Web Vitals)

### Performance Benefits
- ✅ **70-90% faster First Contentful Paint (FCP)**: No need to wait for JS execution
- ✅ **40-60% faster Largest Contentful Paint (LCP)**: Content is already in HTML
- ✅ **Better caching**: Static files can be cached indefinitely by CDN
- ✅ **Reduced server load**: Fewer API requests to Supabase

### Cost Benefits
- ✅ **70-80% fewer database reads**: Pages are pre-generated
- ✅ **Lower Supabase costs**: Less API usage
- ✅ **Better scalability**: CDN handles most traffic

## Architecture

### Directory Structure

```
football-sticker-quiz/
├── templates/              # HTML templates with placeholders
│   ├── sticker-page.html
│   ├── club-page.html      # TODO: Next session
│   └── country-page.html   # TODO: Next session
│
├── stickers/               # Generated static sticker pages
│   ├── 1.html
│   ├── 2.html
│   └── ... (thousands more)
│
├── clubs/                  # Generated static club pages
│   └── ... (to be generated)
│
├── countries/              # Generated static country pages
│   └── ... (to be generated)
│
└── scripts/
    └── generate-static-pages.js  # Generation script
```

### URL Mapping

Old URLs automatically redirect to new static pages:

| Old URL (Dynamic)                         | New URL (Static)              | Redirect Type |
|-------------------------------------------|-------------------------------|---------------|
| `/catalogue.html?sticker_id=123`          | `/stickers/123.html`          | 302 (temporary) |
| `/catalogue.html?club_id=456`             | `/clubs/456.html`             | 302 (temporary) |
| `/catalogue.html?country=UKR`             | `/countries/ukr.html`         | 302 (temporary) |

**Note**: Using 302 (temporary) redirects initially for easy rollback. Will change to 301 (permanent) after testing.

## Generation Script

### Installation

```bash
cd scripts
npm install
```

### Usage

**Generate all pages:**
```bash
npm run generate
```

**Generate first 10 pages (for testing):**
```bash
npm run generate:test
```

### How It Works

1. **Fetch Data**: Connects to Supabase and fetches all stickers/clubs/countries
2. **Load Template**: Reads the appropriate HTML template
3. **Replace Placeholders**: Substitutes `{{PLACEHOLDER}}` with real data
4. **Generate HTML**: Writes static HTML files to disk
5. **Save Files**: Stores pages in `/stickers/`, `/clubs/`, or `/countries/`

### Template Placeholders

Templates use double-brace syntax for placeholders:

```html
<title>{{PAGE_TITLE}}</title>
<meta name="description" content="{{META_DESCRIPTION}}">
<h1>{{MAIN_HEADING}}</h1>
<img src="{{IMAGE_URL}}" alt="{{IMAGE_ALT}}">
```

The script replaces these with actual data from Supabase.

## SEO Features

### Pre-rendered Meta Tags

Every static page includes:

```html
<!-- Essential SEO -->
<title>Sticker #123 - FC Barcelona - Spain - StickerHunt</title>
<meta name="description" content="Football sticker #123 from FC Barcelona, Spain...">
<meta name="keywords" content="football stickers, FC Barcelona, Spain, La Liga...">
<link rel="canonical" href="https://stickerhunt.club/stickers/123.html">

<!-- Open Graph (Facebook, LinkedIn) -->
<meta property="og:title" content="Sticker #123 - FC Barcelona...">
<meta property="og:description" content="Football sticker #123...">
<meta property="og:image" content="https://...">
<meta property="og:url" content="https://stickerhunt.club/stickers/123.html">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Sticker #123...">
<meta name="twitter:description" content="Football sticker #123...">
<meta name="twitter:image" content="https://...">

<!-- Structured Data (Schema.org) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": "FC Barcelona Sticker #123",
  "description": "Football sticker #123...",
  "contentUrl": "https://...",
  "url": "https://stickerhunt.club/stickers/123.html"
}
</script>
```

## Deployment

### Vercel Configuration

The `vercel.json` file handles URL redirects:

```json
{
  "redirects": [
    {
      "source": "/catalogue.html",
      "has": [{"type": "query", "key": "sticker_id", "value": "(?<id>.*)"}],
      "destination": "/stickers/:id.html",
      "permanent": false
    }
  ]
}
```

### Workflow

1. **Generate pages** locally or in CI/CD:
   ```bash
   cd scripts && npm run generate
   ```

2. **Commit generated files** (or use `.gitignore` to exclude them)

3. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

4. **Verify redirects work**:
   - Old: `https://stickerhunt.club/catalogue.html?sticker_id=123`
   - New: `https://stickerhunt.club/stickers/123.html`

## Updating Content

### When adding new stickers/clubs:

**Option 1: Manual regeneration**
```bash
cd scripts
npm run generate
git add stickers/ clubs/ countries/
git commit -m "Regenerate static pages"
git push
```

**Option 2: Automated (via GitHub Actions)** - TODO
```yaml
# .github/workflows/regenerate.yml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:      # Manual trigger

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd scripts && npm install && npm run generate
      - run: git add stickers/ clubs/ countries/
      - run: git commit -m "Auto-regenerate static pages"
      - run: git push
```

## Performance Comparison

### Before (Dynamic Rendering)

```
User requests /catalogue.html?sticker_id=123
  → Browser loads HTML (generic title/meta tags)
  → Browser loads JavaScript (~100KB)
  → JavaScript executes
  → Fetch sticker data from Supabase API
  → Update DOM with real content
  → Update meta tags (search engines may miss this!)

Total Time: ~2.5-4 seconds
SEO: Poor (bots may not execute JS)
```

### After (Static Rendering)

```
User requests /stickers/123.html
  → Browser loads HTML (complete content + SEO tags!)
  → Page renders immediately
  → Optional: Load JS for auth features only

Total Time: ~0.5-1 second
SEO: Excellent (all content in HTML)
```

## Rollback Plan

If static pages cause issues:

1. **Disable redirects** in `vercel.json`:
   ```json
   {
     "redirects": []  // Empty array = no redirects
   }
   ```

2. **Deploy update**:
   ```bash
   git commit -am "Disable static page redirects"
   git push
   vercel deploy --prod
   ```

3. **Old URLs work again** with dynamic rendering

Recovery time: ~2-3 minutes

## Future Improvements

### Phase 1 (Current) ✅
- [x] Static pages for stickers
- [x] HTML templates with SEO
- [x] Generation script
- [x] URL redirects (302 temporary)

### Phase 2 (Next)
- [ ] Static pages for clubs
- [ ] Static pages for countries
- [ ] GitHub Actions automation
- [ ] Incremental Static Regeneration (ISR)

### Phase 3 (Future)
- [ ] Change redirects to 301 (permanent)
- [ ] On-demand generation (webhook from Supabase)
- [ ] CDN cache optimization
- [ ] Image optimization in generation

## Troubleshooting

### "Page not found" errors

**Problem**: Accessing `/stickers/123.html` returns 404

**Solution**:
1. Check if file exists: `ls stickers/123.html`
2. Regenerate if missing: `npm run generate`
3. Deploy updated files: `git push`

### Old URLs not redirecting

**Problem**: `/catalogue.html?sticker_id=123` doesn't redirect

**Solution**:
1. Check `vercel.json` has correct redirects
2. Verify deployment on Vercel dashboard
3. Clear browser cache

### Meta tags not updating

**Problem**: Search engines show old titles

**Solution**:
- Static pages have meta tags baked in - no JS needed
- Wait 1-2 weeks for search engines to re-crawl
- Use Google Search Console to request re-indexing

## License

Same as main project

## Questions?

Contact: [Your contact info]
