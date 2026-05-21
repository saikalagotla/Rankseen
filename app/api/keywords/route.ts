import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { businessName, businessType, cityState } = await req.json()

  if (!businessName || !businessType || !cityState) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return Response.json({ error: 'Not configured' }, { status: 500 })

  const city = cityState.split(',')[0].trim()

  const prompt = `Generate 8 local SEO search keywords for a ${businessType} business called "${businessName}" in ${cityState}.

Rules:
- These are what a real customer would type into Google Maps or Google Search
- Mix of: "[type] near me", "[type] in ${city}", branded ("[business name] ${city}"), and specific service keywords
- Tailor them to the specific business — infer what they likely sell or offer from the name (e.g. "Franklin Barbecue" → brisket, BBQ, smoked meat)
- Return ONLY a valid JSON array of strings, no explanation, no markdown
- Each keyword must be 2–6 words

Example output: ["best BBQ near me", "Franklin Barbecue Austin", "brisket Austin TX", "smoked BBQ near me", "BBQ restaurant Austin", "best brisket in Austin", "BBQ pit near me", "Austin BBQ lunch"]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    return Response.json({ error: `Upstream error: ${res.status}` }, { status: 500 })
  }

  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? ''

  // Try direct parse first, then extract from potential markdown fences
  const candidates = [text, ...(text.match(/\[[\s\S]*?\]/g) ?? [])]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim())
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Response.json({ keywords: parsed.slice(0, 10) })
      }
    } catch {}
  }

  return Response.json({ error: 'Failed to parse keywords from model response' }, { status: 500 })
}
