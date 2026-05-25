import { createClient } from '@/lib/supabase/server'
import { checkMapsRank, geocodeCity, getWeekStart } from '@/lib/serp'
import {
  generateAIQueries,
  checkPerplexity,
  checkClaude,
  checkChatGPT,
  checkGoogleAIOverview,
  checkBingCopilot,
  type AICheckResult,
} from '@/lib/ai-checks'

type EngineRunner = (query: string, biz: string) => Promise<AICheckResult>

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessName, businessType, cityState, keywords: rawKeywords } = await req.json()
  if (!businessName || !cityState) {
    return Response.json({ error: 'businessName and cityState are required' }, { status: 400 })
  }

  const serpApiKey = process.env.SERP_API_KEY
  const scanWeek   = getWeekStart(new Date())
  const keywords: string[] = rawKeywords?.length
    ? rawKeywords
    : generateAIQueries(businessType ?? 'Business', cityState).slice(0, 5)

  // ── Maps rank check ──────────────────────────────────────────────────────
  const ll = serpApiKey ? await geocodeCity(cityState) : null
  const mapsResults = serpApiKey
    ? await Promise.allSettled(
        keywords.map(kw => checkMapsRank(kw, businessName, cityState, serpApiKey, ll ?? undefined))
      )
    : []

  const rankData = keywords.map((keyword, i) => ({
    keyword,
    rank: mapsResults[i]?.status === 'fulfilled' ? (mapsResults[i] as PromiseFulfilledResult<{ rank: number | null }>).value.rank : null,
    scan_week: scanWeek,
  }))

  // ── AI visibility check ──────────────────────────────────────────────────
  const engines: Array<{ name: string; runner: EngineRunner; key: string }> = [
    { name: 'claude',     runner: (q, b) => checkClaude(q, b),                               key: 'ANTHROPIC_API_KEY' },
    { name: 'chatgpt',    runner: (q, b) => checkChatGPT(q, b),                              key: 'OPENAI_API_KEY' },
    { name: 'perplexity', runner: (q, b) => checkPerplexity(q, b),                           key: 'PERPLEXITY_API_KEY' },
    ...(serpApiKey ? [
      { name: 'google_ai', runner: (q: string, b: string) => checkGoogleAIOverview(q, b, serpApiKey), key: 'SERP_API_KEY' },
      { name: 'bing',      runner: (q: string, b: string) => checkBingCopilot(q, b, serpApiKey),      key: 'SERP_API_KEY' },
    ] : []),
  ]

  const aiData: Array<{ engine: string; query: string; mentioned: boolean; excerpt: string | null; scan_week: string }> = []
  for (const engine of engines) {
    if (!process.env[engine.key]) continue
    const results = await Promise.allSettled(keywords.map(q => engine.runner(q, businessName)))
    for (let i = 0; i < keywords.length; i++) {
      const r = results[i]
      const val = r.status === 'fulfilled' ? r.value : null
      aiData.push({
        engine: engine.name,
        query: keywords[i],
        mentioned: val?.mentioned ?? false,
        excerpt: val?.triggered === false ? '__not_triggered__' : (val?.excerpt ?? null),
        scan_week: scanWeek,
      })
    }
  }

  // ── Save and return token ────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('prospect_snapshots')
    .insert({ business_name: businessName, business_type: businessType ?? null, city_state: cityState, keywords, rank_data: rankData, ai_data: aiData })
    .select('token')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ token: data.token })
}
