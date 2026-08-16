-- ============================================================
-- Bound what the two anon-callable RPCs can write
-- Closes F27 and F32 of CLAUDE-SECURITY-20260815-200225.
--
-- Both functions are SECURITY DEFINER and granted to `anon`, which is correct —
-- the quiz and battle modes are played without an account. What was missing is
-- any ceiling on what a single call can do.
--
-- NOT applied by CI. Apply through the Management API, per CLAUDE.md.
-- ============================================================

-- ── F27: view_count could be driven to int4 overflow ────────────────────────
-- increment_sticker_views(ids) added one per array element with no bound on the
-- array, so a caller could pass hundreds of thousands of copies of one id per
-- request and, repeated, push view_count past 2^31-1 — at which point the
-- UPDATE starts failing and the sticker page write path errors.
-- Two ceilings: the batch is capped, and the running total saturates.
CREATE OR REPLACE FUNCTION public.increment_sticker_views(ids INTEGER[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids INTEGER[];
BEGIN
    IF ids IS NULL OR array_length(ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- A real page view batches a handful of ids; anything beyond that is abuse,
    -- so take the first 100 rather than rejecting (a partial count beats an error
    -- for a fire-and-forget analytics call).
    v_ids := ids[1:100];

    UPDATE public.stickers AS s
    SET view_count = LEAST(s.view_count + increments.increment_by, 2000000000)
    FROM (
        SELECT sticker_id, COUNT(*)::INTEGER AS increment_by
        FROM unnest(v_ids) AS sticker_id
        WHERE sticker_id IS NOT NULL
        GROUP BY sticker_id
    ) AS increments
    WHERE s.id = increments.sticker_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sticker_views(INTEGER[]) TO anon;

-- ── F32: session_id was accepted in any shape ───────────────────────────────
-- submit_vote writes user_recent keyed by a client-supplied session_id, so a
-- caller could pick another player's id and poison their "recently seen" list,
-- or invent unbounded ids to grow the table. The id is generated client-side by
-- design (no account needed), so it cannot be authenticated — but it can be held
-- to the shape the client actually produces, which stops the table being used as
-- free storage and makes targeting a specific victim require knowing their id
-- exactly rather than guessing a prefix.
ALTER TABLE public.user_recent
    DROP CONSTRAINT IF EXISTS user_recent_session_id_shape;

ALTER TABLE public.user_recent
    ADD CONSTRAINT user_recent_session_id_shape
    CHECK (session_id ~ '^[A-Za-z0-9_-]{8,64}$');

-- ── Deliberately NOT fixed here ─────────────────────────────────────────────
-- F9/F15 report that submit_vote accepts any (sticker_a, sticker_b, winner)
-- triple. The winner-is-in-the-pair check already exists (001, "Invalid winner")
-- and is live in the database — verified with pg_get_functiondef. What remains
-- true is that a vote is not bound to a pair this session was actually served:
-- get_battle_pair hands out a pair but records nothing, so there is no server
-- state to check a later vote against. Closing that needs a served-pairs table
-- with a TTL, which is a schema change and a battle-flow change, not a patch —
-- tracked in docs/BACKLOG.md. Current exposure is rating inflation only
-- (3392 votes across 1066 sessions today, no sign of abuse).
