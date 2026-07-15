import { fetchWithTimeout } from './http'

export function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export interface RankResult {
  keyword: string
  rank: number | null
  competitors: Array<{ name: string; position: number }>
}

// Geocode a city name to a SerpAPI `ll` string (@lat,lng,14z) using Nominatim.
// Returns null on failure — callers fall back to location string.
export async function geocodeCity(cityState: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(cityState)
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`,
      { headers: { 'User-Agent': 'SpottedHQ/1.0' }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const place = data[0]
    if (place?.lat && place?.lon) return `@${place.lat},${place.lon},14z`
  } catch {}
  return null
}

export async function checkMapsRank(
  keyword: string,
  businessName: string,
  location: string,
  apiKey: string,
  ll?: string
): Promise<RankResult> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps',
    q: keyword,
    type: 'search',
  })

  // ll (GPS coordinates) is the correct way to scope a google_maps search to a city.
  // location is a fallback for the searcher IP region.
  if (ll) {
    params.set('ll', ll)
  } else {
    params.set('location', location || 'United States')
  }

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SerpAPI HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(`SerpAPI: ${data.error}`)

  const results: Array<{ title?: string }> = data.local_results ?? []
  const biz = businessName.toLowerCase().trim()

  const idx = results.findIndex(r => {
    const title = (r.title ?? '').toLowerCase().trim()
    return title.includes(biz) || (biz.length > 4 && biz.includes(title))
  })

  const competitors = results
    .slice(0, 10)
    .map((r, i) => ({ name: r.title ?? '', position: i + 1 }))
    .filter(c => {
      const title = c.name.toLowerCase().trim()
      return !title.includes(biz) && !(biz.length > 4 && biz.includes(title))
    })
    .slice(0, 3)

  return { keyword, rank: idx >= 0 ? idx + 1 : null, competitors }
}

export interface CitationCheckResult {
  status: 'ok' | 'warn' | 'missing'
  issue?: string
  url?: string  // direct link to the business's listing on this directory
}

// GBP listings aren't indexed at business.google.com, so we check via the
// google_maps engine instead — searching by business name directly.
async function checkGBPCitation(
  businessName: string,
  cityState: string,
  apiKey: string
): Promise<CitationCheckResult> {
  const ll = await geocodeCity(cityState)
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps',
    q: businessName,
    type: 'search',
  })
  if (ll) {
    params.set('ll', ll)
  } else {
    params.set('location', cityState || 'United States')
  }

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })
  if (!res.ok) return { status: 'missing' }

  const data = await res.json()
  if (data.error) return { status: 'missing' }

  const bizLower = businessName.toLowerCase().trim()
  const titleMatches = (title: string) => {
    const t = title.toLowerCase().trim()
    return t.includes(bizLower) || (bizLower.length > 4 && bizLower.includes(t))
  }

  // SerpAPI returns place_results (object) for direct business name lookups,
  // and local_results (array) for category searches. Check both.
  const inPlace = data.place_results?.title ? titleMatches(data.place_results.title) : false
  const inLocal = (data.local_results ?? []).some((r: { title?: string }) => titleMatches(r.title ?? ''))

  return (inPlace || inLocal) ? { status: 'ok' } : { status: 'missing' }
}

export async function checkCitation(
  platform: string,
  searchDomain: string,
  businessName: string,
  cityState: string,
  apiKey: string
): Promise<CitationCheckResult> {
  if (platform === 'Google Business Profile') {
    return checkGBPCitation(businessName, cityState, apiKey)
  }
  const city = cityState.split(',')[0].trim()
  const query = `site:${searchDomain} "${businessName}" "${city}"`

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google',
    q: query,
    num: '5',
  })

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })

  if (!res.ok) return { status: 'missing' }

  const data = await res.json()
  const results: Array<{ title?: string; snippet?: string; link?: string }> = data.organic_results ?? []

  if (results.length === 0) return { status: 'missing' }

  const bizLower = businessName.toLowerCase()
  const matched = results.find(r =>
    r.title?.toLowerCase().includes(bizLower) ||
    r.snippet?.toLowerCase().includes(bizLower)
  )

  // The matching organic result's link is the business's actual listing page
  // on this directory (e.g. yelp.com/biz/...), not the directory homepage.
  if (matched) return { status: 'ok', url: matched.link }
  return {
    status: 'warn',
    issue: `Listing found on ${platform} but the name in search results may not match exactly. Log in to verify.`,
    url: results[0]?.link,
  }
}

// Bare registrable hostname for matching (drops protocol, www, path).
function extractDomain(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

export type OrganicRankResult = { rank: number | null; url: string | null }

// Where the business's WEBSITE ranks in regular Google web results (not the
// Maps local pack) for a keyword, grounded to the business's city.
export async function checkOrganicRank(
  keyword: string,
  websiteUrl: string,
  cityState: string,
  apiKey: string
): Promise<OrganicRankResult> {
  const domain = extractDomain(websiteUrl)
  if (!domain) return { rank: null, url: null }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google',
    q: keyword,
    num: '20',
  })
  if (cityState) params.set('location', cityState)

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) return { rank: null, url: null }

  const data = await res.json()
  const results: Array<{ position?: number; link?: string }> = data.organic_results ?? []

  for (const r of results) {
    if (r.link && extractDomain(r.link) === domain) {
      return { rank: r.position ?? null, url: r.link ?? null }
    }
  }
  return { rank: null, url: null }
}
