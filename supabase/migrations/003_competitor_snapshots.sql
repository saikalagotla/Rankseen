create table if not exists competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  scan_week date not null,
  position integer not null,
  competitor_name text not null,
  created_at timestamptz default now()
);

create index if not exists competitor_snapshots_user_week
  on competitor_snapshots(user_id, scan_week);

alter table public.competitor_snapshots enable row level security;

create policy "Users can read own competitor snapshots"
  on public.competitor_snapshots for select using (auth.uid() = user_id);

create policy "Users can insert own competitor snapshots"
  on public.competitor_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can delete own competitor snapshots"
  on public.competitor_snapshots for delete using (auth.uid() = user_id);
