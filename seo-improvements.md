# StickerHunt — SEO Improvements Roadmap

**Created:** 17.03.2026 | **Status:** Planning

---

## Phase 1: Club Page Enrichment (Wikipedia Integration)

### 1.1 Wikipedia/Wikidata Club Facts Card
**What:** Add structured info card to each club page with founding year, stadium, capacity, league, official website — pulled from Wikidata API at generation time.

**Impact:** +30-50 words per page of factual, keyword-rich content. Richer Schema.org (SportsTeam with foundingDate, location, memberOf). Better Knowledge Graph matching.

**Implementation:** Wikidata API query during page generation → cache to JSON → inject into template. No auth needed, no rate limits.

**Dependency:** Wikipedia URL mapping for all clubs (Step 1.0).

### 1.2 Wikipedia Intro Paragraph
**What:** Add "About {Club}" section with first paragraph from Wikipedia article. CC BY-SA attribution required.

**Impact:** +100-250 words of unique, relevant content per page. Triples current text content (~50 words → ~300 words). Major improvement for thin content issue (480/509 pages flagged).

**Implementation:** Wikipedia Extracts API → cache → truncate to 2-3 sentences → inject after club description.

**Coverage:** ~400-500 of 671 clubs (those with Wikipedia articles in any language).

### 1.3 Sticker Statistics Section (Own Data)
**What:** Add stats from our Supabase data: first/last sticker found (date + city), cities where found, average difficulty, battle stats.

**Impact:** +50-100 words of truly unique content (exists nowhere else). Differentiator from any competitor.

**Implementation:** Aggregate queries during generation. All data already in Supabase. Zero external dependencies.

**Coverage:** 671/671 clubs.

### 1.4 Internal Linking — "Other Clubs from {Country}"
**What:** Block at bottom of club page with links to other clubs from the same country.

**Impact:** Better crawlability, lower bounce rate, more link equity distribution. Also adds textual content with country/club names.

**Implementation:** Already have country data. Add to club page template.

### 1.5 Schema.org Enrichment
**What:** Expand SportsTeam JSON-LD with foundingDate, StadiumOrArena (name + capacity), SportsOrganization (league), official URL.

**Impact:** Rich results potential, Knowledge Graph matching, better entity understanding by Google.

**Implementation:** Populate from Wikidata cache (same as 1.1).

---

## Phase 2: Programmatic SEO — New Page Types

### 2.1 City Pages — `/cities/{city}.html`
**What:** Pages showing all stickers found in a specific city, with map and club breakdown.

**Impact:** 30-50 new pages with unique geographic content. Captures "football stickers [city]", "street stickers [city]" queries. No competitor has this.

**Implementation:** Extract unique cities from sticker location data. Normalize city names. Set minimum threshold (5+ stickers). Template similar to country pages + map.

**Data:** 949 stickers (31%) have GPS + city. Growing with each new sticker.

### 2.2 Collection Pages (Static Aggregations)
**What:**
- `/collections/rarest.html` — clubs with fewest stickers
- `/collections/newest.html` — last 50 found stickers
- `/collections/top-rated.html` — highest ELO rating
- `/collections/hardest.html` — difficulty 3 stickers

**Impact:** 4-5 new pages capturing long-tail queries ("rare football stickers", "best football stickers"). Auto-updating content.

**Implementation:** Pure Supabase queries, simple templates. Very easy.

### 2.3 League Pages — `/leagues/{league}.html`
**What:** Group clubs by football league (Bundesliga, La Liga, Eredivisie, etc.)

**Impact:** 20-40 new pages. Captures "[league] stickers" queries. Better organization.

**Implementation:** Map clubs to leagues via Wikidata P118 property (same API as Phase 1). Minimum 3 clubs per league page.

**Risk:** Some cannibalisation with country pages. Searchers for "Bundesliga stickers" mostly want Panini.

### 2.4 Culture Content Hub
**What:** 3-5 editorial articles about ultras sticker culture, identification guides, spotting tips.

**Impact:** Captures informational queries. Brand authority. Links to programmatic pages.

**Implementation:** Manual content creation (not automated). High quality required.

**Pages:**
- "What Are Football Ultras Stickers?"
- "How to Identify a Football Sticker"
- "Street Sticker Spotting Guide"

---

## Phase 3: Technical & Monitoring

### 3.1 Sitemap Updates
Add new sitemaps for each new page type: `sitemap-cities.xml`, `sitemap-leagues.xml`, `sitemap-collections.xml`.

### 3.2 Regular Audits
- Bi-weekly GSC metrics check (next: 31.03.2026)
- Monthly crawler.sh full crawl
- Track: clicks, impressions, CTR, position, indexed pages count

---

## Priority Order
1. Wikipedia URL mapping (prerequisite for 1.1, 1.2, 1.5, 2.3)
2. Phase 1.3 — Sticker stats (no dependencies, quick win)
3. Phase 1.1 + 1.2 — Wikipedia integration
4. Phase 1.4 — Internal links
5. Phase 2.1 — City pages
6. Phase 2.2 — Collection pages
7. Phase 2.3 — League pages
8. Phase 2.4 — Culture content

---

*Last updated: 17.03.2026*
