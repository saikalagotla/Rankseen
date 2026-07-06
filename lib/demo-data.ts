export const DEMO_BIZ = {
  business_name: 'The Craft Barbershop',
  business_type: 'Barbershop',
  city_state: 'Austin, TX',
  plan: 'pro',
  keywords: ['barbershop near me Austin', 'best barbershop Austin TX', 'mens haircut Austin'],
  phone: '(512) 555-0147',
  preview_token: null,
  gbp_url: null,
  yelp_place_id: null,
  google_reviews_synced_at: null,
  yelp_reviews_synced_at: null,
}

export const DEMO_SNAPSHOTS = [
  { keyword: 'barbershop near me Austin', rank: 3, scan_week: '2026-05-19' },
  { keyword: 'barbershop near me Austin', rank: 5, scan_week: '2026-05-12' },
  { keyword: 'barbershop near me Austin', rank: 6, scan_week: '2026-05-05' },
  { keyword: 'barbershop near me Austin', rank: 5, scan_week: '2026-04-28' },
  { keyword: 'best barbershop Austin TX', rank: 7, scan_week: '2026-05-19' },
  { keyword: 'best barbershop Austin TX', rank: 7, scan_week: '2026-05-12' },
  { keyword: 'best barbershop Austin TX', rank: 9, scan_week: '2026-05-05' },
  { keyword: 'best barbershop Austin TX', rank: 8, scan_week: '2026-04-28' },
  { keyword: 'mens haircut Austin', rank: 12, scan_week: '2026-05-19' },
  { keyword: 'mens haircut Austin', rank: 14, scan_week: '2026-05-12' },
  { keyword: 'mens haircut Austin', rank: 13, scan_week: '2026-05-05' },
  { keyword: 'mens haircut Austin', rank: 15, scan_week: '2026-04-28' },
]

export const DEMO_COMPETITORS = [
  { keyword: 'barbershop near me Austin', competitor_name: "Frank's Classic Cuts", position: 1 },
  { keyword: 'barbershop near me Austin', competitor_name: 'South Congress Barbers', position: 2 },
  { keyword: 'best barbershop Austin TX', competitor_name: "Frank's Classic Cuts", position: 1 },
  { keyword: 'best barbershop Austin TX', competitor_name: 'The Barber Lounge', position: 2 },
  { keyword: 'best barbershop Austin TX', competitor_name: 'South Congress Barbers', position: 3 },
  { keyword: 'mens haircut Austin', competitor_name: 'Style Co. Barbers', position: 1 },
  { keyword: 'mens haircut Austin', competitor_name: "Frank's Classic Cuts", position: 2 },
]

export const DEMO_AI_RESULTS = [
  { engine: 'perplexity', mentioned: true,  query: 'best barbershop in Austin TX',   position: 2,    excerpt: 'The Craft Barbershop is a top-rated spot in Austin known for precision fades.', scan_week: '2026-05-19' },
  { engine: 'perplexity', mentioned: true,  query: 'barbershop near me Austin',       position: 1,    excerpt: null, scan_week: '2026-05-19' },
  { engine: 'google_ai',  mentioned: true,  query: 'best barbershop in Austin TX',   position: 3,    excerpt: null, scan_week: '2026-05-19' },
  { engine: 'google_ai',  mentioned: false, query: 'affordable haircut Austin',       position: null, excerpt: null, scan_week: '2026-05-19' },
  { engine: 'claude',     mentioned: false, query: 'best barbershop in Austin TX',   position: null, excerpt: null, scan_week: '2026-05-19' },
  { engine: 'claude',     mentioned: false, query: 'barbershop near me Austin',       position: null, excerpt: null, scan_week: '2026-05-19' },
  { engine: 'chatgpt',    mentioned: true,  query: 'best barbershop in Austin TX',   position: 4,    excerpt: 'The Craft Barbershop offers classic cuts and modern styles in South Austin.', scan_week: '2026-05-19' },
  { engine: 'chatgpt',    mentioned: false, query: 'affordable haircut Austin',       position: null, excerpt: null, scan_week: '2026-05-19' },
  { engine: 'bing',       mentioned: false, query: 'best barbershop in Austin TX',   position: null, excerpt: null, scan_week: '2026-05-19' },
  { engine: 'bing',       mentioned: false, query: 'barbershop near me Austin',       position: null, excerpt: null, scan_week: '2026-05-19' },
]

export const DEMO_AI_COMPETITORS = [
  { competitor_name: "Frank's Classic Cuts", engine: 'google_ai', position: 1 },
  { competitor_name: 'South Congress Barbers', engine: 'google_ai', position: 2 },
  { competitor_name: 'The Barber Lounge', engine: 'claude', position: 1 },
  { competitor_name: "Frank's Classic Cuts", engine: 'claude', position: 2 },
  { competitor_name: 'South Congress Barbers', engine: 'chatgpt', position: 1 },
  { competitor_name: "Frank's Classic Cuts", engine: 'chatgpt', position: 3 },
  { competitor_name: 'Style Co. Barbers', engine: 'bing', position: 1 },
  { competitor_name: 'The Barber Lounge', engine: 'bing', position: 2 },
]

export const DEMO_CITATIONS = [
  { platform: 'Google', status: 'ok', issue: null, category: 'search', listing_url: null, scan_date: '2026-05-19' },
  { platform: 'Yelp', status: 'warn', issue: 'Phone number format differs — update to match Google.', category: 'review', listing_url: 'https://www.yelp.com/biz/the-fade-room-austin', scan_date: '2026-05-19' },
  { platform: 'Facebook', status: 'ok', issue: null, category: 'social', listing_url: 'https://www.facebook.com/thefaderoomatx', scan_date: '2026-05-19' },
  { platform: 'Foursquare', status: 'warn', issue: 'Address abbreviation mismatch.', category: 'directory', listing_url: 'https://foursquare.com/v/the-fade-room', scan_date: '2026-05-19' },
  { platform: 'TripAdvisor', status: 'ok', issue: null, category: 'review', listing_url: 'https://www.tripadvisor.com/the-fade-room', scan_date: '2026-05-19' },
  { platform: 'Yellow Pages', status: 'missing', issue: null, category: 'directory', listing_url: null, scan_date: '2026-05-19' },
]

export const DEMO_CONTENT = [
  {
    kind: 'website', title: 'thefaderoom.com', url: 'https://thefaderoom.com', mentioned: true, scan_date: '2026-05-19',
    detail: {
      reachable: true, score: 67, snippet: null,
      checks: [
        { id: 'schema', label: 'LocalBusiness schema markup', passed: false, fix: 'Add JSON-LD LocalBusiness schema to your homepage (name, address, phone, hours, geo, url). It is the clearest way to tell AI assistants your exact business details.' },
        { id: 'name', label: 'Business name in page text', passed: true, fix: '' },
        { id: 'city', label: 'City named on the homepage', passed: true, fix: '' },
        { id: 'phone', label: 'Phone number on the page', passed: false, fix: 'Show your phone number as selectable text (not only inside an image), and make sure it matches your Google listing exactly.' },
        { id: 'title', label: 'Descriptive page title', passed: true, fix: '' },
        { id: 'meta', label: 'Meta description', passed: true, fix: '' },
        { id: 'about', label: 'About / Services page', passed: true, fix: '' },
        { id: 'https', label: 'Secure (HTTPS)', passed: true, fix: '' },
        { id: 'mobile', label: 'Mobile-friendly viewport', passed: false, fix: 'Add a responsive viewport meta tag so the site renders properly on phones — most local searches happen on mobile.' },
      ],
    },
  },
  { kind: 'listicle', title: 'The 15 Best Barbershops in Austin (2026) — Austin Monthly', url: 'https://www.austinmonthly.com/best-barbershops-austin', mentioned: true, scan_date: '2026-05-19', detail: { snippet: 'Our editors picked the top spots for a fresh cut, from South Congress to the East Side…' } },
  { kind: 'listicle', title: '10 Best Barber Shops in Austin, TX — Expertise.com', url: 'https://www.expertise.com/tx/austin/barber-shops', mentioned: false, scan_date: '2026-05-19', detail: { snippet: 'We reviewed 42 barber shops and picked the top 10 based on reputation, credibility, and experience…' } },
  { kind: 'listicle', title: 'Where to Get the Best Fade in Austin — Do512', url: 'https://do512.com/best-fade-austin', mentioned: false, scan_date: '2026-05-19', detail: { snippet: 'A neighborhood-by-neighborhood guide to Austin’s sharpest fades…' } },
  { kind: 'reddit', title: 'Best barbershop in South Austin? : r/Austin', url: 'https://www.reddit.com/r/Austin/comments/best-barbershop-south', mentioned: true, scan_date: '2026-05-19', detail: { snippet: 'A few folks recommend The Fade Room on South Congress — great with skin fades…' } },
  { kind: 'reddit', title: 'Recommendations for a good barber near downtown? : r/austinfood', url: 'https://www.reddit.com/r/Austin/comments/barber-downtown', mentioned: false, scan_date: '2026-05-19', detail: { snippet: 'Looking for someone who can do a classic taper, downtown-ish…' } },
]

export const DEMO_REVIEWS = [
  { id: '1', author: 'Marcus T.', rating: 5, body: "Best haircut I've had in years. Attention to detail is unreal.", source: 'google', replied: true, published_at: '2026-05-18', url: null, reply_text: 'Thank you Marcus! Always a pleasure to have you in. See you next time!' },
  { id: '2', author: 'Sarah K.', rating: 4, body: 'Great atmosphere and skilled barbers — will definitely come back.', source: 'yelp', replied: false, published_at: '2026-05-15', url: null, reply_text: null },
  { id: '3', author: 'James R.', rating: 5, body: 'Always consistent, always on time. My go-to spot.', source: 'google', replied: true, published_at: '2026-05-10', url: null, reply_text: 'James, we appreciate the kind words! See you soon.' },
  { id: '4', author: 'David L.', rating: 5, body: 'Walked in without an appointment and was seen in 10 minutes. Incredible fade.', source: 'google', replied: false, published_at: '2026-05-08', url: null, reply_text: null },
  { id: '5', author: 'Carlos M.', rating: 3, body: 'Good cut but wait time was longer than expected.', source: 'yelp', replied: true, published_at: '2026-05-03', url: null, reply_text: "Thanks for the feedback Carlos, we're working on reducing wait times." },
]
