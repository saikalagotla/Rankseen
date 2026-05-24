import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getLatestAIVisibility, getLatestAICompetitors } from '@/lib/scans'
import ScanTrigger from '../components/scan-trigger'
import UpgradeButton from '../components/upgrade-button'

const ENGINE_META: Record<string, { label: string; icon: string; minPlan: 'free' | 'starter' | 'pro' }> = {
  perplexity: { label: 'Perplexity', icon: '🔍', minPlan: 'free' },
  google_ai:  { label: 'Google AI Overviews', icon: '🤖', minPlan: 'free' },
  claude:     { label: 'Claude', icon: '⚡', minPlan: 'starter' },
  chatgpt:    { label: 'ChatGPT', icon: '💬', minPlan: 'pro' },
  bing:       { label: 'Bing Copilot', icon: '🪟', minPlan: 'pro' },
}

const PLAN_RANK: Record<string, number> = { free: 0, solo: 0, starter: 1, pro: 2 }
const MIN_PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2 }

type GeoTip = { title: string; body: string }

function buildGeoTips(params: {
  bizName: string
  bizType: string
  city: string
  hasData: boolean
  mentionRate: number | null
  engines: Array<{ key: string; label: string; mentionCount: number; isLocked: boolean; hasResults: boolean }>
  aiCompetitors: Array<{ competitor_name: string; engine: string }>
}): GeoTip[] {
  const { bizName, bizType, city, hasData, mentionRate, engines, aiCompetitors } = params
  const tips: GeoTip[] = []

  // Tip 1: overall visibility status
  if (!hasData || mentionRate === null) {
    tips.push({
      title: `Write a GBP description that names "${bizType}" and "${city}" in the first sentence`,
      body: `AI assistants treat your Google Business Profile description as a primary source. Opening with "${bizName} is a ${bizType} in ${city} that…" gives every engine an unambiguous match when a customer asks for local ${bizType}s.`,
    })
  } else if (mentionRate === 0) {
    tips.push({
      title: `${bizName} isn't appearing yet — your GBP description is the fastest fix`,
      body: `Rewrite your Google Business Profile description to open with "${bizName} is a ${bizType} in ${city}." This is the single field AI engines weight most heavily for local "best [type] near [city]" queries.`,
    })
  } else if (mentionRate < 50) {
    tips.push({
      title: `Lift your ${mentionRate}% mention rate with keyword-rich reviews`,
      body: `Ask recent customers to naturally include what they came for — phrases like "best ${bizType} in ${city}" in reviews train AI ranking signals over time. Even 5–10 reviews with location-specific language can move the needle.`,
    })
  } else {
    tips.push({
      title: `Keep your ${mentionRate}% visibility with consistent GBP activity`,
      body: `Post a short update to Google Business Profile at least once a week and reply to every new review within 24 hours. AI engines weight recency heavily — activity gaps let competitors creep past ${bizName} in recommendations.`,
    })
  }

  // Tip 2: engine-specific gap
  const unlockedMissing = engines.filter(e => !e.isLocked && e.hasResults && e.mentionCount === 0)
  const googleMissing = unlockedMissing.find(e => e.key === 'google_ai')
  const llmMissing = unlockedMissing.filter(e => ['claude', 'chatgpt'].includes(e.key))

  if (googleMissing) {
    tips.push({
      title: `Get ${bizName} into Google AI Overviews`,
      body: `Google AI Overviews pull from GBP attributes and local review content. Set your primary category to the most specific option available (not just "${bizType}" but the exact sub-type), add at least 10 photos, and ensure your service list is complete — these are the fields Google surfaces in AI-generated answers.`,
    })
  } else if (llmMissing.length > 0) {
    const names = llmMissing.map(e => e.label).join(' and ')
    tips.push({
      title: `Help ${names} find ${bizName} — add structured website content`,
      body: `${names} index your website more than your GBP. Add a dedicated "About" page that uses the phrase "${bizType} in ${city}" and a Services page listing each offering by name. These become the text chunks AI models pull when answering local queries.`,
    })
  } else if (!hasData) {
    tips.push({
      title: `Fix NAP inconsistencies before your first scan`,
      body: `Make sure your business name, address, and phone number match exactly on Google, Yelp, Facebook, and every directory — including abbreviations like "St." vs "Street". Inconsistencies dilute the citation signals AI engines use to confirm you're a real, trusted local business.`,
    })
  } else {
    tips.push({
      title: `Add ${city}-specific content to your website`,
      body: `Create a dedicated page or blog post targeting "${bizType} in ${city}" to give AI assistants more local signals to pull from. Even a 200-word "serving ${city}" page on your site can significantly improve your relevance score.`,
    })
  }

  // Tip 3: competitor-informed or fallback
  if (aiCompetitors.length > 0) {
    const freq = new Map<string, number>()
    for (const c of aiCompetitors) freq.set(c.competitor_name, (freq.get(c.competitor_name) ?? 0) + 1)
    const topComp = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0]
    tips.push({
      title: `Study what "${topComp[0]}" is doing that ${bizName} isn't`,
      body: `"${topComp[0]}" is the most-recommended ${bizType} in your area across AI engines. Check their Google review count, recency, and how detailed their GBP photos and posts are — these are the levers separating them from ${bizName} in AI results right now.`,
    })
  } else {
    tips.push({
      title: `Ask customers for reviews that mention your specific services`,
      body: `Generic "great place!" reviews do little for AI visibility. Ask customers to describe what they got — "amazing ${bizType} service for my [specific need] in ${city}" gives AI engines the phrase-level signals they use to match queries to your business.`,
    })
  }

  return tips
}

export default async function AIVisibilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, results, aiCompetitors] = await Promise.all([
    getProfile(),
    getLatestAIVisibility(user.id),
    getLatestAICompetitors(user.id),
  ])

  const bizName = profile?.business_name ?? 'Your Business'
  const city = profile?.city_state?.split(',')[0]?.trim() ?? 'your city'
  const bizType = profile?.business_type?.toLowerCase() ?? 'business'
  const userPlan = profile?.plan ?? 'free'
  const userPlanRank = PLAN_RANK[userPlan] ?? 0
  const hasData = results.length > 0
  const scanWeek = results[0]?.scan_week

  const hasPerplexityKey = !!process.env.PERPLEXITY_API_KEY
  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY
  const hasSerpKey = !!process.env.SERP_API_KEY
  const hasAnyKey = hasPerplexityKey || hasClaudeKey || hasSerpKey

  // Group results by engine
  const byEngine = new Map<string, typeof results>()
  for (const r of results) {
    if (!byEngine.has(r.engine)) byEngine.set(r.engine, [])
    byEngine.get(r.engine)!.push(r)
  }

  const engineOrder = ['chatgpt', 'google_ai', 'bing', 'claude']

  // Build engine summary rows
  const engines = engineOrder.map(key => {
    const meta = ENGINE_META[key]
    const queries = byEngine.get(key) ?? []
    const mentionCount = queries.filter(q => q.mentioned).length
    const isLocked = MIN_PLAN_RANK[meta.minPlan] > userPlanRank
    const hasResults = queries.length > 0

    return { key, ...meta, queries, mentionCount, isLocked, hasResults }
  })

  const unlockedWithData = engines.filter(e => !e.isLocked && e.hasResults)
  const totalMentions = unlockedWithData.reduce((a, e) => a + e.mentionCount, 0)
  const totalQueries = unlockedWithData.reduce((a, e) => a + e.queries.length, 0)
  const mentionRate = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : null
  const bestPosition = unlockedWithData
    .flatMap(e => e.queries)
    .filter(q => q.mentioned && q.position !== null)
    .reduce<number | null>((best, q) => {
      if (q.position === null) return best
      return best === null || q.position < best ? q.position : best
    }, null)

  const geoTips = buildGeoTips({ bizName, bizType, city, hasData, mentionRate, engines, aiCompetitors })

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">AI Visibility</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            When customers ask AI assistants for {bizType}s in {city}, is {bizName} mentioned?
            {scanWeek && <span className="ml-1">· Week of {scanWeek}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userPlan !== 'pro' && (
            <UpgradeButton
              label={userPlanRank === 0 ? 'Upgrade to Starter' : 'Upgrade to Pro'}
              variant="button"
              plan={userPlanRank === 0 ? 'starter' : 'pro'}
            />
          )}
          <ScanTrigger endpoint="/api/scan/ai" label="Scan now" disabled={!hasAnyKey} />
        </div>
      </div>

      {!hasAnyKey && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Add <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">PERPLEXITY_API_KEY</code> or <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> to <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">.env.local</code> to enable AI visibility scans.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Engines tracked</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {unlockedWithData.length} <span className="text-lg text-slate-400 dark:text-slate-500">/ 5</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {5 - unlockedWithData.length} {userPlan === 'pro' ? 'not yet scanned' : 'locked by plan'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Mention rate</p>
          <p className={`text-3xl font-bold mb-1 ${hasData ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {mentionRate !== null ? `${mentionRate}%` : '—'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {hasData ? `${totalMentions} of ${totalQueries} test queries` : 'No scan data yet'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Best position</p>
          <p className={`text-3xl font-bold mb-1 ${bestPosition ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {bestPosition ? `#${bestPosition}` : '—'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {bestPosition ? 'in at least one result' : hasData ? 'Not ranked yet' : 'Run a scan first'}
          </p>
        </div>
      </div>

      {/* Row 2: Engine cards (2/3) + GEO tips (1/3) */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Engine cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {engines.map((engine) => (
            <div
              key={engine.key}
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${engine.isLocked ? 'opacity-75' : ''}`}
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{engine.icon}</span>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{engine.label}</h2>
                    {!engine.isLocked && engine.hasResults && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Mentioned in {engine.mentionCount} of {engine.queries.length} queries
                      </p>
                    )}
                  </div>
                </div>
                {engine.isLocked ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Pro feature
                  </span>
                ) : engine.hasResults ? (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 ${
                    engine.mentionCount > 0
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 ring-emerald-200 dark:ring-emerald-800'
                      : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 ring-slate-200 dark:ring-slate-700'
                  }`}>
                    {engine.mentionCount > 0 ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Visible
                      </>
                    ) : 'Not found'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">No scan yet</span>
                )}
              </div>

              {engine.isLocked ? (
                <div className="px-6 py-6 flex flex-col items-center text-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{engine.label} is a Pro feature</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Upgrade to see how you rank when customers ask {engine.label} for local {bizType}s.
                    </p>
                  </div>
                  <UpgradeButton label="Upgrade to Pro" variant="link" />
                </div>
              ) : !engine.hasResults ? (
                <div className="px-6 py-6 flex flex-col items-center text-center gap-2">
                  <p className="text-sm text-slate-400 dark:text-slate-500">No scan data yet for {engine.label}.</p>
                  {!hasAnyKey && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Configure the API key above to enable this engine.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {engine.queries.map((q) => (
                    <div key={q.query} className="px-6 py-3.5 flex items-start justify-between gap-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">&ldquo;{q.query}&rdquo;</p>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {q.mentioned ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {q.position ? `#${q.position} result` : 'Mentioned'}
                          </span>
                        ) : q.excerpt === '__not_triggered__' ? (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500" title="Google didn't show an AI Overview for this query — it showed the Maps local pack instead.">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Not triggered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Not mentioned
                          </span>
                        )}
                        {q.mentioned && q.excerpt && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs text-right line-clamp-1">{q.excerpt}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* GEO tips sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">How to improve AI visibility</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tailored for {bizName} in {city}</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {geoTips.map((tip, i) => (
              <div key={i} className="px-5 py-5 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{tip.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Competitor Snapshot — leaderboard + per-engine side by side */}
      {(() => {
        if (aiCompetitors.length === 0) return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">AI Competitor Snapshot</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Businesses AI engines recommend instead of or alongside you</p>
            </div>
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">No competitor data yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Run an AI scan to see who&apos;s being recommended.</p>
            </div>
          </div>
        )

        const freq = new Map<string, { count: number; engines: Set<string> }>()
        for (const c of aiCompetitors) {
          const key = c.competitor_name
          if (!freq.has(key)) freq.set(key, { count: 0, engines: new Set() })
          freq.get(key)!.count++
          freq.get(key)!.engines.add(c.engine)
        }
        const leaderboard = Array.from(freq.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 8)

        const ENGINE_LABELS: Record<string, string> = {
          google_ai: 'Google AI', claude: 'Claude', chatgpt: 'ChatGPT', bing: 'Bing',
        }

        const byEngineComp = new Map<string, typeof aiCompetitors>()
        for (const c of aiCompetitors) {
          if (!byEngineComp.has(c.engine)) byEngineComp.set(c.engine, [])
          byEngineComp.get(c.engine)!.push(c)
        }

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">AI Competitor Snapshot</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Businesses AI engines recommend instead of or alongside you</p>
            </div>

            <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
              {/* Leaderboard */}
              <div className="px-6 py-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Most frequently mentioned</p>
                <div className="space-y-2.5">
                  {leaderboard.map(([name, { count, engines }], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ring-1 ${
                        i === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800'
                        : i <= 2 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700'
                      }`}>{i + 1}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 font-medium truncate">{name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {Array.from(engines).map(e => (
                            <span key={e} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              {ENGINE_LABELS[e] ?? e}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{count}×</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-engine breakdown */}
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {Array.from(byEngineComp.entries()).map(([engine, comps]) => {
                  const seen = new Map<string, number>()
                  for (const c of comps) {
                    if (!seen.has(c.competitor_name) || seen.get(c.competitor_name)! > c.position) {
                      seen.set(c.competitor_name, c.position)
                    }
                  }
                  const unique = Array.from(seen.entries())
                    .sort((a, b) => a[1] - b[1])
                    .slice(0, 5)
                  return (
                    <div key={engine} className="px-6 py-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{ENGINE_LABELS[engine] ?? engine}</p>
                      <div className="flex flex-col gap-2">
                        {unique.map(([name, position]) => (
                          <div key={name} className="flex items-center gap-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ring-1 shrink-0 ${
                              position === 1 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800'
                              : position <= 3 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-800'
                            }`}>#{position}</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
