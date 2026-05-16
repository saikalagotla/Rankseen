import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getRankSnapshots, getLatestAIVisibility, getLatestCitations, getReviews } from '@/lib/scans'
import ScoreCard from '../components/score-card'
import ScanTrigger from './components/scan-trigger'

function ChangeChip({ dir, change }: { dir: string; change: number }) {
  if (dir === 'flat') {
    return <span className="text-slate-400 text-sm font-medium">&mdash;</span>
  }
  const isUp = dir === 'up'
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? '↑' : '↓'}{change}
    </span>
  )
}

type DigestItem = {
  color: 'green' | 'amber' | 'gray'
  text: React.ReactNode
  link?: { label: string; href: string }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, snapshots, aiResults, citations, reviews] = await Promise.all([
    getProfile(),
    getRankSnapshots(user.id, 2),
    getLatestAIVisibility(user.id),
    getLatestCitations(user.id),
    getReviews(user.id, 3),
  ])

  if (!profile?.business_name) redirect('/onboarding')

  const bizName = profile.business_name
  const bizType = profile.business_type ?? 'Business'
  const cityState = profile.city_state ?? ''
  const userPlan = profile.plan ?? 'solo'

  // --- Maps rank summary ---
  const byKeyword = new Map<string, { rank: number | null; scan_week: string }[]>()
  for (const snap of snapshots) {
    if (!byKeyword.has(snap.keyword)) byKeyword.set(snap.keyword, [])
    byKeyword.get(snap.keyword)!.push({ rank: snap.rank, scan_week: snap.scan_week })
  }

  const keywordSummaries = Array.from(byKeyword.entries()).map(([kw, history]) => {
    const currentRank = history[0]?.rank ?? null
    const lastWeekRank = history[1]?.rank ?? null
    const change = currentRank !== null && lastWeekRank !== null ? lastWeekRank - currentRank : 0
    const dir: 'up' | 'down' | 'flat' = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    return { keyword: kw, rank: currentRank, lastWeek: lastWeekRank, change: Math.abs(change), dir }
  })

  const rankedKws = keywordSummaries.filter(k => k.rank !== null)
  const bestRank = rankedKws.length
    ? Math.min(...rankedKws.map(k => k.rank!))
    : null
  const avgRank = rankedKws.length
    ? Math.round(rankedKws.reduce((a, k) => a + k.rank!, 0) / rankedKws.length)
    : null
  const mapsImprovedCount = keywordSummaries.filter(k => k.dir === 'up').length
  const lastWeek = snapshots[0]?.scan_week

  // --- AI visibility summary ---
  const aiEngines = ['perplexity', 'google_ai', 'claude', 'chatgpt', 'bing']
  const visibleEngines = new Set(
    aiResults.filter(r => r.mentioned).map(r => r.engine)
  )
  const totalEngines = 5
  const unlockedEngines = userPlan === 'pro' ? 5 : 2
  const visibleCount = visibleEngines.size

  // --- Citation summary ---
  const citationIssues = citations.filter(c => c.status !== 'ok').length
  const citationOk = citations.filter(c => c.status === 'ok').length
  const citationHealth = citations.length
    ? Math.round((citationOk / citations.length) * 100)
    : null

  // --- Reviews summary ---
  const totalReviews = reviews.length
  const avgRating = totalReviews
    ? (reviews.reduce((a, r) => a + (r.rating ?? 0), 0) / totalReviews).toFixed(1)
    : null
  const unreplied = reviews.filter(r => !r.replied).length

  // --- Generate weekly digest items ---
  const digestItems: DigestItem[] = []

  // Rank movement
  const bigImprover = keywordSummaries.find(k => k.dir === 'up' && k.change >= 2)
  if (bigImprover && snapshots.length > 0) {
    digestItems.push({
      color: 'green',
      text: (
        <>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            You moved from #{(bigImprover.rank ?? 0) + bigImprover.change} to #{bigImprover.rank}
          </span>{' '}
          for &ldquo;{bigImprover.keyword}&rdquo; this week — keep it up. Review velocity and citation consistency both contribute to this.
        </>
      ),
    })
  } else if (mapsImprovedCount > 0 && snapshots.length > 0) {
    digestItems.push({
      color: 'green',
      text: (
        <>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {mapsImprovedCount} keyword{mapsImprovedCount > 1 ? 's' : ''} improved
          </span>{' '}
          in Google Maps ranking this week.
        </>
      ),
      link: { label: 'See rankings', href: '/dashboard/maps' },
    })
  } else if (snapshots.length === 0) {
    digestItems.push({
      color: 'gray',
      text: 'No rank data yet — run your first Google Maps scan to start tracking your positions.',
      link: { label: 'Scan now', href: '/dashboard/maps' },
    })
  }

  // Citation issue
  const citationWarn = citations.find(c => c.status === 'warn')
  if (citationWarn) {
    digestItems.push({
      color: 'amber',
      text: (
        <>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">Listing issue on {citationWarn.platform}.</span>{' '}
          {citationWarn.issue ?? 'Your name or address may not match your canonical. Log in to verify.'}
        </>
      ),
      link: { label: `Fix on ${citationWarn.platform}`, href: '/dashboard/citations' },
    })
  } else if (citations.length === 0) {
    digestItems.push({
      color: 'gray',
      text: 'Citation scan not run yet — check your NAP consistency across directories.',
      link: { label: 'Run citation scan', href: '/dashboard/citations' },
    })
  }

  // AI visibility or upgrade hook
  if (aiResults.length > 0) {
    const unmentionedEngine = ['chatgpt', 'bing'].find(e =>
      aiResults.some(r => r.engine === e) && !visibleEngines.has(e)
    )
    if (unmentionedEngine && userPlan === 'pro') {
      digestItems.push({
        color: 'amber',
        text: (
          <>
            <span className="font-medium">Your business was not mentioned</span> when customers asked{' '}
            {unmentionedEngine === 'chatgpt' ? 'ChatGPT' : 'Bing Copilot'} for local {bizType.toLowerCase()}s.{' '}
            Check your AI Visibility tab for actionable tips.
          </>
        ),
        link: { label: 'View AI report', href: '/dashboard/ai' },
      })
    } else if (userPlan !== 'pro') {
      digestItems.push({
        color: 'gray',
        text: (
          <>
            <span className="font-medium">🔒 AI Visibility:</span>{' '}
            Upgrade to Pro to track whether ChatGPT, Claude, and Bing recommend you when customers search for local {bizType.toLowerCase()}s.
          </>
        ),
        link: { label: 'Upgrade to Pro', href: '/setup' },
      })
    }
  } else {
    digestItems.push({
      color: 'gray',
      text: (
        <>
          <span className="font-medium">🔒 AI Visibility:</span>{' '}
          {userPlan === 'pro'
            ? 'Run an AI scan to see if ChatGPT, Perplexity, and Claude recommend your business.'
            : 'Upgrade to Pro to see if AI assistants recommend you when customers search.'}
        </>
      ),
      link: userPlan === 'pro'
        ? { label: 'Run AI scan', href: '/dashboard/ai' }
        : { label: 'Upgrade to Pro', href: '/setup' },
    })
  }

  // Keep exactly 3 digest items
  const digest = digestItems.slice(0, 3)

  const today = new Date()
  const weekLabel = `Week of ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{bizName}</h1>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">{bizType}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{cityState} &middot; {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <ScanTrigger endpoint="/api/scan/maps" label="Scan Maps" disabled={!process.env.SERP_API_KEY} variant="button" />
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ScoreCard
          title="Maps Rank"
          value={bestRank ? `#${bestRank}` : snapshots.length ? '—' : 'No data'}
          subtitle={
            bestRank
              ? avgRank !== bestRank ? `Avg #${avgRank} across keywords` : `${rankedKws.length} keyword${rankedKws.length !== 1 ? 's' : ''} ranked`
              : 'Run a scan to check'
          }
          badge={mapsImprovedCount > 0 ? `${mapsImprovedCount} improved` : snapshots.length ? 'No change' : 'Not scanned'}
          badgeColor={mapsImprovedCount > 0 ? 'green' : 'blue'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <ScoreCard
          title="AI Visibility"
          value={aiResults.length > 0 ? `${visibleCount}/${unlockedEngines} engines` : 'No data'}
          subtitle={userPlan !== 'pro' ? `${totalEngines - unlockedEngines} more on Pro` : `${totalEngines} engines tracked`}
          badge={userPlan !== 'pro' ? 'Upgrade to unlock all' : visibleCount > 0 ? 'Visible' : 'Not found'}
          badgeColor={userPlan !== 'pro' ? 'orange' : visibleCount > 0 ? 'green' : 'blue'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <ScoreCard
          title="Citation Health"
          value={citationHealth !== null ? `${citationHealth}%` : 'No data'}
          subtitle={
            citations.length > 0
              ? citationIssues > 0 ? `${citationIssues} issue${citationIssues > 1 ? 's' : ''} found` : 'All consistent'
              : 'Run a citation scan'
          }
          badge={
            citations.length === 0 ? 'Not scanned'
            : citationIssues > 0 ? `${citationIssues} fix${citationIssues > 1 ? 'es' : ''} needed`
            : 'All good'
          }
          badgeColor={citations.length === 0 ? 'blue' : citationIssues > 0 ? 'yellow' : 'green'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <ScoreCard
          title="Review Score"
          value={avgRating ? `${avgRating} ★` : totalReviews === 0 ? 'No reviews' : '—'}
          subtitle={
            totalReviews > 0
              ? unreplied > 0 ? `${unreplied} need${unreplied > 1 ? '' : 's'} a reply` : 'All replied'
              : 'Add reviews to track'
          }
          badge={totalReviews > 0 ? `${totalReviews} reviews` : 'No data'}
          badgeColor={totalReviews > 0 && unreplied === 0 ? 'green' : 'blue'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
      </div>

      {/* Weekly Digest */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-7 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-amber-100 dark:border-amber-900/30">
          <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">Weekly Briefing</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{weekLabel}</p>
          </div>
          <span className="ml-auto bg-white dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full">
            {digest.length} action item{digest.length !== 1 ? 's' : ''}
          </span>
        </div>

        <h2 className="font-semibold text-slate-900 dark:text-white text-base mb-5">Your weekly briefing</h2>

        <ol className="flex flex-col gap-5">
          {digest.map((item, i) => {
            const badgeCls =
              item.color === 'green'
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                : item.color === 'amber'
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            return (
              <li key={i} className="flex gap-4">
                <span className={`w-7 h-7 rounded-full font-bold text-sm flex items-center justify-center shrink-0 ${badgeCls}`}>{i + 1}</span>
                <div>
                  <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{item.text}</p>
                  {item.link && (
                    <a href={item.link.href} className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 hover:underline">
                      {item.link.label} &rarr;
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Two-col layout */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Maps Rankings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Google Maps Rankings</h2>
            <a href="/dashboard/maps" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View all →</a>
          </div>
          {keywordSummaries.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">No rank data yet.</p>
              <a href="/dashboard/maps" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Run a scan →</a>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Keyword</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody>
                {keywordSummaries.slice(0, 5).map((row, i) => (
                  <tr key={row.keyword} className={`${i < Math.min(keywordSummaries.length, 5) - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                    <td className="px-6 py-3.5 text-sm text-slate-700 dark:text-slate-300">{row.keyword}</td>
                    <td className="px-4 py-3.5 text-center">
                      {row.rank !== null ? (
                        <span className={`text-sm font-bold ${row.rank <= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>#{row.rank}</span>
                      ) : (
                        <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.lastWeek !== null ? (
                        <ChangeChip dir={row.dir} change={row.change} />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Citation Health */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Citation Health</h2>
            {citationIssues > 0 && (
              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-amber-200 dark:ring-amber-800">
                {citationIssues} issue{citationIssues > 1 ? 's' : ''}
              </span>
            )}
            {citations.length === 0 && (
              <a href="/dashboard/citations" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Scan →</a>
            )}
          </div>
          {citations.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">No citation data yet.</p>
              <a href="/dashboard/citations" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Run a citation scan →</a>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {citations.slice(0, 5).map((c) => (
                <div key={c.platform} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.status === 'ok' ? (
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : c.status === 'warn' ? (
                      <svg className="w-5 h-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.platform}</span>
                  </div>
                  <span className={`text-xs ${c.status === 'ok' ? 'text-slate-400 dark:text-slate-500' : c.status === 'warn' ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400'}`}>
                    {c.status === 'ok' ? 'consistent' : c.status === 'warn' ? 'issue found' : 'not listed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Visibility preview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">AI Visibility</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">When customers ask AI assistants for {bizType.toLowerCase()}s in {cityState.split(',')[0] || 'your city'}, are you recommended?</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/dashboard/ai" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View full report →</a>
            {userPlan !== 'pro' && (
              <a href="/setup" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Upgrade to unlock all
              </a>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {(['perplexity', 'google_ai', 'claude', 'chatgpt', 'bing'] as const).map((engine) => {
            const label = { perplexity: 'Perplexity', google_ai: 'Google AI', claude: 'Claude', chatgpt: 'ChatGPT', bing: 'Bing Copilot' }[engine]
            const isLocked = ['claude', 'chatgpt', 'bing'].includes(engine) && userPlan !== 'pro'
            const engineResults = aiResults.filter(r => r.engine === engine)
            const mentioned = engineResults.some(r => r.mentioned)
            const hasEngineData = engineResults.length > 0

            return (
              <div key={engine} className={`p-5 flex flex-col gap-2 ${isLocked ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                {isLocked ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 blur-[2px]" />
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Pro feature</span>
                    </div>
                  </div>
                ) : !hasEngineData ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500">No scan yet</span>
                ) : mentioned ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Mentioned</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Not found</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Reviews</h2>
            <a href="/dashboard/reviews" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reviews.map((review) => (
              <div key={review.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {(review.author ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{review.author ?? 'Anonymous'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{review.source} &middot; {review.published_at ? new Date(review.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                      </div>
                      {review.rating && (
                        <div className="ml-2 flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      )}
                    </div>
                    {review.body && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">&ldquo;{review.body}&rdquo;</p>
                    )}
                  </div>
                  {!review.replied && (
                    <a
                      href="/dashboard/reviews"
                      className="shrink-0 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Draft Reply
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
