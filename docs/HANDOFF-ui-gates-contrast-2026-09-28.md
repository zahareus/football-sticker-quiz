# Handoff: StickerHunt — контраст і горизонтальний скрол (ui-gates), 28.09.2026

**Метод:** скіл `/ui-gates` (render-перевірки в Chrome), прогін на живих `/`, `/clubs/5.html`, `/stickers/80.html`. Горизонтальний скрол додатково перевірено прямо на живому сайті (не на знімку). Коміт репо на момент аудиту: `38ba4a4c0` (27.09).
**Перевірка після фіксу:** `~/.claude/skills/ui-gates/run.sh https://stickerhunt.club/ https://stickerhunt.club/clubs/5.html https://stickerhunt.club/stickers/80.html` → MUST-гейти зелені (крім свідомо відкладеного, див. нижче).

---

## Що виправити

| # | Проблема | Де в коді | Цифра зараз | Пропозиція | Після |
|---|---|---|---|---|---|
| 1 | Синій `--color-link: #007bff` занадто світлий. Ним фарбуються **hover усіх посилань** (футер, навігація, «More Statistics →», каталог) і дефолтні лінки `.intro-text a`, `.legal-container a` | `style.css:109` + інлайн-копія `:root{…--color-link:#007bff…}` у `<style>` кожної сторінки (critical CSS: `templates/_critical/critical.css`) | 3.98:1 на білому, 3.78:1 на `#f8f9fa` | `#0062cc` | 5.8 / 5.5:1 |
| 2 | Сірий «Source: Wikipedia» під описом клубу | `style.css:3894-3895` `.club-about-source` / `a` → `#999` (+ `templates/_critical/critical.css`, `scripts/regenerate-club-pages.js`, `scripts/generate-single-sticker.js` згадують клас — звірити, чи там нема інлайн-кольору) | 2.85:1 | `var(--color-footer-text)` = `#6c757d` | 4.69:1 |
| 3 | Червона кнопка Cancel (модалка на сторінках клубу/стікера) | `style.css:3520` `.btn-cancel { background-color: #ef4444 }` + інлайн-копії в `club-create.html`, `profile.html`, `map.html` та ін. кореневих `.html` | 3.76:1 (білий текст) | `#dc2626` | 4.83:1 |
| 4 | Головну тягне вбік на телефоні 320px: карусель стікерів `a.hp-sticker-card` вилазить за в'юпорт | `style.css:4146` `.hp-sticker-card` (flex-shrink:0, 140/120px) — батьківський скрол-ряд не тримає ширину; шукати контейнер каруселі (`overflow-x`, `min-width:0` у flex/grid-предка) | `scrollWidth` 354 при 320 (+34px) | обмежити контейнер: `min-width:0` / `max-width:100%` на предку, скрол лише всередині каруселі | 0 |
| 5 | Сторінка клубу @320: +4px; сторінка стікера @280: +40px | `main.container club-page`, `main.container sticker-page-container` — паддінги/фіксована ширина всередині | +4 / +40 px | знайти widest-елемент (скрипт у `/ui-gates` друкує), зазвичай фіксована ширина чи довгий лінк без `overflow-wrap:anywhere` | 0 |

Пункти 1–3 — це 3 зміни кольорів. Пункти 4–5 — верстка, можливо окремий коміт.

## Що НЕ чіпати (шум гейтів)

- Маркери Leaflet 12×20px і «15 однакових блоків» — плитки карти, стороння бібліотека. `ui-gates` їх уже фільтрує.
- Advisory «timid type-scale 1.5x» на сторінці стікера, «одна тінь на сторінці» — смакові поради, не баги. Не в скоупі.
- 280px (п.5, стікер) — рідкісні розкладні екрани, нижчий пріоритет за 320.

## 🔴 Запобіжники проєкту (обов'язково)

- CSS живе у ДВОХ місцях: `style.css` і **інлайн critical CSS у `<style>` кожної згенерованої сторінки** (`templates/_critical/critical.css`). Змінив колір лише в `style.css` → на сторінках лишиться старий з інлайну. Перевіряти curl-ом живий HTML (`grep 007bff`).
- Перегенерація сторінок — **тільки канонічні генератори**: клуби `scripts/regenerate-club-pages.js`, стікери `scripts/generate-single-sticker.js` (масово з `STICKER_PAGE_ONLY=1`), головна/каталог `scripts/generate-static-pages.js --homepage-only`. **`npm run generate` не запускати** (інцидент 27.05: сирі `{{…}}` на 4 000+ сторінках). Після масового прогону — `npm run test:placeholders`.
- Видима UI-зміна → скріншоти «до/після» зачеплених сторінок (головна @320, клуб, стікер, модалка Cancel) і **затвердження Віктором до мержу/деплою**.
- Після пушу — curl живого проду (Vercel), а не «GHA зелений».
- Гілка `main`; перед комітом `git status --short` (робоча тека брудна).

## Критерій готовності

1. `run.sh` по трьох URL: `measure_render`, `verify_states` — 0 фейлів; `verify_responsive` — 0 на 320/414 (280 — бажано).
2. `curl -s https://stickerhunt.club/clubs/5.html | grep -c 007bff` = 0.
3. Скріншоти до/після затверджені Віктором.
