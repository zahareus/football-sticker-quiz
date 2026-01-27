-- ============================================================
-- Improved Battle Pairing Algorithm
-- Fixes: Ensures more even distribution of sticker appearances
-- ============================================================

-- Drop the old function to replace it
DROP FUNCTION IF EXISTS get_battle_pair(TEXT);

-- ============================================================
-- Improved get_battle_pair function
-- Key improvements:
-- 1. More aggressive weighting for stickers with fewer games
-- 2. Softer handling of recent stickers (reduce weight instead of hard exclude)
-- 3. Guaranteed selection of new stickers (games=0) with probability
-- 4. Better fallback logic
-- ============================================================

CREATE OR REPLACE FUNCTION get_battle_pair(p_session_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_anchor RECORD;
    v_opponent RECORD;
    v_recent_stickers INTEGER[];
    v_recent_pairs TEXT[];
    v_mode INTEGER;
    v_pair_hash TEXT;
    v_attempts INTEGER := 0;
    v_all_stickers_count INTEGER;
    v_new_stickers_count INTEGER;
    v_force_new_sticker BOOLEAN := false;
BEGIN
    -- Get recent stickers/pairs for this session
    SELECT recent_sticker_ids, recent_pair_hashes
    INTO v_recent_stickers, v_recent_pairs
    FROM user_recent WHERE session_id = p_session_id;

    IF v_recent_stickers IS NULL THEN
        v_recent_stickers := '{}';
        v_recent_pairs := '{}';
    END IF;

    -- Count all active stickers and new stickers (games=0)
    SELECT COUNT(*) INTO v_all_stickers_count FROM stickers WHERE active = true;
    SELECT COUNT(*) INTO v_new_stickers_count FROM stickers WHERE active = true AND games = 0;

    -- With 40% probability, force selection of a new sticker if any exist
    -- This ensures new stickers get shown quickly
    IF v_new_stickers_count > 0 AND random() < 0.4 THEN
        v_force_new_sticker := true;
    END IF;

    -- ============================================================
    -- SELECT ANCHOR STICKER
    -- ============================================================

    IF v_force_new_sticker THEN
        -- Force select a new sticker (games=0)
        SELECT * INTO v_anchor FROM stickers
        WHERE active = true AND games = 0
        ORDER BY random()
        LIMIT 1;

        -- Log for debugging
        RAISE NOTICE 'Forced new sticker as anchor: %', v_anchor.id;
    ELSE
        -- Use improved weighted random selection
        -- Formula: random() * power(0.5, games / 8.0)
        -- This gives exponentially higher weight to stickers with fewer games
        -- - games=0:  weight multiplier = 1.0
        -- - games=8:  weight multiplier = 0.5
        -- - games=16: weight multiplier = 0.25
        -- - games=32: weight multiplier = 0.0625
        --
        -- Additionally, reduce weight by 80% if sticker is in recent list

        SELECT * INTO v_anchor FROM stickers
        WHERE active = true
        ORDER BY (
            random() * power(0.5, games / 8.0) *
            CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
        ) DESC
        LIMIT 1;
    END IF;

    -- If still null, no stickers available
    IF v_anchor IS NULL THEN
        RETURN json_build_object('error', 'No stickers available');
    END IF;

    -- ============================================================
    -- SELECT OPPONENT STICKER
    -- ============================================================

    -- Select mode: 40% close rating, 40% random, 20% extreme
    v_mode := floor(random() * 100);

    -- Check if we should prioritize a new sticker as opponent
    -- (but only if anchor is not new, to avoid two new stickers competing)
    IF v_new_stickers_count > 1 AND v_anchor.games > 0 AND random() < 0.3 THEN
        -- 30% chance to pair with a new sticker
        SELECT * INTO v_opponent FROM stickers
        WHERE active = true
          AND id != v_anchor.id
          AND games = 0
        ORDER BY random()
        LIMIT 1;

        RAISE NOTICE 'Selected new sticker as opponent: %', v_opponent.id;
    END IF;

    -- If no opponent yet, use normal selection logic
    IF v_opponent IS NULL THEN
        <<opponent_loop>>
        LOOP
            v_attempts := v_attempts + 1;
            EXIT opponent_loop WHEN v_attempts > 10;

            IF v_mode < 40 THEN
                -- Mode A: Close rating (±200 from anchor)
                -- Use weighted selection even for close rating matches
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true
                  AND id != v_anchor.id
                  AND ABS(rating - v_anchor.rating) <= 200
                ORDER BY (
                    random() * power(0.5, games / 8.0) *
                    CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                ) DESC
                LIMIT 1;

                -- Fallback: extend to ±400
                IF v_opponent IS NULL THEN
                    SELECT * INTO v_opponent FROM stickers
                    WHERE active = true
                      AND id != v_anchor.id
                      AND ABS(rating - v_anchor.rating) <= 400
                    ORDER BY (
                        random() * power(0.5, games / 8.0) *
                        CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                    ) DESC
                    LIMIT 1;
                END IF;

            ELSIF v_mode < 80 THEN
                -- Mode B: Random opponent (weighted by games)
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true
                  AND id != v_anchor.id
                ORDER BY (
                    random() * power(0.5, games / 8.0) *
                    CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                ) DESC
                LIMIT 1;

            ELSE
                -- Mode C: Top vs Bottom (extreme matchups)
                -- Still apply weighting to ensure new stickers get chances
                IF v_anchor.rating > 1600 THEN
                    -- High rated anchor gets low rated opponent
                    SELECT * INTO v_opponent FROM stickers
                    WHERE active = true
                      AND id != v_anchor.id
                      AND rating < 1400
                    ORDER BY (
                        random() * power(0.5, games / 8.0) *
                        CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                    ) DESC
                    LIMIT 1;
                ELSIF v_anchor.rating < 1400 THEN
                    -- Low rated anchor gets high rated opponent
                    SELECT * INTO v_opponent FROM stickers
                    WHERE active = true
                      AND id != v_anchor.id
                      AND rating > 1600
                    ORDER BY (
                        random() * power(0.5, games / 8.0) *
                        CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                    ) DESC
                    LIMIT 1;
                ELSE
                    -- Middle rated: pick from extremes randomly
                    SELECT * INTO v_opponent FROM stickers
                    WHERE active = true
                      AND id != v_anchor.id
                      AND (rating > 1600 OR rating < 1400)
                    ORDER BY (
                        random() * power(0.5, games / 8.0) *
                        CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                    ) DESC
                    LIMIT 1;
                END IF;
            END IF;

            -- Ultimate fallback: any sticker except anchor (with weighting)
            IF v_opponent IS NULL THEN
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true AND id != v_anchor.id
                ORDER BY (
                    random() * power(0.5, games / 8.0) *
                    CASE WHEN id = ANY(v_recent_stickers) THEN 0.2 ELSE 1.0 END
                ) DESC
                LIMIT 1;
            END IF;

            -- Still no opponent (only 1 sticker in DB)
            IF v_opponent IS NULL THEN
                RETURN json_build_object('error', 'Not enough stickers for pairing');
            END IF;

            -- Check if this pair was recently shown
            v_pair_hash := LEAST(v_anchor.id, v_opponent.id) || ':' ||
                           GREATEST(v_anchor.id, v_opponent.id);

            -- Exit if pair is not in recent list, or if we've tried too many times
            EXIT opponent_loop WHEN NOT (v_pair_hash = ANY(v_recent_pairs)) OR v_attempts >= 10;

            -- If we're here, pair was recent, so nullify opponent and try again
            v_opponent := NULL;
        END LOOP;
    END IF;

    -- Update last_shown_at for both stickers
    UPDATE stickers SET last_shown_at = NOW()
    WHERE id IN (v_anchor.id, v_opponent.id);

    -- Generate pair hash for recent tracking
    v_pair_hash := LEAST(v_anchor.id, v_opponent.id) || ':' ||
                   GREATEST(v_anchor.id, v_opponent.id);

    -- Return the pair
    RETURN json_build_object(
        'sticker_a', json_build_object(
            'id', v_anchor.id,
            'image_url', v_anchor.image_url,
            'rating', v_anchor.rating,
            'games', v_anchor.games
        ),
        'sticker_b', json_build_object(
            'id', v_opponent.id,
            'image_url', v_opponent.image_url,
            'rating', v_opponent.rating,
            'games', v_opponent.games
        ),
        'pair_hash', v_pair_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_battle_pair(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_battle_pair(TEXT) TO authenticated;

-- ============================================================
-- DONE!
-- Test with: SELECT get_battle_pair('test_session');
-- ============================================================
