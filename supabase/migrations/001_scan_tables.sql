-- Run this in Supabase Dashboard → SQL Editor
-- Adds scan data tables and phone field to profiles

-- Add phone field to profiles
alter table public.profiles
  add column if not exists phone text;

-- Rank snapshots: one row per keyword per scan week
create table if not exists public.rank_snapshots (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  keyword     text not null,
  rank        integer,  -- null = not found in top 20
  scan_week   date not null,  -- monday of the week
  created_at  timestamptz not null default now()
);

create index if not exists rank_snapshots_user_week
  on public.rank_snapshots(user_id, scan_week desc);

alter table public.rank_snapshots enable row level security;

create policy "Users can read own rank snapshots"
  on public.rank_snapshots for select using (auth.uid() = user_id);

create policy "Users can insert own rank snapshots"
  on public.rank_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can delete own rank snapshots"
  on public.rank_snapshots for delete using (auth.uid() = user_id);

-- AI visibility results: one row per engine per query per scan week
create table if not exists public.ai_visibility_results (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  engine      text not null,  -- 'perplexity', 'claude', 'chatgpt', 'google_ai', 'bing'
  query       text not null,
  mentioned   boolean not null default false,
  position    integer,
  excerpt     text,
  scan_week   date not null,
  created_at  timestamptz not null default now()
);

create index if not exists ai_visibility_user_week
  on public.ai_visibility_results(user_id, scan_week desc);

alter table public.ai_visibility_results enable row level security;

create policy "Users can read own AI visibility"
  on public.ai_visibility_results for select using (auth.uid() = user_id);

create policy "Users can insert own AI visibility"
  on public.ai_visibility_results for insert with check (auth.uid() = user_id);

create policy "Users can delete own AI visibility"
  on public.ai_visibility_results for delete using (auth.uid() = user_id);

-- Citation snapshots: one row per platform per scan date
create table if not exists public.citation_snapshots (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  platform    text not null,
  category    text not null,  -- 'Primary', 'Social', 'Directory'
  status      text not null,  -- 'ok', 'warn', 'missing'
  issue       text,
  scan_date   date not null,
  created_at  timestamptz not null default now()
);

create index if not exists citation_snapshots_user_date
  on public.citation_snapshots(user_id, scan_date desc);

alter table public.citation_snapshots enable row level security;

create policy "Users can read own citations"
  on public.citation_snapshots for select using (auth.uid() = user_id);

create policy "Users can insert own citations"
  on public.citation_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can delete own citations"
  on public.citation_snapshots for delete using (auth.uid() = user_id);

-- Reviews: one row per review per user (deduped by external_id)
create table if not exists public.reviews (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  source      text not null,  -- 'google', 'yelp'
  external_id text,
  author      text,
  rating      integer,
  body        text,
  published_at timestamptz,
  replied     boolean not null default false,
  reply_text  text,
  fetched_at  timestamptz not null default now(),
  unique(user_id, source, external_id)
);

alter table public.reviews enable row level security;

create policy "Users can read own reviews"
  on public.reviews for select using (auth.uid() = user_id);

create policy "Users can insert own reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update using (auth.uid() = user_id);
