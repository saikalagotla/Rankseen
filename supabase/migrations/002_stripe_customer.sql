-- Add stripe_customer_id to profiles so subscription cancellations can be matched
alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;
