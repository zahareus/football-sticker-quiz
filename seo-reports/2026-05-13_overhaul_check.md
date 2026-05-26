# StickerHunt SEO — місячна перевірка 13.05.2026

**Цикл:** overhaul 02.04 → 13.04 → 29.04 → **13.05** (поточний) → 27.05 (наступний)
**Вікно 28d:** 2026-04-15 → 2026-05-12 (GSC lag, дані до 10.05 повні)

---

## TL;DR

**Sitemap-фікс від 29.04 відпрацював.** Усі 6 sub-sitemaps скачано Google 08–10.05 (раніше `lastDownloaded: Never`). 14-денне вікно post-fix: **5.1 кліків/день** vs 2.2/день у попередньому проміжку — відскок 2.3×.

**Але два критичних борги:**
1. CWV провалені на всіх 3 типах сторінок (попри фікс 12.05 — width/height на 697 club pages + всі stickers)
2. `clubs/1095.html` повністю випав з пошуку (NO DATA у 28d, на 29.04 було 24 impressions)

---

## 📊 Метрики 28d

| Метрика | Baseline 31.03 | 13.04 | 29.04 | **13.05** | Ціль | Статус |
|---|---|---|---|---|---|---|
| Кліки | 196 | 167 | 113 | **108** | 220+ | ❌ -45% від baseline |
| Покази | 4 063 | 3 563 | 2 718 | **2 075** | — | ❌ -49% |
| CTR | 4.82% | 4.69% | 4.16% | **5.20%** | 5.5%+ | ⚠️ +0.95pp до 29.04 |
| Позиція | 8.5 | 7.3 | 7.4 | **7.6** | ≤7.5 | ⚠️ |
| Країн з кліками | 20 | — | 33 | **34** | 25+ | ✅ |
| Image Search clk/impr | — | 1 | 0 | **3 / 893** | 5+ | ⚠️ ожив |

**Prev 28d (18.03–14.04):** 151 кліків / 3 549 impressions / CTR 4.25% / pos 7.3 — для порівняння до vs після кризи.

---

## ✅ Sitemap — полагоджено

Всі 6 sub-sitemaps lastDownloaded між 08–10.05 (попередньо "Never" з 03.04). errors=0, warnings=0, isPending=False.

```
sitemap-cities.xml:    lastDownloaded=2026-05-08
sitemap-main.xml:      lastDownloaded=2026-05-10
sitemap-stickers-1.xml: lastDownloaded=2026-05-10
sitemap-stickers-2.xml: lastDownloaded=2026-05-09
sitemap-stickers-3.xml: lastDownloaded=2026-05-10
sitemap-stickers-4.xml: lastDownloaded=2026-05-09
```

---

## 📈 14-денний trend post-fix (29.04–12.05)

Сумарно: 71 clk / 1 342 imp / CTR 5.29% / pos 7.3 — **2.3× відскок від проміжку 14–26.04**.

```
29.04: 1 clk  (36 imp)
30.04: 8 clk  (108)
01.05: 3 clk  (156)
02.05: 8 clk  (192)
03.05: 11 clk (238)   ★ пік
04.05: 2 clk  (37)
05.05: 0 clk  (6)
06.05: 12 clk (149)   ★
07.05: 9 clk  (215)
08.05: 17 clk (189)   ★★ макс
09.05: 0 clk  (12)    ⚠️
10.05: 0 clk  (4)     ⚠️
```

**Тривога:** 09–10.05 нуль кліків при майже нульових impressions. Може бути weekend pattern (09.05=Saturday) АБО новий збій після перегенерації 09.05 (массові auto-commits). Перевірити на 14–15.05.

---

## 🚨 P0 борги

### 1. clubs/1095.html — повне зникнення з пошуку

- 29.04: 24 imp / 0 clk / pos 10.5 (snippet problem)
- **13.05: NO DATA у 28d** — повністю випав

**Гіпотези:**
- canonical поламано після перегенерації
- noindex випадково проставлено
- 404/5xx при крауйлі
- знижка через CLS/LCP (втратили позиції настільки, що з top-100 вилетіли)

**Дія:** GSC URL Inspection + локально перевірити HTML (canonical, robots, status).

### 2. CWV — провал по всіх 3 url'ах (lab 12.05, після perf-фіксів того ж дня)

| URL | LCP | CLS | TBT | Perf |
|---|---|---|---|---|
| `/` | 5.6s (бюджет 4s) | 0 ✅ | 300ms | 0.69 |
| `/stickers/3201.html` | 6.8s | **0.42** (бюджет 0.1!) | 202ms | 0.48 |
| `/clubs/695.html` | 6.1s | 0.29 | 275ms | 0.53 |

12.05 commits (НЕ спрацювали повністю):
- `f08d53f8` index + countries + sitemaps with CLS fix
- `58375e78` 697 club pages width/height attrs
- `7ac678a5` + `6466d2e8` всі sticker pages CLS fix

**Гіпотези чому CLS 0.42 залишився:**
- width/height на img додано, але інший елемент рухається (font swap? lazy-loaded блок? OG-image у hero?)
- 3201/695 не потрапили в batches (треба перевірити)
- CLS походить з font swap (Fraunces+Inter Tight з 14.04) — треба `font-display:optional` або preload

**Дія:** прочитати diff коммітів, перевірити stickers/3201.html і clubs/695.html у браузері з Layout Shift overlay (Chrome DevTools).

---

## ⚠️ P1 борги

### 3. Bodø/Glimt clubs/617.html — флагман просідає

| Дата | Кліки | Позиція |
|---|---|---|
| Baseline | 24 | 5.7 |
| 29.04 | 7 | 7.8 |
| **13.05** | 6 | **9.6** |

Внутрішні лінки з `countries/NOR.html` + з головної досі не реалізовано (борг з 29.04).

### 4. Image Search — ожив, але далеко

- 893 impressions / 3 clicks / pos 46.2
- На 29.04: 0/0
- Старт є, треба тягнути в топ-20: alt text аудит, ImageObject schema, sitemap-images.

---

## ✅ Що працює

- **Country pages:** NOR pos 7.2, 4 кліки — флагман multilingual підходу
- **CTR підстрибнув** з 4.16% до 5.20% — multilingual title/description дають клік
- **34 країни з кліками** (vs 20 baseline, 33 на 29.04)
- **Локальні запити дають кліки:**
  - `hammarby stickers` — 3 clk / pos 5.1
  - `vålerenga klistremerker` — 2 clk / pos 10.8
  - `crvena zvezda sticker` — 2 clk / pos 5.3
  - `bodø glimt klistremerker` — 1 clk
- **Топ-сторінки за кліками:**
  - clubs/617.html (BOD) — 6 clk
  - clubs/567.html — 4 clk
  - clubs/631.html — 4 clk
  - clubs/743.html — 4 clk
  - countries/NOR.html — 4 clk
  - stickers/341.html — 4 clk
  - stickers/201.html — 3 clk / **pos 1.0** ★

---

## 🎯 Action items до 27.05 (наступний цикл)

### P0
1. **URL Inspection clubs/1095.html** + з'ясувати причину випадіння
2. **CWV root cause:** прочитати diff 12.05 commits, перевірити чому CLS 0.42 не зник
3. **LCP оптимізація** головної (5.6s → ≤4s): preload hero, font-display, render-blocking audit

### P1
4. Bodø/Glimt 617.html: internal links з countries/NOR.html (gallery NOR clubs) + з головної
5. Image Search: alt-текст на стікерах + ImageObject schema + sitemap-images
6. Перевірити 09–10.05 нуль (weekend чи новий збій після auto-commits 09.05)

### P2
7. Масштабувати country pages featured gallery на всі 34 країни з трафіком

---

## Файли

- Raw GSC дані: `/tmp/gsc_pull_0513.py` (вивід)
- CWV lab: `seo-reports/perf-2026-05-12.json`
- Попередні звіти: `2026-04-29_overhaul_check.html`, `2026-04-13_overhaul_check.html`
- Memory: `project_stickerhunt_seo_2026-04-29.md`

## Контекст роботи (тиждень 06–12.05)

- 09.05: reconcile-stickers cron додано (concurrency fix), масові auto-commits сторінок
- 12.05: великий perf-фікс — width/height на 697 club + всі stickers + index + countries + sitemaps + hybrid CrUX+PSI perf-check
- 12.05: e2e tests stabilization
