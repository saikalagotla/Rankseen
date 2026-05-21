-- Track when each platform's reviews were last synced per user.
-- Used to enforce a 24-hour rate limit between syncs.
alter table public.profiles
  add column if not exists google_reviews_synced_at timestamptz;

alter table public.profiles
  add column if not exists yelp_reviews_synced_at timestamptz;
