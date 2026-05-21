create table if not exists public.ai_competitor_snapshots (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  engine      text not null,
  query       text not null,
  competitor_name text not null,
  position    integer not null,
  scan_week   date not null,
  created_at  timestamptz not null default now()
);

create index if not exists ai_competitor_snapshots_user_week
  on public.ai_competitor_snapshots(user_id, scan_week desc);

alter table public.ai_competitor_snapshots enable row level security;

create policy "Users can read own AI competitor snapshots"
  on public.ai_competitor_snapshots for select using (auth.uid() = user_id);

create policy "Users can insert own AI competitor snapshots"
  on public.ai_competitor_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can delete own AI competitor snapshots"
  on public.ai_competitor_snapshots for delete using (auth.uid() = user_id);
