import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getLatestAIVisibility } from '@/lib/scans'
import ScanTrigger from '../components/scan-trigger'

const ENGINE_META: Record<string, { label: string; icon: string; plan: 'solo' | 'pro' }> = {
  perplexity: { label: 'Perplexity', icon: '🔍', plan: 'solo' },
  google_ai: { label: 'Google AI Overviews', icon: '🤖', plan: 'solo' },
  claude: { label: 'Claude', icon: '⚡', plan: 'pro' },
  chatgpt: { label: 'ChatGPT', icon: '💬', plan: 'pro' },
  bing: { label: 'Bing Copilot', icon: '🪟', plan: 'pro' },
}

const GEO_TIPS = [
  {
    title: 'Keep your Google Business Profile updated',
    body: 'AI assistants pull heavily from GBP for local recommendations. Fresh photos, recent posts, and a complete business description dramatically increase your chances of being mentioned.',
  },
  {
    title: 'Fix NAP inconsistencies across directories',
    body: 'Your name, address, and phone number should match exactly on every platform. Inconsistencies confuse AI ranking signals — check your Citations tab for issues to fix first.',
  },
  {
    title: 'Encourage reviews that mention your specialty',
    body: 'When reviewers use specific phrases like "best fade in Austin" or "south Austin barbershop," those terms improve your AI visibility for those queries over time.',
  },
]

export default async function AIVisibilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, results] = await Promise.all([
    getProfile(),
    getLatestAIVisibility(user.id),
  ])

  const bizName = profile?.business_name ?? 'Your Business'
  const city = profile?.city_state?.split(',')[0]?.trim() ?? 'your city'
  const bizType = profile?.business_type?.toLowerCase() ?? 'business'
  const userPlan = profile?.plan ?? 'solo'
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

  const engineOrder = ['perplexity', 'google_ai', 'claude', 'chatgpt', 'bing']

  // Build engine summary rows
  const engines = engineOrder.map(key => {
    const meta = ENGINE_META[key]
    const queries = byEngine.get(key) ?? []
    const mentionCount = queries.filter(q => q.mentioned).length
    const isLocked = meta.plan === 'pro' && userPlan !== 'pro'
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

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">AI Visibility</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            When customers ask AI assistants for {bizType}s in {city}, is {bizName} mentioned?
            {scanWeek && <span className="ml-1">· Week of {scanWeek}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userPlan !== 'pro' && userPlan !== 'freelancer' && (
            <a href="/setup" className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Upgrade to unlock all 5
            </a>
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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Engines tracked</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {unlockedWithData.length} <span className="text-lg text-slate-400 dark:text-slate-500">/ 5</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {5 - unlockedWithData.length} {userPlan !== 'pro' ? 'on Pro plan' : 'not yet scanned'}
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

      {/* Engine cards */}
      <div className="grid gap-4 mb-8">
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
              <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{engine.label} is a Pro feature</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Upgrade to see how you rank when customers ask {engine.label} for local {bizType}s.
                  </p>
                </div>
                <a href="/setup" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Upgrade to Pro →</a>
              </div>
            ) : !engine.hasResults ? (
              <div className="px-6 py-8 flex flex-col items-center text-center gap-2">
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

      {/* GEO tips */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">How to improve your AI visibility (GEO)</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Generative Engine Optimization — things you can do this week</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {GEO_TIPS.map((tip, i) => (
            <div key={i} className="px-6 py-5 flex gap-4">
              <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{tip.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
