-- Web push: device subscriptions + trigger that calls the push-notify edge function.

create extension if not exists pg_net;

create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_profile_idx on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

drop policy if exists "own subs select" on push_subscriptions;
drop policy if exists "own subs insert" on push_subscriptions;
drop policy if exists "own subs update" on push_subscriptions;
drop policy if exists "own subs delete" on push_subscriptions;

create policy "own subs select" on push_subscriptions
  for select using (auth.uid() = profile_id);
create policy "own subs insert" on push_subscriptions
  for insert with check (auth.uid() = profile_id);
create policy "own subs update" on push_subscriptions
  for update using (auth.uid() = profile_id);
create policy "own subs delete" on push_subscriptions
  for delete using (auth.uid() = profile_id);

-- On new message, POST the payload to the push-notify edge function.
-- Shared secret is inlined here (server-side only, never exposed to clients);
-- must match the PUSH_HOOK_SECRET edge-function secret.
create or replace function notify_push_on_message()
returns trigger
language plpgsql
security definer
as $$
declare
  fn_url text := 'https://fgzgljffrqsupwhvtdvb.supabase.co/functions/v1/push-notify';
  hook_secret text := 'dc4baa9a9b15e116968f03cfbbd0b24dd7f06145ec4fecb9';
begin
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hook-secret', hook_secret
    ),
    body := jsonb_build_object(
      'recipient_id', NEW.recipient_id,
      'sender_id', NEW.sender_id,
      'post_id', NEW.post_id,
      'body', NEW.body
    )
  );
  return NEW;
end;
$$;

drop trigger if exists on_message_push on messages;
create trigger on_message_push
  after insert on messages
  for each row execute function notify_push_on_message();
