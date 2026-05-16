export interface AICheckResult {
  mentioned: boolean
  position: number | null
  excerpt: string | null
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

function parseMention(text: string, name: string): AICheckResult {
  const lower = text.toLowerCase()
  const nameLower = name.toLowerCase()

  if (!lower.includes(nameLower)) {
    return { mentioned: false, position: null, excerpt: null }
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

  return { mentioned: true, position, excerpt }
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

  if (!res.ok) return { mentioned: false, position: null, excerpt: null }

  const data = await res.json()

  // AI Overview can appear in different fields depending on SerpAPI version
  const aiOverview =
    data.ai_overview?.text_blocks?.map((b: { snippet?: string; body?: string }) =>
      b.snippet ?? b.body ?? ''
    ).join('\n') ??
    data.answer_box?.snippet ??
    ''

  if (!aiOverview) return { mentioned: false, position: null, excerpt: null }

  return parseMention(aiOverview, businessName)
}
