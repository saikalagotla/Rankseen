-- Cache the SerpAPI data_id for the business's Google Maps listing
-- and the Yelp business ID — avoids a lookup on every review sync.
alter table public.profiles
  add column if not exists place_id text;

alter table public.profiles
  add column if not exists yelp_place_id text;
