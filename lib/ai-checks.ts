export interface AICheckResult {
  mentioned: boolean
  position: number | null
  excerpt: string | null
  competitors: Array<{ name: string; position: number }>
  triggered?: boolean  // false = AI overview didn't appear for this query (google_ai only)
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

// Extract other businesses mentioned in a numbered/bulleted AI list response.
function parseCompetitors(
  text: string,
  ownName: string
): Array<{ name: string; position: number }> {
  const ownLower = ownName.toLowerCase().trim()
  const competitors: Array<{ name: string; position: number }> = []
  for (const line of text.split('\n')) {
    // Match "1. Business Name" or "1) Business Name", strip markdown bold (**)
    const match = line.match(/^\s*(\d+)[.)]\s*\*{0,2}([^*\n\r]+?)\*{0,2}\s*(?:[-–—:]|$)/)
    if (!match) continue
    const position = parseInt(match[1])
    const name = match[2].trim()
    if (!name) continue
    const nameLower = name.toLowerCase()
    if (nameLower.includes(ownLower) || (ownLower.length > 4 && ownLower.includes(nameLower))) continue
    if (competitors.length >= 5) break
    competitors.push({ name, position })
  }
  return competitors
}

function parseMention(text: string, name: string): AICheckResult {
  const lower = text.toLowerCase()
  const nameLower = name.toLowerCase()

  const competitors = parseCompetitors(text, name)

  if (!lower.includes(nameLower)) {
    return { mentioned: false, position: null, excerpt: null, competitors }
  }

  const lines = text.split('\n')
  let position: number | null = null
  let excerpt: string | null = null

  for (const line of lines) {
    if (line.toLowerCase().includes(nameLower)) {
      const match = line.match(/^\s*(\d+)[.)]\s*/)
      position = match ? parseInt(match[1]) : 1
      excerpt = line.trim().slice(0, 200)
      break
    }
  }

  if (!excerpt) {
    const idx = lower.indexOf(nameLower)
    excerpt = text.slice(Math.max(0, idx - 30), idx + name.length + 100).trim()
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

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anthropic HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return parseMention(data.content?.[0]?.text ?? '', businessName)
}

export async function checkChatGPT(
  query: string,
  businessName: string
): Promise<AICheckResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
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

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
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
