import { nameMentionedIn } from './ai-checks'

// ── Types ────────────────────────────────────────────────────────────────────

export type AuditCheck = {
  id: string
  label: string
  passed: boolean
  fix: string
}

export type WebsiteAudit = {
  reachable: boolean
  score: number // 0–100
  checks: AuditCheck[]
}

export type ContentListing = {
  title: string
  url: string
  mentioned: boolean
  snippet: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const u = raw.trim()
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SpottedHQ/1.0; +https://spottedhq.com)' },
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ── Website & schema audit (no API key — just fetches the page) ───────────────

const LOCAL_BUSINESS_TYPES =
  /(LocalBusiness|Restaurant|Store|ProfessionalService|Dentist|Physician|MedicalBusiness|HealthAndBeautyBusiness|FoodEstablishment|AutoRepair|BarOrPub|BeautySalon|HairSalon|DaySpa|Gym|SportsActivityLocation|LegalService|HomeAndConstructionBusiness)/i

export async function auditWebsite(
  rawUrl: string,
  businessName: string,
  cityState: string,
  phone: string | null
): Promise<WebsiteAudit> {
  const url = normalizeUrl(rawUrl)
  const html = await fetchHtml(url)

  if (html === null) {
    return {
      reachable: false,
      score: 0,
      checks: [{
        id: 'reachable',
        label: 'Website reachable',
        passed: false,
        fix: `We couldn't load ${url}. Check the URL in Settings, and that the site is live and not blocking automated visitors.`,
      }],
    }
  }

  const lower = html.toLowerCase()
  const cityName = cityState.split(',')[0].trim()
  const city = cityName.toLowerCase()
  const digitsOnly = (s: string) => s.replace(/\D/g, '')
  const phoneDigits = phone ? digitsOnly(phone) : ''

  // JSON-LD structured data
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1])
  const hasAnySchema = ldBlocks.length > 0
  const hasLocalBusinessSchema = ldBlocks.some(b => LOCAL_BUSINESS_TYPES.test(b))

  const https = url.toLowerCase().startsWith('https://')
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const titleText = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').toLowerCase()
  const hasTitle = titleText.trim().length > 0
  const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html)
  const nameInPage = nameMentionedIn(html, businessName)
  const cityInPage = city.length > 1 && lower.includes(city)
  const phoneInPage = phoneDigits.length >= 7 && digitsOnly(html).includes(phoneDigits)
  const titleDescriptive = hasTitle && titleText.includes(city)
  const hasAboutOrServices = /href=["'][^"']*(about|services|menu|treatments|about-us)[^"']*["']/i.test(html)

  const checks: AuditCheck[] = [
    {
      id: 'schema',
      label: 'LocalBusiness schema markup',
      passed: hasLocalBusinessSchema,
      fix: hasAnySchema
        ? 'You have structured data, but not a LocalBusiness type. Add a LocalBusiness schema (or a subtype like Restaurant/Dentist) with your name, address, phone, and URL — it is the strongest machine-readable signal AI uses to confirm what and where you are.'
        : 'Add JSON-LD LocalBusiness schema to your homepage (name, address, phone, hours, geo, url). It is the clearest way to tell AI assistants your exact business details.',
    },
    {
      id: 'name',
      label: 'Business name in page text',
      passed: nameInPage,
      fix: `Your business name "${businessName}" should appear as real text on the homepage (not only inside a logo image) so crawlers and AI models can read it.`,
    },
    {
      id: 'city',
      label: 'City named on the homepage',
      passed: cityInPage,
      fix: `Mention "${cityName}" in your homepage copy — ideally in the first paragraph. AI weights on-page location text heavily for "near me" queries.`,
    },
    {
      id: 'phone',
      label: 'Phone number on the page',
      passed: phone ? phoneInPage : false,
      fix: phone
        ? 'Show your phone number as selectable text (not only inside an image), and make sure it matches your Google listing exactly.'
        : 'Add your phone number in Settings, then display it as text on your site so it matches your other listings.',
    },
    {
      id: 'title',
      label: 'Descriptive page title',
      passed: titleDescriptive,
      fix: 'Your <title> should include your business type and city, e.g. "Franklin Barbecue — BBQ Restaurant in Austin, TX". It is one of the first things every engine reads.',
    },
    {
      id: 'meta',
      label: 'Meta description',
      passed: hasMetaDesc,
      fix: 'Add a meta description (~150 characters) summarizing what you offer and where. It often becomes the snippet AI quotes about you.',
    },
    {
      id: 'about',
      label: 'About / Services page',
      passed: hasAboutOrServices,
      fix: 'Add an About page and a Services or Menu page. These give AI models structured, quotable content about exactly what you offer.',
    },
    {
      id: 'https',
      label: 'Secure (HTTPS)',
      passed: https,
      fix: 'Serve your site over HTTPS. Non-secure sites are down-weighted by search engines and flagged by browsers.',
    },
    {
      id: 'mobile',
      label: 'Mobile-friendly viewport',
      passed: hasViewport,
      fix: 'Add a responsive viewport meta tag so the site renders properly on phones — most local searches happen on mobile.',
    },
  ]

  const passed = checks.filter(c => c.passed).length
  const score = Math.round((passed / checks.length) * 100)
  return { reachable: true, score, checks }
}

// ── "Best of" listicle presence (SerpAPI) ────────────────────────────────────

// Directories / review platforms aren't editorial roundups — exclude them so we
// surface the "10 best X in City" articles AI actually quotes from.
const NON_LISTICLE = /(yelp|tripadvisor|google\.|facebook|instagram|foursquare|yellowpages|mapquest|opentable|doordash|ubereats|grubhub|reddit)\./i

export async function checkListicles(
  businessType: string,
  cityState: string,
  businessName: string,
  serpApiKey: string
): Promise<ContentListing[]> {
  const city = cityState.split(',')[0].trim()
  const query = `best ${businessType.toLowerCase()} in ${city}`
  const params = new URLSearchParams({ api_key: serpApiKey, engine: 'google', q: query, num: '10' })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) return []

  const data = await res.json()
  const organic: Array<{ title?: string; link?: string; snippet?: string }> = data.organic_results ?? []
  const listicles = organic.filter(r => r.link && !NON_LISTICLE.test(r.link)).slice(0, 6)

  // Fetch each article and check whether the business is actually named on the
  // list; fall back to the SERP snippet if the page can't be fetched.
  const checked = await Promise.allSettled(
    listicles.map(async (r) => {
      const html = await fetchHtml(r.link!, 6000)
      const haystack = html ?? `${r.title ?? ''} ${r.snippet ?? ''}`
      return {
        title: r.title ?? r.link!,
        url: r.link!,
        mentioned: nameMentionedIn(haystack, businessName),
        snippet: r.snippet ?? null,
      }
    })
  )

  return checked.map((c, i) =>
    c.status === 'fulfilled'
      ? c.value
      : { title: listicles[i].title ?? listicles[i].link!, url: listicles[i].link!, mentioned: false, snippet: listicles[i].snippet ?? null }
  )
}

// ── Reddit mentions (SerpAPI) ────────────────────────────────────────────────

export async function checkReddit(
  businessType: string,
  cityState: string,
  businessName: string,
  serpApiKey: string
): Promise<ContentListing[]> {
  const city = cityState.split(',')[0].trim()
  const query = `site:reddit.com (${businessName} OR "best ${businessType.toLowerCase()}") ${city}`
  const params = new URLSearchParams({ api_key: serpApiKey, engine: 'google', q: query, num: '10' })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) return []

  const data = await res.json()
  const organic: Array<{ title?: string; link?: string; snippet?: string }> = data.organic_results ?? []

  return organic
    .filter(r => r.link?.includes('reddit.com'))
    .slice(0, 6)
    .map(r => ({
      title: r.title ?? r.link!,
      url: r.link!,
      mentioned: nameMentionedIn(`${r.title ?? ''} ${r.snippet ?? ''}`, businessName),
      snippet: r.snippet ?? null,
    }))
}
