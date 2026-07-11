-- ============================================================
-- 005: Index Advisor indexes (2026-07-11)
-- Suggested by index_advisor (hypopg) against the top queries
-- in pg_stat_statements. EXPLAIN ANALYZE proof:
--   ORDER BY created_at DESC LIMIT 20 (109k calls, homepage feed):
--     seq scan + top-N sort 1.507ms -> index scan 0.135ms
--   WHERE club_id = $1 (41k calls, club pages):
--     seq scan (3683 rows filtered) 0.864ms -> index scan 0.197ms
-- No index for get_sticker_rank counts: advisor found none useful
-- (low selectivity on rating > $1), existing idx_stickers_rating
-- already covers battle pairing.
-- ============================================================

create index idx_stickers_created_at on public.stickers using btree (created_at desc);
create index idx_stickers_club_id on public.stickers using btree (club_id);
