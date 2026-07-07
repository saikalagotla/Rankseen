import { geocodeCity } from './serp'
import { fetchWithTimeout } from './http'

export interface ReviewRecord {
  external_id: string
  author: string | null
  rating: number | null
  body: string | null
  published_at: string | null
  url: string | null
}

// ── Google (SerpAPI) ────────────────────────────────────────────────────────

// Search for the business on Google Maps via SerpAPI and return the data_id
// needed to fetch reviews. Returns null if the business is not found.
export async function findBusinessDataId(
  businessName: string,
  cityState: string,
  apiKey: string
): Promise<string | null> {
  const ll = await geocodeCity(cityState)
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps',
    q: businessName,
    type: 'search',
  })
  if (ll) params.set('ll', ll)
  else params.set('location', cityState || 'United States')

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) return null

  const data = await res.json()
  if (data.error) return null

  // Direct business lookup returns place_results (object)
  if (data.place_results?.data_id) return data.place_results.data_id

  // Category/keyword searches return local_results (array) — pick the name match
  const bizLower = businessName.toLowerCase().trim()
  const match = (data.local_results ?? []).find((r: { title?: string; data_id?: string }) => {
    const title = (r.title ?? '').toLowerCase().trim()
    return title.includes(bizLower) || (bizLower.length > 4 && bizLower.includes(title))
  })

  return (match as { data_id?: string } | undefined)?.data_id ?? null
}

// Fetch the most recent reviews for a business using its SerpAPI data_id.
export async function fetchGoogleReviews(dataId: string, apiKey: string): Promise<ReviewRecord[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps_reviews',
    data_id: dataId,
    sort_by: 'newestFirst',
  })

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) return []

  const data = await res.json()
  if (data.error) return []

  const raw: Array<{
    review_id?: string
    user?: { name?: string }
    rating?: number
    iso_date?: string
    snippet?: string
    link?: string
  }> = data.reviews ?? []

  return raw
    .filter(r => r.review_id)
    .map(r => ({
      external_id: r.review_id!,
      author: r.user?.name ?? null,
      rating: r.rating ?? null,
      body: r.snippet ?? null,
      published_at: r.iso_date ?? null,
      url: r.link ?? null,
    }))
}

// ── Yelp (Yelp Fusion API) ──────────────────────────────────────────────────

// Find the Yelp business ID by searching the Fusion API.
// Returns null if not found or on error.
export async function findYelpBusinessId(
  businessName: string,
  cityState: string,
  apiKey: string
): Promise<string | null> {
  const params = new URLSearchParams({
    term: businessName,
    location: cityState,
    limit: '5',
  })

  const res = await fetchWithTimeout(`https://api.yelp.com/v3/businesses/search?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = await res.json()
  const businesses: Array<{ id?: string; name?: string }> = data.businesses ?? []

  const bizLower = businessName.toLowerCase().trim()
  const match = businesses.find(b => {
    const name = (b.name ?? '').toLowerCase().trim()
    return name.includes(bizLower) || (bizLower.length > 4 && bizLower.includes(name))
  })

  return match?.id ?? businesses[0]?.id ?? null
}

// Fetch reviews for a Yelp business by its Yelp business ID.
// The free Yelp Fusion API returns up to 3 reviews per call.
export async function fetchYelpReviews(businessId: string, apiKey: string): Promise<ReviewRecord[]> {
  const params = new URLSearchParams({ limit: '20', sort_by: 'newest' })

  const res = await fetchWithTimeout(
    `https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}/reviews?${params}`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
  )
  if (!res.ok) return []

  const data = await res.json()
  const raw: Array<{
    id?: string
    user?: { name?: string }
    rating?: number
    time_created?: string
    text?: string
    url?: string
  }> = data.reviews ?? []

  return raw
    .filter(r => r.id)
    .map(r => ({
      external_id: r.id!,
      author: r.user?.name ?? null,
      rating: r.rating ?? null,
      body: r.text ?? null,
      // Yelp returns "YYYY-MM-DD HH:MM:SS" in local time — treat as UTC for storage
      published_at: r.time_created ? new Date(r.time_created.replace(' ', 'T') + 'Z').toISOString() : null,
      url: r.url ?? null,
    }))
}
