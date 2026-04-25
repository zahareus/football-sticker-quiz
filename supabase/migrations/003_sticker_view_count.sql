-- ============================================================
-- Sticker view count tracking
-- ============================================================

ALTER TABLE public.stickers
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_sticker_views(ids INTEGER[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF ids IS NULL OR array_length(ids, 1) IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.stickers AS s
    SET view_count = s.view_count + increments.increment_by
    FROM (
        SELECT sticker_id, COUNT(*)::INTEGER AS increment_by
        FROM unnest(ids) AS sticker_id
        WHERE sticker_id IS NOT NULL
        GROUP BY sticker_id
    ) AS increments
    WHERE s.id = increments.sticker_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sticker_views(INTEGER[]) TO anon;
