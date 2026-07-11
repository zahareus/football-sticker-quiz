-- ============================================================
-- 004: Event-driven club page regeneration (2026-07-11)
-- Replaces the per-minute n8n "SH clubs poller" as the PRIMARY
-- change-detection path. The poller stays as an HOURLY FALLBACK:
-- GitHub keeps only one pending run per concurrency group, so
-- bulk club edits can lose per-row dispatches — the poller's
-- batched diff is what recovers them. NEVER delete the poller.
-- Webhook: n8n "SH club changed (webhook)" (NYYH4Oqul9f5g7jw).
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_club_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Watched fields = everything rendered on club/country pages.
  -- Keep in sync with the poller's WATCHED list (n8n qESondLX2tc7dMmH).
  if tg_op = 'UPDATE' and (
    row(new.name, new.country, new.city, new.media, new.web)
    is not distinct from
    row(old.name, old.country, old.city, old.media, old.web)
  ) then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://n8n.ontext.info/webhook/c5012bfa-a281-4c0e-ba46-7c48cab5a2aa',
      body := jsonb_build_object('club_id', new.id, 'op', tg_op),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    null; -- never block a write to clubs because of notification plumbing
  end;

  return new;
end $$;

revoke execute on function public.notify_club_changed() from public;

drop trigger if exists clubs_changed_webhook on public.clubs;
create trigger clubs_changed_webhook
after insert or update on public.clubs
for each row execute function public.notify_club_changed();
