import { fetchWithTimeout } from './http'

export interface AICheckResult {
  mentioned: boolean
  position: number | null
  excerpt: string | null
  competitors: Array<{ name: string; position: number }>
  triggered?: boolean  // false = AI overview didn't appear for this query (google_ai only)
}

// Turn a Google Maps keyword into a question worth asking an AI assistant.
// "near me" has no meaning to an API call with no location, and Maps terms like
// "smoked meat Austin TX" aren't how people phrase questions — so we ground
// every query in the business's city.
export function toAIQuery(keyword: string, cityState: string): string {
  const city = cityState.split(',')[0].trim()
  let q = keyword.trim()

  if (/\bnear me\b/i.test(q)) {
    q = q.replace(/\s*\bnear me\b\s*/i, city ? ` in ${city} ` : ' ')
  } else if (city && !q.toLowerCase().includes(city.toLowerCase())) {
    q = `${q} in ${city}`
  }

  return q.replace(/\s+/g, ' ').trim()
}

export function generateAIQueries(businessType: string, cityState: string): string[] {
  const type = businessType.toLowerCase()
  const city = cityState.split(',')[0].trim()
  return [
    `best ${type} in ${city}`,
    `top rated ${type} near ${city}`,
    `recommend a good ${type} in ${city}`,
    `${type} open now ${city}`,
  ]
}

// Generic words that get dropped when deriving a business's distinctive "core"
// name — so "Franklin Barbecue" also matches a bare "Franklin".
const NAME_DESCRIPTORS = new Set([
  'barbecue', 'bbq', 'restaurant', 'grill', 'grille', 'cafe', 'coffee', 'bar',
  'kitchen', 'co', 'company', 'llc', 'inc', 'shop', 'store', 'salon', 'spa',
  'studio', 'gym', 'fitness', 'clinic', 'dental', 'dentistry', 'law', 'group',
  'services', 'the', 'and',
])

// Normalize a string so name variants compare equal: lowercase, expand common
// abbreviations (BBQ→barbecue, &→and), drop possessives, and reduce punctuation
// to single spaces. "Franklin's BBQ!" and "Franklin Barbecue" both become
// "franklin barbecue".
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/'s\b/g, '')          // possessive: "Franklin's" → "Franklin"
    .replace(/\bbbq\b/g, 'barbecue')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')   // punctuation → spaces
    .replace(/\s+/g, ' ')
    .trim()
}

// The accepted forms of a business name: the full normalized name, plus a
// distinctive core with trailing generic descriptors stripped (only if that
// core is long enough to be unambiguous on its own).
function nameVariants(name: string): string[] {
  const norm = normalizeForMatch(name)
  const variants = new Set<string>()
  if (norm) variants.add(norm)

  const tokens = norm.split(' ')
  while (tokens.length > 1 && NAME_DESCRIPTORS.has(tokens[tokens.length - 1])) tokens.pop()
  const core = tokens.join(' ')
  if (core && core !== norm && core.length >= 5) variants.add(core)

  return [...variants]
}

// Whole-word/phrase match of any variant against already-normalized text —
// avoids substring false positives ("Franklin" inside "Franklindale").
function matchesName(normText: string, variants: string[]): boolean {
  return variants.some(v => {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^| )${escaped}( |$)`).test(normText)
  })
}

// Reusable across scans: does `text` mention this business by name (variant-aware)?
export function nameMentionedIn(text: string, name: string): boolean {
  return matchesName(normalizeForMatch(text), nameVariants(name))
}

// Extract other businesses mentioned in a numbered or bulleted AI list response.
function parseCompetitors(
  text: string,
  ownName: string
): Array<{ name: string; position: number }> {
  const variants = nameVariants(ownName)
  const competitors: Array<{ name: string; position: number }> = []
  let bulletPosition = 0

  for (const line of text.split('\n')) {
    let position: number
    let name: string

    // "1. Business Name" or "1) Business Name" (bold optional)
    const numbered = line.match(/^\s*(\d+)[.)]\s*\*{0,2}([^*\n\r]+?)\*{0,2}\s*(?:[-–—:]|$)/)
    if (numbered) {
      position = parseInt(numbered[1])
      name = numbered[2].trim()
    } else {
      // "- **Business Name**" or "* **Business Name**" — require bold so we don't
      // pick up prose bullet points. Perplexity and Google AI use this format.
      const bulleted = line.match(/^\s*[-*]\s*\*\*([^*\n\r]+?)\*\*/)
      if (!bulleted) continue
      bulletPosition++
      position = bulletPosition
      name = bulleted[1].trim()
    }

    if (!name) continue
    // Skip lines that are actually the user's own business under a variant name.
    if (matchesName(normalizeForMatch(name), variants)) continue
    if (competitors.length >= 5) break
    competitors.push({ name, position })
  }
  return competitors
}

function parseMention(text: string, name: string): AICheckResult {
  const competitors = parseCompetitors(text, name)
  const variants = nameVariants(name)
  const normText = normalizeForMatch(text)

  if (!matchesName(normText, variants)) {
    return { mentioned: false, position: null, excerpt: null, competitors }
  }

  const lines = text.split('\n')
  let position: number | null = null
  let excerpt: string | null = null

  for (const line of lines) {
    if (matchesName(normalizeForMatch(line), variants)) {
      const match = line.match(/^\s*(\d+)[.)]\s*/)
      position = match ? parseInt(match[1]) : 1
      excerpt = line.trim().slice(0, 200)
      break
    }
  }

  if (!excerpt) {
    // Name matched across the text but not within a single line — show a snippet.
    excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 200)
    position = 1
  }

  return { mentioned: true, position, excerpt, competitors }
}

export async function checkPerplexity(
  query: string,
  businessName: string
): Promise<AICheckResult> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) throw new Error('PERPLEXITY_API_KEY not configured')

  const res = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: query }],
      max_tokens: 1024,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Perplexity HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return parseMention(data.choices?.[0]?.message?.content ?? '', businessName)
}

export async function checkClaude(
  query: string,
  businessName: string
): Promise<AICheckResult> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: query }],
      // Ground the answer in live web results — mirrors what a real Claude user
      // sees for a local query, instead of testing frozen training knowledge.
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anthropic HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  // With web search the response interleaves server_tool_use / web_search_tool_result
  // blocks with the answer — concatenate every text block to search for a mention.
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text?: string }) => b.text ?? '')
    .join('\n')
  return parseMention(text, businessName)
}

export async function checkChatGPT(
  query: string,
  businessName: string
): Promise<AICheckResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Search-grounded model: browses the live web like ChatGPT does for local
      // queries, rather than answering from frozen training knowledge.
      model: 'gpt-4o-mini-search-preview',
      web_search_options: {},
      messages: [{ role: 'user', content: query }],
      max_tokens: 1024,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return parseMention(data.choices?.[0]?.message?.content ?? '', businessName)
}

export async function checkBingCopilot(
  query: string,
  businessName: string,
  serpApiKey: string
): Promise<AICheckResult> {
  const params = new URLSearchParams({
    api_key: serpApiKey,
    engine: 'bing_copilot',
    q: query,
  })

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })

  if (!res.ok) return { mentioned: false, position: null, excerpt: null, competitors: [] }

  const data = await res.json()

  // Concatenate header + all text block snippets into one string to search against
  const blocks: string[] = []
  if (data.header) blocks.push(data.header)
  for (const block of data.text_blocks ?? []) {
    if (block.snippet) blocks.push(block.snippet)
    if (Array.isArray(block.list)) blocks.push(block.list.join('\n'))
  }

  const combined = blocks.join('\n')
  if (!combined) return { mentioned: false, position: null, excerpt: null, competitors: [] }

  return parseMention(combined, businessName)
}

export async function checkGoogleAIOverview(
  query: string,
  businessName: string,
  serpApiKey: string
): Promise<AICheckResult> {
  const params = new URLSearchParams({
    api_key: serpApiKey,
    engine: 'google',
    q: query,
    num: '10',
  })

  const res = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    cache: 'no-store',
  })

  if (!res.ok) return { mentioned: false, position: null, excerpt: null, competitors: [] }

  const data = await res.json()

  // AI Overview can appear in different fields depending on SerpAPI version
  const aiOverview =
    data.ai_overview?.text_blocks?.map((b: { snippet?: string; body?: string }) =>
      b.snippet ?? b.body ?? ''
    ).join('\n') ??
    data.answer_box?.snippet ??
    ''

  if (!aiOverview) return { mentioned: false, triggered: false, position: null, excerpt: null, competitors: [] }

  return { ...parseMention(aiOverview, businessName), triggered: true }
}
