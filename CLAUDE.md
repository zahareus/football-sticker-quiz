# CLAUDE.md - AI Assistant Guide for StickerHunt

This document provides comprehensive guidance for AI assistants working on the StickerHunt codebase.

## Project Overview

**StickerHunt** (stickerhunt.club) is an interactive web application for a global football sticker database and quiz game. Users can:
- Play football sticker identification quizzes with multiple difficulty levels
- Browse a comprehensive sticker catalogue organized by clubs and countries
- Compete on global leaderboards with ELO-based rating systems
- Track personal statistics and sticker collections

## Architecture

### Hybrid Rendering Approach

The project uses a **hybrid rendering strategy**:

| Type | Pages | Rendering |
|------|-------|-----------|
| **Static** | Stickers, clubs, countries | Pre-rendered HTML for SEO |
| **Dynamic** | Quiz, leaderboard, profile | Client-side rendering for interactivity |

### Technology Stack

- **Frontend**: Vanilla JavaScript (no framework), HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hosting**: Vercel (static hosting + serverless functions)
- **Analytics**: Google Tag Manager, Amplitude

## Directory Structure

```
football-sticker-quiz/
├── api/                    # Vercel serverless functions (sitemap.xml)
├── stickers/               # ~2,900 pre-generated static HTML pages
├── clubs/                  # ~656 pre-generated static HTML pages
├── countries/              # ~54 pre-generated static HTML pages
├── scripts/                # Node.js utilities for page generation & image optimization
├── supabase/
│   ├── functions/          # Deno Edge Functions (image optimization)
│   └── migrations/         # Database schema migrations
├── templates/              # HTML templates for static page generation
├── .github/workflows/      # GitHub Actions for automated page generation
│
├── *.html                  # Main application pages
├── *.js                    # Client-side JavaScript modules
├── style.css               # Main stylesheet (3,158 lines)
└── vercel.json             # URL redirects and rewrites
```

## Core JavaScript Files

| File | Purpose |
|------|---------|
| `shared.js` | Shared utilities: Supabase client, auth, image helpers, config |
| `script.js` | Main quiz game logic, question loading, game state |
| `catalogue.js` | Sticker catalogue browsing, filtering, search |
| `leaderboard.js` | Global leaderboard display and ranking |
| `profile.js` | User profile management and statistics |
| `stickerlog.js` | Sticker collection tracking |
| `stickerstat.js` | Statistics and analytics |
| `upload.js` | Sticker upload functionality |
| `battle.js` | Battle/comparison mode |
| `map.js` | Map-based club browsing (Leaflet.js) |
| `index-script.js` | Homepage dynamic elements |

## Main HTML Pages

| Page | Purpose |
|------|---------|
| `index.html` | Homepage with featured sticker carousel |
| `quiz.html` | Main quiz game interface |
| `catalogue.html` | Sticker catalogue browser |
| `leaderboard.html` | Global leaderboard |
| `profile.html` | User profile |
| `battle.html` | Battle/comparison mode |
| `map.html` | Geographic club browser |
| `upload.html` | Sticker upload form |

## Key Configuration

### Supabase

```javascript
// From shared.js - CONFIG object
const CONFIG = {
    SUPABASE_URL: "https://rbmeslzlbsolkxnvesqb.supabase.co",
    SUPABASE_ANON_KEY: "...",  // Public anon key (safe to expose)
    // ... game settings
};
```

### Vercel Routes (vercel.json)

URL redirects for static pages:
- `/catalogue.html?sticker_id=123` → `/stickers/123.html`
- `/catalogue.html?club_id=456` → `/clubs/456.html`
- `/catalogue.html?country=UKR` → `/countries/ukr.html`

## Development Workflow

### Local Development

No build step required - open HTML files directly in browser or use a local server:

```bash
# Simple local server
npx serve .
# or
python -m http.server 8000
```

### Static Page Generation

When adding new stickers or modifying sticker/club/country data:

```bash
cd scripts
npm install                    # First time only
npm run generate               # Generate all static pages
npm run generate:test          # Test with first 10 pages
```

For single sticker pages:
```bash
node generate-single-sticker.js <sticker_id>
```

### Image Optimization

```bash
cd scripts
npm run optimize               # Optimize all images
npm run optimize:dry           # Dry run (preview only)
```

Creates two optimized versions per image:
- `*_web.webp` (600x600, 80% quality) - Quiz/detail view
- `*_thumb.webp` (150x150, 75% quality) - Catalogue thumbnails

### Environment Variables

Required for scripts (create `scripts/.env`):
```
SUPABASE_URL=https://rbmeslzlbsolkxnvesqb.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_role_key>  # For write operations
```

## Code Conventions

### JavaScript Patterns

1. **No framework** - Uses vanilla JavaScript with ES6+ features
2. **Module pattern** - Each file is a self-contained module
3. **Shared configuration** - Use `CONFIG` object from `shared.js`
4. **Supabase client** - Always use `getSupabaseClient()` from `shared.js`
5. **Async/await** - Preferred over Promise chains

### Code Style

- No explicit linting/formatting configuration (no ESLint/Prettier)
- Use consistent indentation (spaces)
- JSDoc comments for functions in shared.js
- Section separators with `// ============` for major sections

### CSS Organization

- Single `style.css` file (~3,158 lines)
- CSS custom properties for theming
- Mobile-first responsive design
- Accent color: `#FFC107` (yellow/gold)
- Component-based class naming

### Template Placeholders

Static page templates use double-brace syntax:
```html
<title>{{PAGE_TITLE}}</title>
<meta name="description" content="{{META_DESCRIPTION}}">
<img src="{{IMAGE_URL}}" alt="{{IMAGE_ALT}}">
```

## Game Modes

| Mode | Description |
|------|-------------|
| **Classic** | Standard timed quiz (10 sec per sticker) |
| **Time To Run (TTR)** | 60-second mode, pattern: 3 easy, 2 medium, 1 hard |
| **Daily Quiz** | 18 stickers with 45-second timer per sticker |

## Database Schema (Key Tables)

- `stickers` - Sticker data with ELO ratings, image URLs, club references
- `votes` - User votes with rating changes
- `user_recent` - Anti-repeat mechanism for quiz pairs
- `profiles` - User profiles and statistics

## CI/CD Pipeline

### GitHub Actions Workflow

**Trigger**: `repository_dispatch` or manual `workflow_dispatch`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Generate sticker pages
4. Regenerate affected club pages
5. Optimize images
6. Commit and push changes

**Secrets required**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## Common Tasks for AI Assistants

### Adding a New Page

1. Create HTML file in root directory
2. Include standard head elements (meta tags, stylesheets)
3. Include `shared.js` before page-specific scripts
4. Initialize Supabase client with `initSupabaseClient()`

### Modifying Quiz Logic

Edit `script.js` - Key functions:
- `loadQuizQuestion()` - Fetch and display question
- `handleAnswer()` - Process user answer
- `calculateScore()` - Score calculation

### Updating Styles

Edit `style.css` - Organized by sections:
- Base styles and CSS variables at top
- Component styles (buttons, cards, modals)
- Page-specific styles
- Responsive breakpoints at bottom

### Adding New Sticker Fields

1. Update database schema (Supabase migrations)
2. Update `scripts/generate-static-pages.js`
3. Update `templates/sticker-page.html`
4. Regenerate static pages

### Debugging

- Browser DevTools for client-side issues
- Check Supabase Dashboard for database/function logs
- Vercel Dashboard for deployment issues

## Important Notes

### What Gets Committed to Git

- All source files (HTML, JS, CSS)
- Generated static pages (`stickers/`, `clubs/`, `countries/`)
- Templates and scripts

### What NOT to Commit

- `node_modules/`
- `.env` files (contain secrets)
- `.DS_Store`

### Performance Considerations

- Static pages provide 70-90% faster First Contentful Paint
- Images are optimized to WebP format (70-95% size reduction)
- CDN caching via Vercel

### SEO Features

Every static page includes:
- Pre-rendered meta tags (title, description, keywords)
- Open Graph tags for social sharing
- Twitter Card meta tags
- Schema.org structured data (JSON-LD)
- Canonical URLs

## Useful Commands

```bash
# Generate all static pages
cd scripts && npm run generate

# Generate single sticker page
cd scripts && node generate-single-sticker.js <id>

# Regenerate club pages
cd scripts && node regenerate-club-pages.js <club_ids>

# Optimize images
cd scripts && npm run optimize

# Deploy to Vercel
vercel deploy --prod
```

## External Documentation

- `STATIC-PAGES.md` - Detailed static page architecture
- `scripts/README.md` - Image optimization setup
- `supabase/functions/optimize-image/README.md` - Edge function deployment

## URLs

- **Production**: https://stickerhunt.club
- **Supabase Project**: https://rbmeslzlbsolkxnvesqb.supabase.co
- **Sitemap**: https://stickerhunt.club/sitemap.xml
