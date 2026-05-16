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
}

export async function checkMapsRank(
  keyword: string,
  businessName: string,
  location: string,
  apiKey: string
): Promise<RankResult> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps',
    q: keyword,
    location: location || 'United States',
    type: 'search',
    num: '20',
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
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

  return { keyword, rank: idx >= 0 ? idx + 1 : null }
}

export interface CitationCheckResult {
  status: 'ok' | 'warn' | 'missing'
  issue?: string
}

export async function checkCitation(
  platform: string,
  searchDomain: string,
  businessName: string,
  cityState: string,
  apiKey: string
): Promise<CitationCheckResult> {
  const city = cityState.split(',')[0].trim()
  const query = `site:${searchDomain} "${businessName}" "${city}"`

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google',
    q: query,
    num: '5',
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })

  if (!res.ok) return { status: 'missing' }

  const data = await res.json()
  const results: Array<{ title?: string; snippet?: string }> = data.organic_results ?? []

  if (results.length === 0) return { status: 'missing' }

  const bizLower = businessName.toLowerCase()
  const exactMatch = results.some(r =>
    r.title?.toLowerCase().includes(bizLower) ||
    r.snippet?.toLowerCase().includes(bizLower)
  )

  if (exactMatch) return { status: 'ok' }
  return {
    status: 'warn',
    issue: `Listing found on ${platform} but the name in search results may not match exactly. Log in to verify.`,
  }
}
