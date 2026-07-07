import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getWeekStart } from '@/lib/serp'
import {
  generateAIQueries,
  toAIQuery,
  checkPerplexity,
  checkClaude,
  checkChatGPT,
  checkBingCopilot,
  checkGoogleAIOverview,
  type AICheckResult,
} from '@/lib/ai-checks'
import { dailyCooldownRemaining, recordRun, cooldownMessage } from '@/lib/rate-limit'

type EngineRunner = (query: string, biz: string) => Promise<AICheckResult>

// Web-grounded AI calls are slow; give the function room beyond the default.
export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile()
  if (!profile?.business_type || !profile?.city_state) {
    return Response.json({ error: 'Business type and city are required' }, { status: 400 })
  }

  const cooldown = await dailyCooldownRemaining(supabase, user.id, 'ai')
  if (cooldown > 0) return Response.json({ error: cooldownMessage(cooldown) }, { status: 429 })

  const serpApiKey = process.env.SERP_API_KEY
  const scanWeek = getWeekStart(new Date())
  const bizName = profile.business_name ?? profile.business_type
  // AI assistants answer natural questions, not Maps search terms — ground each
  // tracked keyword in the business's city before asking.
  const queries = (
    profile.keywords?.length
      ? profile.keywords
      : generateAIQueries(profile.business_type, profile.city_state)
  ).map(q => toAIQuery(q, profile.city_state!))

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

  // Run every (engine, query) pair concurrently — the whole scan then takes as
  // long as the single slowest call, not the sum of all engines run in series.
  const tasks = engines
    .filter(engine => process.env[engine.requiresKey])
    .flatMap(engine =>
      queries.map(query => ({ engine: engine.name, query, run: () => engine.runner(query, bizName) }))
    )

  const settled = await Promise.allSettled(tasks.map(t => t.run()))

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    const r = settled[i]
    const result = r.status === 'fulfilled' ? r.value : null
    rows.push({
      user_id: user.id,
      engine: t.engine,
      query: t.query,
      mentioned: result?.mentioned ?? false,
      position: result?.position ?? null,
      // sentinel: '__not_triggered__' means the AI overview didn't appear (google_ai only)
      excerpt: result?.triggered === false ? '__not_triggered__' : (result?.excerpt ?? null),
      scan_week: scanWeek,
    })

    if (r.status === 'fulfilled') {
      for (const comp of r.value.competitors) {
        competitorRows.push({
          user_id: user.id,
          engine: t.engine,
          query: t.query,
          competitor_name: comp.name,
          position: comp.position,
          scan_week: scanWeek,
        })
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

  await recordRun(supabase, user.id, 'ai')

  const mentioned = rows.filter(r => r.mentioned).length
  return Response.json({ success: true, total: rows.length, mentioned })
}
