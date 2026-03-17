# SEO Моніторинг — StickerHunt
Дата змін: 22.02.2026
Перевірити: **01.03.2026** (через 1 тиждень)

---

## Що змінили (для контексту)

- Нові тайтли для всіх 2955 стікерів, 663 клубів, 54 країн
- Додали текстовий опис на сторінки клубів
- BreadcrumbList JSON-LD schema на всіх сторінках
- Покращили мета-описи (keyword "identify")
- Виправили тайтли quiz, catalogue, leaderboard, map, rating, about

---

## Перевірка 1: GSC Performance

**Де:** search.google.com/search-console → Performance → Search results

Обрати: **Last 7 days** і порівняти з **Previous 7 days**

### Ключові сторінки — зафіксовані показники на 22.02.2026

| Сторінка | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| /catalogue.html | ~42/тиж | 0 | ~0% | ~5.9 |
| /quiz.html | ~25/тиж | 0 | ~0% | ~6.1 |
| /clubs/* (всі разом) | ~150/тиж | ~5 | ~3% | varies |

### Що шукати через тиждень

- [ ] `/catalogue.html` — з'явились кліки? (ціль: хоча б 1-3)
- [ ] `/quiz.html` — CTR піднявся? (позиція 6.1, має бути 5-10% CTR)
- [ ] Сторінки клубів — impressions зросли? (нові описи дають сигнал Гуглу)
- [ ] Запит "sticker hunt" — позиція стала нижче 10? (зараз 10.7)

---

## Перевірка 2: Rich Results (breadcrumbs у видачі)

**Де:** search.google.com/test/rich-results

Вставити будь-який URL клубу, наприклад:
`https://stickerhunt.club/clubs/1000.html`

- [ ] Показує BreadcrumbList? (має бути "Home > Catalogue > Country > Club")
- [ ] Немає помилок у схемі?

Можна також погуглити назву клубу + stickerhunt і подивитися, чи в сніпеті є breadcrumb-рядок.

---

## Перевірка 3: Indexing

**Де:** GSC → Indexing → Pages

- [ ] Зменшилась кількість "Not indexed" сторінок?
- [ ] Sitemap submitted vs indexed — indexed зріс? (зараз 0, це лаг — має оновитись)
- [ ] Немає нових помилок ("Duplicate without canonical", "Crawled, not indexed")?

---

## Червоні прапорці (треба реагувати)

- Impressions впали більш ніж на 20% — щось зламалось або Гугл деіндексував
- З'явились нові помилки в Indexing
- Rich Results показує помилки схеми

---

## Наступні кроки (після перевірки)

Якщо impressions зросли, але clicks ні → потрібні кращі мета-описи для топ-клубів
Якщо breadcrumbs не з'явились у видачі → зачекати ще тиждень, Гугл повільний
Якщо нові помилки → відправити цей файл клоду і розібратись
