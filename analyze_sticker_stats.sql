-- Аналіз статистики показів стікерів
-- Запустіть це в Supabase SQL Editor для перевірки проблеми

-- 1. Розподіл кількості ігор по стікерам
SELECT
    CASE
        WHEN games = 0 THEN '0 games'
        WHEN games BETWEEN 1 AND 5 THEN '1-5 games'
        WHEN games BETWEEN 6 AND 10 THEN '6-10 games'
        WHEN games BETWEEN 11 AND 20 THEN '11-20 games'
        WHEN games BETWEEN 21 AND 50 THEN '21-50 games'
        ELSE '50+ games'
    END as games_range,
    COUNT(*) as sticker_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stickers
WHERE active = true
GROUP BY games_range
ORDER BY MIN(games);

-- 2. Стікери, які не були показані жодного разу
SELECT
    COUNT(*) as never_shown,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM stickers WHERE active = true), 2) as percentage_never_shown
FROM stickers
WHERE active = true AND games = 0;

-- 3. Топ 20 найбільш показаних стікерів
SELECT
    id,
    rating,
    games,
    wins,
    losses,
    last_shown_at
FROM stickers
WHERE active = true
ORDER BY games DESC
LIMIT 20;

-- 4. Топ 20 найменш показаних стікерів (включаючи ті, що не показувалися)
SELECT
    id,
    rating,
    games,
    wins,
    losses,
    last_shown_at
FROM stickers
WHERE active = true
ORDER BY games ASC
LIMIT 20;

-- 5. Середня кількість ігор та стандартне відхилення
SELECT
    COUNT(*) as total_stickers,
    ROUND(AVG(games), 2) as avg_games,
    ROUND(STDDEV(games), 2) as stddev_games,
    MIN(games) as min_games,
    MAX(games) as max_games,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY games), 2) as median_games
FROM stickers
WHERE active = true;

-- 6. Розподіл рейтингів (скільки стікерів залишилися з початковим рейтингом 1500)
SELECT
    CASE
        WHEN rating = 1500 THEN 'Exactly 1500 (initial)'
        WHEN rating BETWEEN 1400 AND 1599 THEN '1400-1599'
        WHEN rating BETWEEN 1600 AND 1799 THEN '1600-1799'
        WHEN rating >= 1800 THEN '1800+'
        ELSE 'Below 1400'
    END as rating_range,
    COUNT(*) as sticker_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stickers
WHERE active = true
GROUP BY rating_range
ORDER BY MIN(rating);
