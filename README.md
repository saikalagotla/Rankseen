# SpottedHQ

Local SEO + AI visibility tracking for small businesses. Tracks Google Maps rankings, checks whether ChatGPT / Perplexity / Google AI / Claude / Bing Copilot recommend a business, scans citation health, and monitors reviews — delivered as a weekly plain-English report.

## Stack

- **Next.js 16** (App Router, Turbopack) + Tailwind CSS 4
- **Supabase** — auth (Google OAuth) + Postgres with RLS
- **Stripe** — subscriptions (Starter $19, Pro $49, 14-day trial)
- **SerpAPI** — Google Maps rank + Google AI Overview / Bing checks
- **Mixpanel + Vercel Analytics** — product analytics

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy these into `.env.local` (and Vercel for production):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; Stripe webhook plan updates (bypasses RLS) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API + webhook signature |
| `STRIPE_STARTER_PRICE_ID` / `STRIPE_PRO_PRICE_ID` | Subscription prices |
| `NEXT_PUBLIC_APP_URL` | Canonical origin for redirects + sitemap |
| `SERP_API_KEY` | Maps rank, Google AI Overview, Bing Copilot checks |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` | AI engine visibility checks |
| `YELP_API_KEY` | Review + citation scans |
| `OWNER_EMAIL` | Gates the internal `/generate` prospect-snapshot tool |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Analytics |

## Key routes

- `/` — landing page (pricing, features)
- `/setup` → `/login` → `/onboarding` — signup funnel
- `/dashboard` — main app (shows demo data when logged out)
- `/generate` — internal (owner-only) tool that creates shareable prospect snapshots
- `/snapshot/[token]` — public prospect report used for outreach
- `/api/webhook` — Stripe webhook (updates `profiles.plan` via service role)
