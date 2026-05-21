import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getWeekStart } from '@/lib/serp'
import {
  generateAIQueries,
  checkPerplexity,
  checkClaude,
  checkChatGPT,
  checkBingCopilot,
  checkGoogleAIOverview,
  type AICheckResult,
} from '@/lib/ai-checks'

type EngineRunner = (query: string, biz: string) => Promise<AICheckResult>

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile()
  if (!profile?.business_type || !profile?.city_state) {
    return Response.json({ error: 'Business type and city are required' }, { status: 400 })
  }

  const serpApiKey = process.env.SERP_API_KEY
  const scanWeek = getWeekStart(new Date())
  const bizName = profile.business_name ?? profile.business_type
  const queries = profile.keywords?.length
    ? profile.keywords
    : generateAIQueries(profile.business_type, profile.city_state)

  // Engines available (Pro gates ChatGPT, Bing to paid plan)
  const engines: Array<{ name: string; runner: EngineRunner; requiresKey: string }> = [
    {
      name: 'perplexity',
      runner: (q, b) => checkPerplexity(q, b),
      requiresKey: 'PERPLEXITY_API_KEY',
    },
    {
      name: 'claude',
      runner: (q, b) => checkClaude(q, b),
      requiresKey: 'ANTHROPIC_API_KEY',
    },
    {
      name: 'chatgpt',
      runner: (q, b) => checkChatGPT(q, b),
      requiresKey: 'OPENAI_API_KEY',
    },
    ...(serpApiKey ? [
      {
        name: 'google_ai',
        runner: (q: string, b: string) => checkGoogleAIOverview(q, b, serpApiKey),
        requiresKey: 'SERP_API_KEY',
      },
      {
        name: 'bing',
        runner: (q: string, b: string) => checkBingCopilot(q, b, serpApiKey),
        requiresKey: 'SERP_API_KEY',
      },
    ] : []),
  ]

  const rows: Array<{
    user_id: string
    engine: string
    query: string
    mentioned: boolean
    position: number | null
    excerpt: string | null
    scan_week: string
  }> = []

  const competitorRows: Array<{
    user_id: string
    engine: string
    query: string
    competitor_name: string
    position: number
    scan_week: string
  }> = []

  for (const engine of engines) {
    const envKey = process.env[engine.requiresKey]
    if (!envKey) continue

    const queryResults = await Promise.allSettled(
      queries.map(q => engine.runner(q, bizName))
    )

    for (let i = 0; i < queries.length; i++) {
      const r = queryResults[i]
      rows.push({
        user_id: user.id,
        engine: engine.name,
        query: queries[i],
        mentioned: r.status === 'fulfilled' ? r.value.mentioned : false,
        position: r.status === 'fulfilled' ? r.value.position : null,
        excerpt: r.status === 'fulfilled' ? r.value.excerpt : null,
        scan_week: scanWeek,
      })

      if (r.status === 'fulfilled') {
        for (const comp of r.value.competitors) {
          competitorRows.push({
            user_id: user.id,
            engine: engine.name,
            query: queries[i],
            competitor_name: comp.name,
            position: comp.position,
            scan_week: scanWeek,
          })
        }
      }
    }
  }

  if (rows.length === 0) {
    return Response.json(
      { error: 'No AI API keys configured. Set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY.' },
      { status: 503 }
    )
  }

  // Replace this week's results
  await supabase
    .from('ai_visibility_results')
    .delete()
    .eq('user_id', user.id)
    .eq('scan_week', scanWeek)

  const { error } = await supabase.from('ai_visibility_results').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase
    .from('ai_competitor_snapshots')
    .delete()
    .eq('user_id', user.id)
    .eq('scan_week', scanWeek)

  if (competitorRows.length > 0) {
    await supabase.from('ai_competitor_snapshots').insert(competitorRows)
  }

  const mentioned = rows.filter(r => r.mentioned).length
  return Response.json({ success: true, total: rows.length, mentioned })
}
