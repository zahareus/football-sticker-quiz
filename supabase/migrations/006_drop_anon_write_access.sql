-- 006: drop anonymous write access to content tables + storage
--
-- ⚠️ APPLIED MANUALLY via Supabase Management API on 2026-08-15.
-- DO NOT run `supabase db push` against prod — migrations 001-005 were also
-- applied out-of-band and the CLI would try to replay the whole chain.
--
-- Context (security audit 2026-08-15): RLS was enabled, but permissive
-- anon-role policies allowed ANYONE holding the public sb_publishable key
-- (embedded in client JS by design) to INSERT clubs, INSERT stickers,
-- UPDATE any sticker, and upload files to the stickers bucket — with no
-- login. Legitimate writes never used the anon path:
--   * upload.html / upload-batch.html / club-create.html write as
--     `authenticated` (gated by profiles.can_upload / can_edit policies,
--     which stay untouched);
--   * n8n "SH webhook poster" writes under the service-role key;
--   * game RPCs (submit_vote, increment_sticker_views, record_quiz_answer,
--     get_battle_pair) are SECURITY DEFINER and unaffected.
--
-- Verified after apply: anon INSERT/UPDATE → 42501, anon storage upload →
-- 403, anon SELECT still 200, service-role path still 200, RPCs 200/204.

BEGIN;

DROP POLICY "allow insert for anon" ON public.clubs;
DROP POLICY "allow insert for anon" ON public.stickers;
DROP POLICY "allow update for anon" ON public.stickers;
DROP POLICY "allow upload for anon pbxz2u_0" ON storage.objects;

-- Table-level grants backed the policies; revoke DELETE too — nothing
-- legitimate deletes as anon, and a future careless FOR ALL policy must
-- not reopen the door.
REVOKE INSERT, UPDATE, DELETE ON public.clubs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.stickers FROM anon;

COMMIT;
