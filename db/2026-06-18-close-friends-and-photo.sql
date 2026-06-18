-- Migration: close_friends circle + pharmacy profile photo
-- Date: 2026-06-18
-- Project ref: fgzgljffrqsupwhvtdvb
-- Apply via Supabase Management API (POST /v1/projects/{ref}/database/query)
-- or the Supabase SQL editor (these are plain DDL statements; no ALTER DATABASE).

-- 1. Pharmacy profile photo
alter table public.profiles add column if not exists photo_url text;

-- 2. Close-friends circle (owner-only private favorites)
create table if not exists public.close_friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, friend_profile_id)
);

alter table public.close_friends enable row level security;

create policy "owner can read own close friends"
  on public.close_friends for select
  using (owner_id = auth.uid());

create policy "owner can add close friends"
  on public.close_friends for insert
  with check (owner_id = auth.uid());

create policy "owner can remove close friends"
  on public.close_friends for delete
  using (owner_id = auth.uid());
