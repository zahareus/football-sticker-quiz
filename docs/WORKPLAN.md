# StickerHunt — Work Plan & Strategy

**Owner:** Victor · **Last updated:** 2026-06-19 · **Status:** 🔴 Traffic-recovery mode

> Single source of truth for what we work on and in what order.
> Every active Todoist task tagged `#sh` maps to a phase below.
> **Hard rule right now: recover search traffic BEFORE any redesign.**

---

## TL;DR

Search traffic has collapsed **−96% from peak** (227 → 9 clicks / 28d) and, more importantly,
**average position fell from ~8 to ~25**. The cliff is **late May**, coincident with the
26.05 full page regeneration that churned `lastmod=today` across 4000+ URLs. Google read it
as a sitewide quality/freshness disruption and devalued crawl + rankings.

The churn cause is **already fixed** (`ce05eb6cf` preserves per-URL lastmod; `e4b2c87e7`
drops the contradicting freshness test). Now we **wait for re-crawl + recovery** and do only
**low-risk, additive** SEO work. **No mass regenerations. No redesign. No `lastmod` bumps.**
A redesign now would (a) re-trigger the exact sitewide change that hurt us and (b) make it
impossible to tell whether recovery stalled because of the redesign or the prior collapse.

---

## The problem (data, GSC `sc-domain:stickerhunt.club`)

**WEB clicks / 28d:**

| Window | Clicks | Impressions | Avg position |
|---|---|---|---|
| Feb 25 – Mar 24 (peak) | **227** | 4 771 | 8.7 |
| Mar 25 – Apr 21 | 143 | 3 349 | 7.3 |
| Apr 22 – May 19 | 94 | 2 040 | 7.9 |
| **May 20 – Jun 16 (now)** | **9** | 186 | **24.8** |

**WEB weekly — the cliff:**

| Week ending | Clicks | Impr | Pos |
|---|---|---|---|
| 2026-05-12 | 41 | 745 | 7.6 |
| 2026-05-19 | 12 | 351 | 9.0 |
| **2026-05-26** | **2** | 32 | **18.8** ← cliff |
| 2026-06-02 | 5 | 46 | 20.6 |
| 2026-06-09 | 2 | 55 | 31.8 |
| 2026-06-16 | 0 | 53 | 24.8 |

The signal is **position**, not content: pages still index fine (coverage healthy, 5/5 inspected
URLs "Submitted and indexed"), but average rank doubled+. That is a crawl-trust / sitewide-signal
problem, not a per-page problem.

## Root cause (confirmed)

Documented in `seo-reports/2026-06-10_overhaul_check.md`: the **mid/late-May mass regeneration**
set `<lastmod>` to today on every URL on every regen. Google saw the entire site "change" at once,
repeatedly → crawl budget devalued, freshness signal poisoned, rankings dropped ~8 → ~25.

- **Fix (shipped):** `ce05eb6cf` — generators now **preserve per-URL `lastmod`** (no churn).
- **Fix (shipped 2026-06-19):** `e4b2c87e7` — removed the integrity test that *required* `lastmod`
  to be ≤7 days old, which would have re-introduced the churn.

**Consequence for everything else:** any task that regenerates many pages or rewrites many URLs is
now *safe re: lastmod* (the generator preserves it), but is still **strategically risky during
recovery** because it adds a sitewide variable while Google is re-establishing trust.

---

## Strategic principle

**Recover to a stable baseline first. Then change one big thing at a time, measurably.**

Recovery signal (the gate for Phase 3 / redesign):
- Average WEB position back **under ~12**, and
- WEB clicks trending up for **2+ consecutive weeks**, ideally back toward the ~90–140/28d range.

Until that gate is met, the redesign stays frozen.

---

## Phases & task map

### Phase 0 — STABILIZE (now)  🔴

Stop the bleeding; let Google re-crawl. Mostly waiting + monitoring + tiny safe pushes.

- ✅ lastmod churn fixed (`ce05eb6cf`), contradicting test removed (`e4b2c87e7`).
- ⛔ **FREEZE:** redesign v4, any "bump all lastmod" tactic, any non-essential full regen.
- 🔍 Monitor weekly: position + clicks. → task `6gjr9gF627MFqWJ6` (now +2w), umbrella `6gP6vc9w2Vgj7J86`.
- (optional accelerator) request re-indexing of top ex-ranking pages in GSC UI.

### Phase 1 — RECOVER (parallel, low-risk, *helps* crawl)

Additive structural SEO that improves crawl/PageRank distribution. Safe because generators now
preserve lastmod — but **do NOT bump lastmod across the corpus** (that was the poison).

- **Internal Links Audit** → task `6gf4RvW4M2p9R48p` (re-scoped: keep the additive links,
  **drop** the "bump lastmod for all isolated pages" step).

### Phase 2 — GROW (start once recovery is *visible*)

Unify the two overlapping image tasks into one image-hosting migration.

- **Image hosting on own domain** = merge `6gv7Q64v8qP8FRM6` (Supabase cost blocker, must get
  storage <1 GB / off Pro) **+** the CDN-proxy part of `6gf4fpR437PprQrp` (cross-domain image-search
  penalty). One effort: move images to own domain (R2 / CloudRV / `images.stickerhunt.club` via the
  existing `/img/` proxy), solves **cost + image SEO** together. Rewrite image URLs **without**
  touching `lastmod`.
- **Image Search prokachka** (rest of `6gf4fpR437PprQrp`): `sitemap-images.xml`, multilingual alt,
  file sizes.
- Routine: **new-sticker size optimization** `6fRXPxwwQ6Jrrp9c` (maintenance, non-blocking).

### Phase 3 — REDESIGN (gated on stable traffic)  ⛔ frozen

- **Redesign v4 → prod** `6gpwXX2xpMm8MRvc`. Start **only after** the Phase-0 recovery gate is met
  (position <12, clicks up 2+ weeks). Then the full regen is a controlled, measurable change rather
  than a confound on top of a collapse. Design is locked on branch `redesign-v4` — see
  `docs/IMPLEMENTATION-PLAN.md`; nothing to redo, just hold.

---

## Task registry (synced 2026-06-19)

| Phase | Task | ID | Pri | Due | Notes |
|---|---|---|---|---|---|
| 0 | Verify GSC image-metadata + CWV | `6gjr9gF627MFqWJ6` | P3 | 2026-07-03 | rescheduled +2w; recovery checkpoint |
| 0 | SEO biweekly monitoring (umbrella) | `6gP6vc9w2Vgj7J86` | P2 | 2026-06-24 | re-frame: track **position recovery**, not CWV |
| 0 | Ahrefs site-audit issues | `6gW5R9FvFfHWm6Q6` | P4 | — | monitoring input |
| 0 | PageSpeed Insights check | `6gqcp48J8m22Hr36` | P4 | — | monitoring input |
| 1 | Internal Links Audit | `6gf4RvW4M2p9R48p` | P2 | 2026-06-26 | re-scoped: additive links only, **no lastmod bump** |
| 2 | Supabase storage → own domain | `6gv7Q64v8qP8FRM6` | P2 | — | **merge with image-search CDN**; cost + image SEO |
| 2 | Image Search prokachka | `6gf4fpR437PprQrp` | P3 | 2026-07-17 | CDN part merges into storage task |
| 2 | New-sticker size optimization | `6fRXPxwwQ6Jrrp9c` | P3 | — | routine maintenance |
| 3 | Redesign v4 → prod | `6gpwXX2xpMm8MRvc` | P2 | 2026-07-17 | ⛔ **FROZEN** until recovery gate met |

## Conflicts resolved (why tasks were re-ordered)

1. **Redesign vs recovery** — redesign requires regenerating 4000+ pages, the same action that
   triggered the collapse. Frozen to Phase 3, gated on traffic recovery. *(Victor's call, 2026-06-19.)*
2. **lastmod-bump tactics** — Internal Links + Image Search tasks both recommended bumping `lastmod`
   and re-submitting sitemaps. That is exactly the churn we just fixed. Those steps are struck;
   rely on natural re-crawl.
3. **Image dedup** — Image-Search "CDN proxy" and Supabase "move images off Pro" are the same work
   (images on own domain). Merged into one Phase-2 migration.
4. **Stale umbrella priority** — the monitoring umbrella was ordered CWV-first; CWV is already fixed
   (26.05, CLS=0). Its job now is to track **position recovery**.

## Branching note

Until redesign v4 is accepted, **all non-redesign changes go to `main`** (live prod: Vercel + GH
Pages). Do not touch the `redesign-v4` branch. If the working tree is checked out on `redesign-v4`,
apply fixes to `main` via a `git worktree`. (See memory `project_stickerhunt_redesign_v4`.)
