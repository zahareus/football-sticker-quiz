# StickerHunt — Design System v3 Status

**Created:** 2026-04-15
**Branch:** `ds-v3-clean`
**Purpose:** Editorial redesign proof-of-concept — waiting for Victor's decision.

## Context (how we got here)

After multiple iterative attempts on the `impeccable-redesign` and `design-system-v2` branches produced inconsistent "Frankenstein" results (new styles layered over legacy CSS with conflicting specificity), Victor asked for Variant A: **start completely from scratch**. Delete the old CSS, rewrite HTML structure, think UX-first then UI, test via Playwright screenshots before handing back.

This branch is that fresh start. **It is not deployed and not merged.** Main/production is untouched.

## What's done (3 pages only)

### CSS
- `style.legacy.css` — renamed old 4156-line stylesheet, kept for reference
- `style.css` — rewritten from scratch (~1100 lines), pure design system with tokens
  - Warm paper palette: `#F5F1E8` bg, `#1C1A15` ink, `#8B2332` burgundy accent
  - Typography: Fraunces italic display + Inter Tight body
  - 3 button variants (primary/secondary/ghost) + sizes
  - 3 link roles (prose/ghost/arrow)
  - 3 card patterns (media/data/action)
  - Unified stat-row definition list
  - Breadcrumb kicker, section-head rule, footer, forms — all consistent
  - Mobile breakpoints at 768px and 480px
  - Focus states, reduced-motion support

### HTML (rewritten bodies, SEO preserved)
- `index.html` — home
  - Editorial hero: italic "The World's Football Sticker Database" + 3 big serif stats + underline search + 2 CTAs
  - New site-nav in header (Quiz / Battle / Catalogue / Map / Leaderboard) — unified across all updated pages
  - Daily challenge action-card (pull-quote style with burgundy rule)
  - Recently hunted, Top rated — horizontal strips (sticker cards with paper-lift hover)
  - By country — 6-col grid with top-3 featured (larger flags, burgundy counts)
  - By city — 3-col text table (replaces old card grid, more readable)
  - Map preview + link to full map
  - Removed: `<hr>` dividers, duplicate "Game Modes" section (it's on /quiz.html), inline styles, "More Statistics →" clutter
- `quiz.html`
  - Landing with 3 big mode cards (Classic / Time to Run / Hunt them all), each with description + metadata line
  - Sign-in as secondary action, not competing with mode choice
  - Difficulty picker restructured as responsive grid with descriptions
  - Game area: sticker image left, info + options right (grid-2 desktop, stacked mobile)
  - Result panel: clear hierarchy, final score in big serif, action list stacked
  - Inline leaderboard with filter pills
  - **Fix:** script.js forces `display:flex` on `#landing-page`, overridden to `flex-direction:column` in CSS
  - Added hidden placeholders for `intro-text-element`, `player-stats-element`, `personal-rank-container`, `timeframe-ranks-container` (required by script.js, else Application Error)
- `stickers/3201.html` — proof-of-concept for sticker detail template
  - Editorial breadcrumb kicker top
  - Large italic Fraunces club name
  - Pull-quote club mini-card (Est. 1906 · Ligue 1 · Stade Bollaert-Delelis)
  - 6 unified stat rows (Like Rate, Answer Rate, Difficulty, Added, Hunted, Location) — dotted definition list
  - Key stats (rating, answer rate) in Fraunces burgundy
  - **New "Continue" CTA block** at bottom: "Quiz me on this club" + "See all from [Club]" — fixes dead-end UX problem
  - Previous / Next nav buttons as ghost-style
  - "More from [Club]" horizontal strip

## What's NOT done (explicit)

- **Other 14 root HTML pages** (catalogue, battle, about, clubs, leaderboard, map, profile, upload, etc.) — still have old body HTML. With new style.css they'll look half-styled / partially broken until rewritten.
- **4029 generated pages** (other stickers, clubs, countries, cities) — not updated on this branch. They still reference `/style.css` though, so buttons/header/typography will cascade but layout may break.
- **Templates** in `templates/*.html` — not updated. Future regeneration will use old HTML structure.
- **Generators** (`scripts/*.js`) — not updated.

## Screenshots

Taken via Playwright on `ds-v3-clean` branch:
- `/tmp/ds-home-desktop.png` (1440×900)
- `/tmp/ds-home-mobile.png` (390×844)
- `/tmp/ds-quiz-desktop.png` / `/tmp/ds-quiz-mobile.png`
- `/tmp/ds-sticker-desktop.png` / `/tmp/ds-sticker-mobile.png`

## How to review

```bash
cd ~/Claude\ Code/stickerhunt
git checkout ds-v3-clean
python3 -m http.server 8765
```

Open and hard-refresh (Cmd+Shift+R):
- http://localhost:8765/
- http://localhost:8765/quiz.html
- http://localhost:8765/stickers/3201.html

**Do NOT open other pages** — they're broken on this branch by design.

To compare with prod:
```bash
git checkout main   # old look
git checkout ds-v3-clean   # new look
```

## Decision options (what Victor needs to decide)

### Option 1 — Approve direction, expand
"Tone and structure pass." Next steps:
- Rewrite remaining 13 root HTML bodies (catalogue, battle, about, clubs, leaderboard, map, profile, upload, etc.) using same component library
- Update `templates/*.html` for club/country/city/sticker pages
- Update generators if needed
- Regenerate 4029 pages
- Final `/i-polish` pass
- Merge to main when ready
- Estimate: 4-6 hours of work

### Option 2 — Adjust tone or detail
"Direction is close but not quite." Examples:
- Change accent color (burgundy → different)
- Change display font (Fraunces → different serif)
- Adjust spacing / size of specific elements
- Restructure specific sections
- Then expand per Option 1

### Option 3 — Abandon, go Variant C
"This approach isn't going to get us there." Plan:
- `git branch -D ds-v3-clean` (delete this branch)
- Engage a human designer or use Figma / Stitch for mockups
- Claude implements CSS from approved mockups (not invents design)

## Files changed on this branch

```
docs/design-audit.md          (new — inventory doc from earlier v2 attempt, still useful reference)
docs/design-system.md         (new — token + component spec from v2, still applies to v3)
docs/design-system-v3-status.md  (this file)
style.css                     (rewritten from scratch)
style.legacy.css              (old CSS preserved)
index.html                    (body rewritten)
quiz.html                     (body rewritten)
stickers/3201.html            (body rewritten as POC)
```

## SEO preserved

All pages keep:
- `<title>`, `<meta name="description">`, `<meta name="keywords">`
- `<link rel="canonical">`
- All `og:*` and `twitter:*` tags
- All JSON-LD schemas (WebSite, FAQPage, BreadcrumbList, SportsOrganization, Country)
- `<h1>` text unchanged
- `alt` text on all images
- Internal linking structure (breadcrumb trail, club ↔ country ↔ sticker links)
- URL patterns
- Sitemap
