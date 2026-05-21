import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getRankSnapshots, getLatestAIVisibility, getLatestCitations } from '@/lib/scans'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })

  const [profile, snapshots, aiResults, citations] = await Promise.all([
    getProfile(),
    getRankSnapshots(user.id, 2),
    getLatestAIVisibility(user.id),
    getLatestCitations(user.id),
  ])

  if (!profile?.business_name) {
    return Response.json({ error: 'Profile incomplete' }, { status: 400 })
  }

  const bizName = profile.business_name
  const bizType = profile.business_type ?? 'business'
  const cityState = profile.city_state ?? ''

  const rankedKeywords = snapshots
    .filter(s => s.rank !== null)
    .map(s => `"${s.keyword}" at #${s.rank}`)
    .slice(0, 5)
  const notRanked = snapshots
    .filter(s => s.rank === null)
    .map(s => `"${s.keyword}"`)
    .slice(0, 3)

  const mentionedEngines = [...new Set(aiResults.filter(r => r.mentioned).map(r => r.engine))]
  const notMentionedEngines = [...new Set(aiResults.filter(r => !r.mentioned).map(r => r.engine))]
  const citationIssues = citations.filter(c => c.status !== 'ok').length

  const context = `
Business: ${bizName} (${bizType}) in ${cityState}

Google Maps Rankings:
${rankedKeywords.length > 0 ? `- Currently ranked: ${rankedKeywords.join(', ')}` : '- No keywords currently ranked in top 20'}
${notRanked.length > 0 ? `- Not ranking yet: ${notRanked.join(', ')}` : ''}

AI Visibility (mentioned when people ask AI assistants for recommendations):
${mentionedEngines.length > 0 ? `- Mentioned by: ${mentionedEngines.join(', ')}` : '- Not mentioned by any AI engines scanned'}
${notMentionedEngines.length > 0 ? `- Not mentioned by: ${notMentionedEngines.join(', ')}` : ''}
${aiResults.length === 0 ? '- No AI scan run yet' : ''}

Citation Health:
- ${citationIssues > 0 ? `${citationIssues} citation issues found (inconsistent NAP data)` : citations.length > 0 ? 'All citations consistent' : 'No citation scan run yet'}
`.trim()

  const prompt = `You are a local SEO expert helping small businesses rank higher on Google Maps and get recommended by AI assistants.

Here is the current SEO data for this business:

${context}

Based on this data, give exactly 3 specific, prioritized action items the owner can do THIS WEEK to improve their Google Maps ranking and AI visibility.

Rules:
- Be very specific and actionable — name real platforms, exact things to type or do
- Address the weakest areas shown in the data first
- Each action must be achievable in under 2 hours
- Assume the owner is non-technical
- Keep each description under 55 words

Respond with JSON only, no markdown fences:
{"actions":[{"priority":1,"title":"short title","description":"specific action","impact":"high"},{"priority":2,"title":"short title","description":"specific action","impact":"medium"},{"priority":3,"title":"short title","description":"specific action","impact":"medium"}]}`

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
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return Response.json({ error: `Anthropic HTTP ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
  }

  const data = await res.json()
  const content = data.content?.[0]?.text ?? ''

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Failed to parse action plan response' }, { status: 500 })
  }
}
