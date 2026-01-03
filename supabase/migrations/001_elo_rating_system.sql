-- ============================================================
-- ELO Rating System Migration for StickerHunt
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Add rating columns to stickers table
-- ============================================================

ALTER TABLE stickers
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS games INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_shown_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Index for efficient anchor selection (weighted random by games)
CREATE INDEX IF NOT EXISTS idx_stickers_rating_games
ON stickers(active, games, rating);

-- Index for ranking queries
CREATE INDEX IF NOT EXISTS idx_stickers_rating_desc
ON stickers(rating DESC) WHERE active = true;

-- ============================================================
-- STEP 2: Create votes table (voting log)
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    sticker_a_id INTEGER REFERENCES stickers(id),
    sticker_b_id INTEGER REFERENCES stickers(id),
    winner_id INTEGER REFERENCES stickers(id),
    loser_id INTEGER REFERENCES stickers(id),
    rating_a_before INTEGER,
    rating_b_before INTEGER,
    rating_a_after INTEGER,
    rating_b_after INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_winner ON votes(winner_id);

-- ============================================================
-- STEP 3: Create user_recent table (anti-repeat for pairs)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_recent (
    session_id TEXT PRIMARY KEY,
    recent_sticker_ids INTEGER[] DEFAULT '{}',
    recent_pair_hashes TEXT[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: RPC Function - get_battle_pair
-- Returns a pair of stickers for voting
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
BEGIN
    -- Get recent stickers/pairs for this session
    SELECT recent_sticker_ids, recent_pair_hashes
    INTO v_recent_stickers, v_recent_pairs
    FROM user_recent WHERE session_id = p_session_id;

    IF v_recent_stickers IS NULL THEN
        v_recent_stickers := '{}';
        v_recent_pairs := '{}';
    END IF;

    -- Count all active stickers
    SELECT COUNT(*) INTO v_all_stickers_count FROM stickers WHERE active = true;

    -- Select anchor using weighted random (1/sqrt(games+1))
    -- Prioritize stickers with fewer games
    SELECT * INTO v_anchor FROM stickers
    WHERE active = true
      AND id != ALL(v_recent_stickers)
    ORDER BY random() / sqrt(games + 1) DESC
    LIMIT 1;

    -- Fallback if all stickers are in recent
    IF v_anchor IS NULL THEN
        SELECT * INTO v_anchor FROM stickers
        WHERE active = true
        ORDER BY random() / sqrt(games + 1) DESC
        LIMIT 1;
    END IF;

    -- If still null, no stickers available
    IF v_anchor IS NULL THEN
        RETURN json_build_object('error', 'No stickers available');
    END IF;

    -- Select mode: 40% close rating, 40% random, 20% extreme
    v_mode := floor(random() * 100);

    <<opponent_loop>>
    LOOP
        v_attempts := v_attempts + 1;
        EXIT opponent_loop WHEN v_attempts > 10;

        IF v_mode < 40 THEN
            -- Mode A: Close rating (±200 from anchor)
            SELECT * INTO v_opponent FROM stickers
            WHERE active = true
              AND id != v_anchor.id
              AND id != ALL(v_recent_stickers)
              AND ABS(rating - v_anchor.rating) <= 200
            ORDER BY random()
            LIMIT 1;

            -- Fallback: extend to ±400
            IF v_opponent IS NULL THEN
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true
                  AND id != v_anchor.id
                  AND ABS(rating - v_anchor.rating) <= 400
                ORDER BY random()
                LIMIT 1;
            END IF;

        ELSIF v_mode < 80 THEN
            -- Mode B: Random opponent
            SELECT * INTO v_opponent FROM stickers
            WHERE active = true
              AND id != v_anchor.id
              AND id != ALL(v_recent_stickers)
            ORDER BY random()
            LIMIT 1;

        ELSE
            -- Mode C: Top vs Bottom (extreme matchups)
            IF v_anchor.rating > 1600 THEN
                -- High rated anchor gets low rated opponent
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true AND id != v_anchor.id AND rating < 1400
                ORDER BY random() LIMIT 1;
            ELSIF v_anchor.rating < 1400 THEN
                -- Low rated anchor gets high rated opponent
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true AND id != v_anchor.id AND rating > 1600
                ORDER BY random() LIMIT 1;
            ELSE
                -- Middle rated: pick from extremes randomly
                SELECT * INTO v_opponent FROM stickers
                WHERE active = true AND id != v_anchor.id
                  AND (rating > 1600 OR rating < 1400)
                ORDER BY random() LIMIT 1;
            END IF;
        END IF;

        -- Ultimate fallback: any sticker except anchor
        IF v_opponent IS NULL THEN
            SELECT * INTO v_opponent FROM stickers
            WHERE active = true AND id != v_anchor.id
            ORDER BY random() LIMIT 1;
        END IF;

        -- Still no opponent (only 1 sticker in DB)
        IF v_opponent IS NULL THEN
            RETURN json_build_object('error', 'Not enough stickers for pairing');
        END IF;

        -- Check if this pair was recently shown
        v_pair_hash := LEAST(v_anchor.id, v_opponent.id) || ':' ||
                       GREATEST(v_anchor.id, v_opponent.id);

        -- Exit if pair is not in recent list
        EXIT opponent_loop WHEN NOT (v_pair_hash = ANY(v_recent_pairs));
    END LOOP;

    -- Update last_shown_at for both stickers
    UPDATE stickers SET last_shown_at = NOW()
    WHERE id IN (v_anchor.id, v_opponent.id);

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

-- ============================================================
-- STEP 5: RPC Function - submit_vote
-- Records a vote and updates ELO ratings
-- ============================================================

CREATE OR REPLACE FUNCTION submit_vote(
    p_session_id TEXT,
    p_sticker_a_id INTEGER,
    p_sticker_b_id INTEGER,
    p_winner_id INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_sticker_a RECORD;
    v_sticker_b RECORD;
    v_loser_id INTEGER;
    v_expected_a FLOAT;
    v_k_a INTEGER;
    v_k_b INTEGER;
    v_new_rating_a INTEGER;
    v_new_rating_b INTEGER;
    v_pair_hash TEXT;
BEGIN
    -- Validate winner is one of the pair
    IF p_winner_id NOT IN (p_sticker_a_id, p_sticker_b_id) THEN
        RETURN json_build_object('ok', false, 'error', 'Invalid winner');
    END IF;

    -- Validate stickers are different
    IF p_sticker_a_id = p_sticker_b_id THEN
        RETURN json_build_object('ok', false, 'error', 'Stickers must be different');
    END IF;

    v_loser_id := CASE WHEN p_winner_id = p_sticker_a_id
                       THEN p_sticker_b_id ELSE p_sticker_a_id END;

    -- Lock rows for atomic update (prevents race conditions)
    SELECT * INTO v_sticker_a FROM stickers
    WHERE id = p_sticker_a_id FOR UPDATE;

    SELECT * INTO v_sticker_b FROM stickers
    WHERE id = p_sticker_b_id FOR UPDATE;

    -- Validate stickers exist
    IF v_sticker_a IS NULL OR v_sticker_b IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'Sticker not found');
    END IF;

    -- Calculate K-factor based on games played
    -- New stickers (< 10 games): K=40 (fast movement)
    -- Medium (10-29 games): K=20
    -- Established (30+ games): K=10 (stable)
    v_k_a := CASE
        WHEN v_sticker_a.games < 10 THEN 40
        WHEN v_sticker_a.games < 30 THEN 20
        ELSE 10 END;

    v_k_b := CASE
        WHEN v_sticker_b.games < 10 THEN 40
        WHEN v_sticker_b.games < 30 THEN 20
        ELSE 10 END;

    -- ELO calculation
    -- Expected score for A: E_A = 1 / (1 + 10^((R_B - R_A)/400))
    v_expected_a := 1.0 / (1.0 + power(10,
        (v_sticker_b.rating - v_sticker_a.rating)::float / 400));

    -- Update ratings based on winner
    IF p_winner_id = p_sticker_a_id THEN
        -- A won: S_A = 1, S_B = 0
        v_new_rating_a := v_sticker_a.rating + round(v_k_a * (1 - v_expected_a));
        v_new_rating_b := v_sticker_b.rating + round(v_k_b * (0 - (1 - v_expected_a)));
    ELSE
        -- B won: S_A = 0, S_B = 1
        v_new_rating_a := v_sticker_a.rating + round(v_k_a * (0 - v_expected_a));
        v_new_rating_b := v_sticker_b.rating + round(v_k_b * (1 - (1 - v_expected_a)));
    END IF;

    -- Update sticker A
    UPDATE stickers SET
        rating = v_new_rating_a,
        games = games + 1,
        wins = wins + CASE WHEN p_winner_id = p_sticker_a_id THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN p_winner_id != p_sticker_a_id THEN 1 ELSE 0 END
    WHERE id = p_sticker_a_id;

    -- Update sticker B
    UPDATE stickers SET
        rating = v_new_rating_b,
        games = games + 1,
        wins = wins + CASE WHEN p_winner_id = p_sticker_b_id THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN p_winner_id != p_sticker_b_id THEN 1 ELSE 0 END
    WHERE id = p_sticker_b_id;

    -- Record the vote
    INSERT INTO votes (session_id, sticker_a_id, sticker_b_id, winner_id, loser_id,
                       rating_a_before, rating_b_before, rating_a_after, rating_b_after)
    VALUES (p_session_id, p_sticker_a_id, p_sticker_b_id, p_winner_id, v_loser_id,
            v_sticker_a.rating, v_sticker_b.rating, v_new_rating_a, v_new_rating_b);

    -- Update user_recent to prevent repeat pairs
    v_pair_hash := LEAST(p_sticker_a_id, p_sticker_b_id) || ':' ||
                   GREATEST(p_sticker_a_id, p_sticker_b_id);

    INSERT INTO user_recent (session_id, recent_sticker_ids, recent_pair_hashes, updated_at)
    VALUES (
        p_session_id,
        ARRAY[p_sticker_a_id, p_sticker_b_id],
        ARRAY[v_pair_hash],
        NOW()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        recent_sticker_ids = (
            SELECT array_agg(x) FROM (
                SELECT unnest(ARRAY[p_sticker_a_id, p_sticker_b_id] ||
                              user_recent.recent_sticker_ids)
                LIMIT 12
            ) t(x)
        ),
        recent_pair_hashes = (
            SELECT array_agg(x) FROM (
                SELECT unnest(ARRAY[v_pair_hash] || user_recent.recent_pair_hashes)
                LIMIT 30
            ) t(x)
        ),
        updated_at = NOW();

    -- Return result with rating changes
    RETURN json_build_object(
        'ok', true,
        'winner', json_build_object(
            'id', p_winner_id,
            'rating_before', CASE WHEN p_winner_id = p_sticker_a_id
                             THEN v_sticker_a.rating ELSE v_sticker_b.rating END,
            'rating_after', CASE WHEN p_winner_id = p_sticker_a_id
                            THEN v_new_rating_a ELSE v_new_rating_b END
        ),
        'loser', json_build_object(
            'id', v_loser_id,
            'rating_before', CASE WHEN v_loser_id = p_sticker_a_id
                             THEN v_sticker_a.rating ELSE v_sticker_b.rating END,
            'rating_after', CASE WHEN v_loser_id = p_sticker_a_id
                            THEN v_new_rating_a ELSE v_new_rating_b END
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 6: RPC Function - get_sticker_rank
-- Returns rating and rank for a specific sticker
-- ============================================================

CREATE OR REPLACE FUNCTION get_sticker_rank(p_sticker_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_sticker RECORD;
    v_rank INTEGER;
    v_total INTEGER;
BEGIN
    SELECT * INTO v_sticker FROM stickers WHERE id = p_sticker_id;

    IF v_sticker IS NULL THEN
        RETURN json_build_object('error', 'Sticker not found');
    END IF;

    -- Count total active stickers
    SELECT COUNT(*) INTO v_total FROM stickers WHERE active = true;

    -- Calculate rank (1 = highest rating)
    SELECT COUNT(*) + 1 INTO v_rank FROM stickers
    WHERE active = true AND rating > v_sticker.rating;

    RETURN json_build_object(
        'id', v_sticker.id,
        'rating', v_sticker.rating,
        'rank', v_rank,
        'total', v_total,
        'games', v_sticker.games,
        'wins', v_sticker.wins,
        'losses', v_sticker.losses
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 7: Grant permissions for anonymous access
-- ============================================================

-- Allow anonymous users to call these RPC functions
GRANT EXECUTE ON FUNCTION get_battle_pair(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_vote(TEXT, INTEGER, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_sticker_rank(INTEGER) TO anon;

-- Allow anonymous users to read votes count (for stats display)
GRANT SELECT ON votes TO anon;

-- ============================================================
-- STEP 8: Row Level Security (RLS) for votes table
-- ============================================================

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read votes (for counting/stats)
CREATE POLICY "Anyone can view votes" ON votes
    FOR SELECT USING (true);

-- Votes are inserted via RPC function (SECURITY DEFINER), not directly
-- So no INSERT policy needed for anon

-- Enable RLS for user_recent
ALTER TABLE user_recent ENABLE ROW LEVEL SECURITY;

-- user_recent is managed by RPC functions only
-- Create a policy that allows reading (for debugging if needed)
CREATE POLICY "Anyone can view user_recent" ON user_recent
    FOR SELECT USING (true);

-- ============================================================
-- DONE! Your ELO rating system is ready.
-- ============================================================

-- Verify installation by running:
-- SELECT get_battle_pair('test_session');
