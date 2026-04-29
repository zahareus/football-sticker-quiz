# StickerHunt — Аудит генерації статичних сторінок

**Дата:** 2026-04-29
**Режим:** READ-ONLY
**Скоп:** stickers / clubs / countries / cities / sitemaps / Supabase Storage variants

---

## Executive summary

Структура в цілому здорова: **3361 стікер у БД vs 3356 HTML — лише 5 сторінок не згенерувалися** (3210, 3213, 3214, 3324, 3359). Клуби збігаються (705=705), країни — 56 з ≥1 стікером, файлів 57 (1 зайвий: `ARM`). City pages **синхронізовані за вмістом**, але є дві системні діри:

1. **Istanbul нормалізація НЕ завершена** — у БД 100 стікерів `Istanbul, Turkey`, але HTML `cities/istanbul.html` показує лише 7. Натомість живуть зомбі-сторінки `beyo-lu.html` (82 стікери) і `kad-k-y.html` (11) — а в БД таких location вже немає (ймовірно, після нормалізації локацій city pages не перегенерувалися).
2. **Sitemaps дико застарілі.** `sitemap-stickers-*.xml` обривається на ID 3201 і lastmod 2026-04-03 — 205 стікерів (3202–3406) **не у sitemap взагалі**. `sitemap-cities.xml` пропускає 8 існуючих сторінок (включно з `istanbul.html`, `madrid.html`, `budapest.html` тощо) і теж від 02.04.
3. **`_web.webp`/`_thumb.webp` не створено для нових стікерів** (3213/3215/3217 → 400). Старі стікери (100, 1000, 2000, 3000, 3100, 3200) мають всі три варіанти. City page `torrevieja.html` рендерить `_thumb.webp` посилання — для нових стікерів ці URL **broken** (404 на проді через 400 у Storage). Self-healing optimization або cron `reconcile-images.yml` не покрив останній батч.

Регенерація як така **працює** (Torrevieja DB=89 = HTML=89 включно з найновішими 3213/3215/3217). Зламане НЕ "регенерація", а: (а) post-upload optimize-images, (б) sitemap pipeline, (в) видалення старих district-сторінок після Istanbul-нормалізації.

---

## 1. Sticker pages — повнота

| Метрика | Значення |
|---|---|
| Stickers у БД | **3361** |
| `stickers/*.html` | **3356** |
| Missing (DB → no HTML) | **5** |
| Extra (HTML → no DB) | **0** |

**Топ-30 missing (від найновіших):** `[3359, 3324, 3214, 3213, 3210]` — це ВСІ 5 пропусків (а не 30+). Тобто проблема локальна, не системна — пропадають 1-2 сторінки на батчі завантажень.

Найновіший стікер у БД: **3406** (2026-04-25 10:47 UTC). HTML файл `stickers/3406.html` **існує**.

---

## 2. Sticker previews 3217 / 3215 / 3213

### Записи у БД (всі є, всі active=true, всі location="Torrevieja, Spain")

| id | club_id | image_url | created_at |
|---|---|---|---|
| 3213 | 741 | `.../club_741/1775418749039_IMG_9085.jpeg` | 2026-04-05 |
| 3215 | 1063 | `.../club_1063/1775418786157_IMG_9114.jpeg` | 2026-04-05 |
| 3217 | 403 | `.../club_403/1775418823089_IMG_9048.jpeg` | 2026-04-05 |

### HTML files

- `stickers/3213.html` — **❌ ВІДСУТНІЙ**
- `stickers/3215.html` — ✅ є
- `stickers/3217.html` — ✅ є

### Storage variants (HEAD checks)

| sticker | оригінал `.jpeg` | `_web.webp` | `_thumb.webp` |
|---|---|---|---|
| 3213 | **200** | **400** | **400** |
| 3215 | 200 | **400** | **400** |
| 3217 | 200 | **400** | **400** |

Для контролю — старі ID мають всі три варіанти (200/200/200): 100, 1000, 2000, 3000, 3100, 3200.

### Як рендерить `cities/torrevieja.html`

Виявив прямі посилання на `_thumb.webp`:
```
.../club_403/1775418823089_IMG_9048_thumb.webp   (3217)
.../club_1063/1775418786157_IMG_9114_thumb.webp  (3215)
.../club_741/1775418749039_IMG_9085_thumb.webp   (3213)
```
Усі три URL → **400 у Storage**. На проді буде поламана прев'юшка.

### Висновок (root cause)

**(а) optimize-images не запустився для останнього батча 3202–3406.** Ні `npm run optimize`, ні self-healing `reconcile-images.yml` (кожні 15 хв) не дотягнули `_web/_thumb` до цих файлів. Генератор міста коректно посилається на майбутні `_thumb.webp` шляхи (за схемою з `seo-helpers.js → getOptimizedImageUrl`), але файли в Storage просто не існують. Плюс окремо для 3213 — згенерований стікер-page також пропав.

---

## 3. Torrevieja — синхронізація

| Джерело | Кількість стікерів |
|---|---|
| БД (`location ILIKE '%torrevieja%'`) | **89** |
| `cities/torrevieja.html` | **89** |
| Diff | **0** |

Включно з найновішими 3213, 3215, 3217 — усі **присутні** на сторінці. Підозра користувача про "не регенерується city page при додаванні нових стікерів" **спростовується** для Torrevieja. City page був перегенерований 25.04.

---

## 4. Стамбул нормалізація — НЕ ЗАВЕРШЕНО

### БД (TUR clubs + sticker locations)

```
38  "Istanbul, Turkey"      ← клуби стамбульські, location нормалізовано
21  ""                       ← клуби стамбульські, location ПОРОЖНЯ (не нормалізовано)
 5  "Alanya, Turkey"
 1  "Stuttgart, Germany"     ← очевидно стікер пійманий за межами Стамбула
 1  "Prague, Czech Republic"
 1  "The Hague, Netherlands"
 1  "Seville, Spain"
```

Окремо при глобальному скані location: **100 стікерів `Istanbul, Turkey`** — там, де нормалізація була застосована.

Згадок районів (Beşiktaş / Kadıköy / Beyoğlu / Üsküdar / Şişli тощо) у sticker.location — **0**. Тобто на рівні **БД нормалізація на districts → "Istanbul" пройшла**.

### HTML (зомбі-файли від попереднього запуску)

| файл | stickers на сторінці | DB (за відповідним slug) |
|---|---|---|
| `cities/istanbul.html` | 7 | **100** |
| `cities/beyo-lu.html` (Beyoğlu) | **82** | 0 |
| `cities/kad-k-y.html` (Kadıköy) | **11** | 0 |

→ **Файли districts не видалили** після нормалізації + `istanbul.html` НЕ перегенерували після того, як 90+ стікерів змінили локацію.

Це вже не "регенерація працює коректно" — це випадково забута операція cleanup.

---

## 5. Cities — синхронізація (повний скан)

`cities/*.html`: **31 файл** (включно з `index.html` і двома зомбі).

**Топ розбіжностей `(html_count - db_count)`:**

| slug | DB (Torrevieja-style) | HTML | diff |
|---|---|---|---|
| istanbul | 100 | 7 | **−93** |
| beyo-lu | 0 | 82 | **+82** |
| kad-k-y | 0 | 11 | **+11** |
| dusseldorf | 2 | NO_FILE | −2 |
| leinfelden-echterdingen | 2 | NO_FILE | −2 |
| mr-evac (Mrčevac) | 2 | NO_FILE | −2 |
| valencia | 2 | NO_FILE | −2 |
| antalya | 1 | NO_FILE | −1 |
| mo-i-i (Močići) | 1 | NO_FILE | −1 |
| riga | 1 | NO_FILE | −1 |
| tallinn | 1 | NO_FILE | −1 |

**Решта 22 city pages — diff=0 (повна синхронізація).** Це показує, що генератор міст працює правильно для тих міст, які були regenerated. Нові міста, що набрали кілька стікерів (Valencia, Antalya, Düsseldorf, Tallinn, Riga…), просто **ще не отримали власної сторінки** — генератор, схоже, мав поріг "min N стікерів" або просто не запускався з 02.04.

---

## 6. Club pages — синхронізація

| Метрика | Значення |
|---|---|
| Clubs у БД | 705 |
| `clubs/*.html` | 705 |
| Diff на рівні count файлів | 0 |

**Топ-15 розбіжностей за вмістом (sticker_count БД vs кількість на club page):**

| club_id | DB | HTML | diff | name |
|---|---|---|---|---|
| 468 | 5 | 3 | −2 | 🇹🇷 Goztepe |
| 327 | 7 | 6 | −1 | 🇦🇹 FC Blau-Weiß Linz |
| 549 | 11 | 10 | −1 | 🇦🇹 LASK |
| 685 | 13 | 12 | −1 | 🇮🇹 Inter Milan |
| 852 | 3 | 4 | +1 | 🇩🇪 1.FC Heidenheim |
| 861 | 13 | 12 | −1 | 🇩🇪 SC Freiburg |
| 864 | 13 | 14 | +1 | 🇩🇪 1.FC Saarbrücken |
| 881 | 36 | 35 | −1 | 🇩🇪 FC St Pauli |
| 884 | 1 | 2 | +1 | 🇩🇪 1.FC Stern Mögglingen |
| 891 | 1 | 2 | +1 | 🇩🇪 1.fc Lauchhau-Lauchäcker |
| 893 | 5 | 6 | +1 | 🇩🇪 1.FC Lokomotive Leipzig |
| 900 | 13 | 12 | −1 | 🇩🇪 Bayer 04 Leverkusen |
| 908 | 1 | 2 | +1 | 🇩🇪 1.FC Rodewisch eV |
| 937 | 22 | 23 | +1 | 🇩🇪 1.FC Köln |
| 945 | 40 | 41 | +1 | 🇩🇪 1.FC Union Berlin |

Шум у межах ±1–2 стікера — типово, коли частина стікерів видалена з БД (active=false?) або додана після останньої регенерації клубу. Не критично, але виправити повним прогоном `regenerate-club-pages.js`.

---

## 7. Country pages

| Метрика | Значення |
|---|---|
| Країн з ≥1 стікером у БД | **56** |
| `countries/*.html` | **57** |
| In DB only (no file) | 0 |
| In files only (no DB stickers) | **`ARM` (Armenia)** |

Один зайвий файл `countries/ARM.html` — імовірно, був стікер, який видалили чи деактивували. Решта — повна синхронізація.

(Зауваження по доступу: у таблиці `countries` через anon-key видно тільки 4 рядки — RLS приховує решту. Але генератор працює з агрегацією sticker→club→country, тож це не блокує.)

---

## 8. Sitemap — критично застарілий

### `sitemap-stickers-*.xml`

- Останній ID у sitemap-stickers-1..4: **3201**.
- Найновіший ID у БД: **3406**.
- **205 стікерів (3202–3406) не у sitemap.**
- Усі lastmod = **2026-04-02 / 2026-04-03**.
- Файли датовані 02-03.04 (`sitemap-stickers-1.xml` — 03.04 16:05).

Тобто sitemap не перегенерувався вже **понад 3 тижні**, попри додавання 200+ стікерів.

### `sitemap-cities.xml`

- 23 URL у файлі.
- 31 файл у `cities/` (мінус index = 30 публічних сторінок).
- **Не у sitemap:** `angers, beyo-lu, bouguenais, budapest, istanbul, kad-k-y, madrid, nantes` (8).
- Lastmod = 2026-04-02 для всіх.

Цікаво, що у sitemap немає `istanbul.html`, але є зомбі-`beyo-lu`/`kad-k-y` — sitemap здається ще старішим за самі HTML-файли.

### `sitemap-main.xml`

Свіжий: 29.04 10:11 — оновлюється. Але це лише головні сторінки, без stickers/cities.

---

## Root cause hypotheses

1. **post-upload pipeline частково обірваний для батча квіт-2026.**
   - Upload→n8n→GitHub Action генерує sticker page і clube/city, але `optimize-images.js` не дотягнувся до 3202-3406 (немає `_web/_thumb`). Cron `reconcile-images.yml` (за docs кожні 15 хв) — або не працює, або падає на cap, або був вимкнений.
   - 5 sticker pages пропущені — race condition у GitHub Action (rebase autostash вже фіксили в 2026-04-13, але одиничні misses лишаються).

2. **sitemap regeneration не у пайплайні** або була окрема ad-hoc команда, що не повторювалася з 02-03 квітня. `sitemap-cities.xml` не оновлюється при новій city page (вона з'являється у `cities/`, але не в sitemap).

3. **Istanbul-cleanup був half-done.** Скрипт нормалізації локацій (district → "Istanbul, Turkey") пройшов по БД (БД чистий), але:
   - `cities/istanbul.html` не перегенерувався з оновленим списком (показує тільки 7, а має 100);
   - старі district-files (`beyo-lu.html`, `kad-k-y.html`) НЕ видалені;
   - sitemap не перебудувався.

4. **City threshold або bug у генераторі міст для нових міст.** `Valencia (2)`, `Antalya (1)`, `Düsseldorf (2)`, `Tallinn (1)` — стікери є, файлів немає. У `generate-city-pages.js` slug-логіка коректна (line 116, `getOptimizedImageUrl`); ймовірно фільтр на `min stickers` вище 1-2 або генератор не запускався.

---

## Рекомендації (без самостійних змін)

Команди до запуску в порядку пріоритету:

```bash
cd ~/Claude\ Code/stickerhunt/scripts

# 1. Згенерувати 5 пропущених sticker pages (3210, 3213, 3214, 3324, 3359)
for id in 3210 3213 3214 3324 3359; do
  node generate-single-sticker.js $id
done

# 2. Optimize-images для нових стікерів — закрити дірку _web/_thumb
node optimize-images.js --from=3202 --missing-only

# 3. Регенерувати ВСІ city pages (виправить Istanbul + створить нові міста, де є ≥1 стікер)
node generate-city-pages.js

# 4. Видалити зомбі-файли districts (вручну, після регенерації Istanbul)
rm ~/Claude\ Code/stickerhunt/cities/beyo-lu.html
rm ~/Claude\ Code/stickerhunt/cities/kad-k-y.html

# 5. Видалити (або перевірити) ARM.html якщо в БД нема стікерів вірменських клубів
ls -la ~/Claude\ Code/stickerhunt/countries/ARM.html

# 6. Регенерація club pages (закриє ±1 розбіжності)
node regenerate-club-pages.js

# 7. Регенерація країн (на всяк, після club pages)
node regenerate-country-pages.js

# 8. Регенерація sitemaps — критично, якщо є окремий скрипт.
# У scripts/ явного sitemap-generator не видно — варто перевірити, чи ця задача
# взагалі автоматизована, чи робилася руками раз. Перевірити .github/workflows/
ls ~/Claude\ Code/stickerhunt/.github/workflows/
```

**Окремо перевірити:**
- `.github/workflows/reconcile-images.yml` — чи дійсно крутиться кожні 15 хв і чи не падає (`gh run list --workflow=reconcile-images.yml`).
- Чи є workflow для sitemap (sus, що з 02-03.04 нічого не оновлювалося).
- Чи є threshold у `generate-city-pages.js` (типу `if stickerCount < 3 skip`) — якщо є, обговорити з Віктором, бо Tallinn (1), Valencia (2) etc. лишаються без сторінок.

---

## Файли і дані аудиту

- Snapshot БД стікерів: `/tmp/sh/all_stickers.json` (3361 records)
- Snapshot БД клубів: `/tmp/sh/clubs_0-999.json`, `/tmp/sh/clubs_1000-1999.json` (705 records)
- Aggregation cities: `/tmp/sh/db_cities.json`

---

# Раунд 2 — Інфраструктура

## A. GitHub Actions — статус

Усього 3 workflow: `generate-sticker-pages.yml`, `reconcile-images.yml`, `test.yml`.

### A.1 `generate-sticker-pages.yml` — ✅ ПРАЦЮЄ
- Тригериться `repository_dispatch` (з n8n) і `workflow_dispatch` (manual).
- Останні 15 runs (24-25.04.2026): 14 success, 1 cancelled (concurrency).
- **Покриває:** `generate-single-sticker.js` → `regenerate-club-pages.js` → `regenerate-club-sticker-pages.js` → `optimize-images.js --only=$IDS` → **safety-net** `--missing-only --days=2` → `generate-city-pages.js` → commit з retry/rebase.
- **НЕ покриває:** sitemap regeneration, `regenerate-country-pages.js`. Коли стікер додається в новій країні — country page не оновлюється.
- Concurrency group `generate-pages` із `cancel-in-progress: false` — серіалізує (good), але cancelled runs трапляються (звідси 5 missing pages).

### A.2 `reconcile-images.yml` — ✅ ПРАЦЮЄ ВЗІРЦЕВО
- Cron `*/15 * * * *` — за останні 24 год 15 успішних runs, 0 failures.
- Виконує `optimize-images.js --missing-only --days=7`.
- **Тоді чому 3213/3215/3217 досі без `_web.webp`?** Стікери створені 2026-04-05 — це **24 дні тому**, виходить за вікно `--days=7`. Reconciler їх **просто не бачить**. Хоча вони відсутні в Storage, скрипт обмежений на 7 днів, тож стара дірка ніколи не закриється.
- Коли safety-net step у generate-sticker-pages run був cancelled (як 24.04 о 10:45:32 — 17s, cancelled), оригінальний optimize також не пройшов; reconciler підбирає протягом 7 днів — після цього мовчазний ризик.

### A.3 `test.yml` — ⚠️ НЕСТАБІЛЬНИЙ
- Останні 50 runs: **10 failure, 8 success** (≈55% failure rate).
- Найновіший failure (29.04.2026 08:11): test `battle page loads` — `#battle-loading` resolved 14× як `hidden` після кліку. Це flaky (батл-логіка чекає на opponent через Realtime Supabase channel) — не пов'язано з генератором.
- **Проблема:** через flake CI постійно червоний → push до main часто проходить із зламаним workflow → ніхто не помічає, коли тест НА генератор реально впаде.
- E2E залежить від live `https://stickerhunt.club` (BASE_URL у env). Якщо прод впаде — всі E2E зеленими не будуть. Але юніт-тести (`game-logic`, `client-sanity`) не залежать від мережі — окремих stable юніт-тестів на генератор у CI **немає** (`test:generators` не запускається у `test.yml`!).

### A.4 Workflow для sitemap — ❌ НЕ ІСНУЄ
- У `.github/workflows/` тільки 3 файли. Жоден не викликає `generate-static-pages.js`, де живе sitemap-логіка (lines 1062-1130).
- Sitemap оновлюється **тільки коли вручну запускають `npm run generate`** у `scripts/`. Або hardcoded patch (як commit `SEO: fix sitemap index (add cities + stickers-4) + bump homepage last…` 29.04 — людина руками виправила sitemap.xml + main, але не stickers-1..4).
- Це **архітектурний пропуск** — поки немає окремого workflow або кроку у `generate-sticker-pages.yml`, sitemap буде гнити після кожного нового стікера.

## B. Sitemap пайплайн — ВЕЛИКА ДІРА

| Файл | Останнє оновлення | Що містить |
|---|---|---|
| `sitemap.xml` (index) | **29.04 10:10** ✅ свіже (вручну) | стат-набір 6 sitemap-файлів |
| `sitemap-main.xml` | **29.04 10:11** ✅ свіже (вручну) | домашня + категорії |
| `sitemap-cities.xml` | **02.04 16:52** ❌ 27 днів | 23 URL (мало) |
| `sitemap-stickers-1.xml` | **03.04 16:05** ❌ 26 днів | до ID 3201 |
| `sitemap-stickers-2.xml` | **03.04 16:05** ❌ | |
| `sitemap-stickers-3.xml` | **03.04 16:05** ❌ | |
| `sitemap-stickers-4.xml` | **02.04 16:52** ❌ | до ID 3201 (overlap) |

`generate-static-pages.js` (lines 1067-1075) пише ТРИ sticker-sitemaps + index. Файл `sitemap-stickers-4.xml` створювався раніше — отже після зміни логіки на 3 шарди ніхто його не очистив. У index файлі `sitemap.xml` зараз вручну прописані всі 4 stickers + cities.

**Висновок:** sitemap pipeline існує тільки як ручна команда `cd scripts && npm run generate`. Це не cron, не CI, не post-upload. Кожен new sticker → стейл sitemap до наступного manual run.

## C. n8n / upload trigger — ✅ працює

`upload.js` line 9: `N8N_WEBHOOK_URL: 'https://n8n.ontext.info/webhook/sticker-uploaded'`. Викликається після INSERT в Supabase (line 456). Воркфлоу в n8n далі робить `repository_dispatch` (event `generate-sticker-pages`) у GitHub з payload `{sticker_id}`. У 95% випадків — спрацьовує. Те, що 5 sticker pages пропали — це GHA-side cancelled/race, n8n не винен. Імен n8n workflow для sitemap немає.

## D. optimize-images.js — як і коли

**Де викликається:**
1. `generate-sticker-pages.yml` step "Optimize images" — `--only=$STICKER_IDS` для нового стікера.
2. `generate-sticker-pages.yml` step "Safety-net" `if: always()` — `--missing-only --days=2` (підбирає cancelled).
3. `reconcile-images.yml` cron — `--missing-only --days=7`.

**Логіка `--missing-only`:** для кожного стікера за останні `--days=N` робить HEAD на `_web.webp`; якщо 200 — пропускає; інакше скачує оригінал, через `sharp` ресайзить → uploadує `_web.webp` і `_thumb.webp`.

**Сліпа зона:** усе старше за `--days=7` ніколи не бекфілиться. Якщо сесія з 4 стікерів була cancelled у GHA і safety-net (`days=2`) теж не встиг — у тебе вікно 7 днів, далі мовчанка. Для 3213/3215/3217 (05.04, тобто 24 дні тому) — це саме що сталося.

**Що означає "safety-net":** PR #192 (18.04) додав крок `if: always()` після оптимізації, який запускає `--missing-only --days=2`. Це закриває race коли concurrency group cancel'ить optimize step але `git push` пройшов. Для одного-двох стікерів працює; для **застарілої** дірки (>7 днів) — НІ.

## E. generate-city-pages.js — threshold і чистка

### E.1 Threshold = 3
Рядок 28: `const MIN_STICKERS_PER_CITY = 3;`. Тому `Valencia (2)`, `Düsseldorf (2)`, `Antalya (1)`, `Tallinn (1)`, `Riga (1)`, `Močići (1)`, `Mrčevac (2)`, `Leinfelden-Echterdingen (2)` НЕ мають сторінок. Це by design — запитати Віктора, чи threshold 3 справедливий, чи треба 1+.

### E.2 Чистки немає взагалі
`grep -E "unlink|rmSync|delete" generate-city-pages.js` → 0 співпадінь. Скрипт **тільки додає/перезаписує файли**, ніколи не видаляє застарілі. Якщо місто перейменувати в БД (наприклад, `Beyoğlu` → `Istanbul`), `cities/beyo-lu.html` залишається в репо назавжди. **Це і є root cause Стамбульських зомбі.**

Те ж саме — у `regenerate-club-pages.js`, `regenerate-country-pages.js`. Ніхто не чистить.

### E.3 Slug-логіка
Line 53: `cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')`. **Не транслітерує діакритики**. Тому `Beyoğlu` → `beyo-lu`, `Kadıköy` → `kad-k-y`, `Močići` → `mo-i-i`. Семантично жахливі URL — для SEO це поганий сигнал; також `Mrčevac`/`Močići` стали мусором.

Рекомендація — додати step транслітерації (`unidecode` / `slugify` library), але це окрема задача.

## F. Тести — що є / чого нема

### F.1 Існуючі тести
- **Vitest unit (CI):** `tests/game-logic.test.js`, `tests/client-sanity.test.js` — про логіку гри і HTML-санітарію. Жодного слова про регенерацію/sync DB↔HTML.
- **`scripts/test-generators.js`** (53 кейси) — генерує тестовий стікер у `_test/` папку, перевіряє наявність полів у HTML. **НЕ запускається в CI** (немає у `test.yml`). Шкода — це найважливіший тест.
- **`scripts/tests/test-keywords-sync.js`, `test-country-page-sync.js`** — schmectional, перевіряє що generator/template поля синхронні. **НЕ в CI.**
- **Playwright E2E** (10 spec-файлів, 51 тест) — покриває сторінки live-проду (battle, quiz, leaderboard, sticker pages, view-count, auth). E2E падає flaky на battle (Realtime).

### F.2 Чого критично НЕМАЄ
| Тест | Що мав би перевіряти | Чому потрібен |
|---|---|---|
| `db-html-parity.test.js` | DB sticker count = HTML file count (з допуском) | Спіймав би 5 пропущених прямо в CI |
| `storage-variants.test.js` | для кожного стікера за last 30 days `_web.webp` HEAD = 200 | Спіймав би 3213/3215/3217 |
| `sitemap-freshness.test.js` | newest ID у sitemap-stickers ≥ newest ID у DB; lastmod ≤ 7 days | Запобіг би 26-денному дрейфу |
| `city-sync.test.js` | для кожного `cities/*.html` count of `<a href=/stickers/X>` == DB count for slug | Іstanbul зразу б полум'янів |
| `obsolete-files.test.js` | `cities/*.html` що не відповідають жодному DB slug → fail | Зомбі beyo-lu/kad-k-y |
| `country-sync.test.js` | DB countries with stickers ↔ countries/*.html (вже є наполовину в `test-country-page-sync.js`, але не в CI) | ARM лишок |

## G. БД-цілісність

| Перевірка | Результат |
|---|---|
| Stickers з NULL `club_id` | **0** ✅ |
| Orphan stickers (club_id → нема клубу) | **0** ✅ |
| Stickers з порожнім `image_url` | **0** ✅ |
| Stickers з порожнім/NULL `location` | **2140** (з 3361 = **64%**) ⚠️ |
| Дублі `image_url` | **0** ✅ |
| Stickers з `active=false` | **0** (поле є, ніхто не використовує) |
| Клубів без стікерів | **2** з 705 — і обидва мають HTML pages |
| Клубів-сиріт у файлах | **0** |

**Найважливіше:** 64% стікерів **без `location`**. Це обмежує покриття city pages фундаментально. Або reverse-geocoding (від координат) не запускається на нових стікерах, або це історичний борг (стара батч-завантажка без gps). Запитати Віктора чи запустити backfill.

`country` у клубах заповнено для всіх 705. Тобто country pages — повний охват. City pages — тільки 36% бази.

## H. Інші systemic ризики

### H.1 Cron'и в репо
- Тільки `reconcile-images.yml` (every 15 min) — живий.
- Більше cron-задач немає. Sitemap, обнова country pages, чистка sticker stats — все ad-hoc.

### H.2 Немає health-check / smoke на «вміст»
- Playwright перевіряє «сторінка завантажилася» але не «має правильну кількість стікерів».
- Жодного скрипта типу `check-content-integrity.js`, який порівнює DB↔HTML.

### H.3 robots.txt
```
User-agent: *
Allow: /

Sitemap: https://stickerhunt.club/sitemap.xml
```
Чисто, нічого не блокує. Sitemap прописаний правильно (індексний `sitemap.xml`).

### H.4 Помічники між генераторами
`getOptimizedImageUrl`, `cityToSlug`, `COUNTRY_NAMES` — централізовано в `scripts/seo-helpers.js`, імпортується з 5 генераторів. **Це добре — єдине джерело правди.** Однак `cityToSlug` залишається без транслітерації — фікс в одному файлі полагодить усіх.

### H.5 Concurrency у GHA
`generate-sticker-pages.yml` має `cancel-in-progress: false`, тобто черга. Але cancelled через max-runtime або external — буває. Безпеково-сітка `--days=2` цей gap частково ловить, далі підхоплює `reconcile-images.yml --days=7`. **Стікер, що пропустив обидва вікна (>7 днів), стане частиною технічного боргу мовчки.**

## Топ-5 системних знахідок (раунд 2)

1. **Sitemap pipeline не автоматизований.** Згенерувати sitemap може тільки людина, що згадає запустити `npm run generate`. Очевидний фундаментальний пропуск.
2. **`reconcile-images.yml --days=7` не закриває старі дірки.** Потребує одноразового `--days=90` бекфіл-запуску + або підняття дефолту, або окремий monthly cron `--days=30+`.
3. **Жоден генератор НЕ видаляє застарілі файли.** Перейменування міста/клубу у БД лишає зомбі назавжди. Cleanup-step потрібен у кожному.
4. **`test:generators` НЕ в CI.** Найкорисніший тест-набір (53 кейси) лишається необов'язковим. Push-and-pray.
5. **64% стікерів без `location`** — city pages фундаментально не покривають базу. Потрібен backfill через reverse-geocoding від `latitude`/`longitude`.

## Рекомендації для профілактики

### CI gates (test.yml)
1. Додати job `generator-tests`: `cd scripts && node test-generators.js`. Зараз skipped.
2. Додати job `db-html-parity`: новий скрипт `scripts/tests/test-db-html-parity.js` — фейл якщо `|DB.count - HTML.count| > 5`.
3. Додати job `storage-variants`: HEAD-чекати `_web.webp` для останніх 50 стікерів.
4. Винести E2E (flaky) в окремий non-blocking workflow, щоб юніти не застрягали в червоному.

### Нові workflows
5. **`refresh-sitemaps.yml`** (cron daily 3am UTC): `cd scripts && npm run generate -- --sitemaps-only`. Або викликати з `generate-sticker-pages.yml` як останній step.
6. **`backfill-images.yml`** (cron weekly): `optimize-images.js --missing-only --days=90` — закриває стару дірку.
7. **`cleanup-orphans.yml`** (cron weekly, dry-run за замовчуванням, manual approve для видалення): порівнює `cities/*.html` зі списком valid slugs у DB і логує зомбі.

### Код-зміни (не фіксити зараз, але занотувати)
8. Додати `cityToSlug` транслітерацію через `unidecode` (виправить Beyoğlu/Kadıköy/Mrčevac).
9. У `generate-city-pages.js` після генерації — порівняти filesystem зі списком valid slugs, видалити обсолетні (з `--dry-run` за замовчуванням).
10. Зробити `MIN_STICKERS_PER_CITY` env-параметром, щоб легко знизити до 1.
11. У `generate-sticker-pages.yml` додати step "Refresh sitemaps" перед commit.
12. Виправити Realtime flake у `battle.spec.js` або позначити `test.skip` поки не стабілізують.

### Моніторинг
13. Простий Cloudflare/UptimeRobot smoke на `https://stickerhunt.club/sitemap.xml` — лог lastmod кожні 6 годин, alert якщо > 48 год без оновлення.
14. Health-check скрипт `scripts/healthcheck.js` (node) для local periodic запуску — повертає JSON {db_count, html_count, sitemap_max_id, missing_thumbs_last_30d}. Додати у `package.json` як `npm run health`.

