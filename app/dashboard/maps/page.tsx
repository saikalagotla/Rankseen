import { getCurrentUser } from '@/lib/auth'
import { getProfile } from '@/lib/profile'
import { getRankSnapshots, getLatestCompetitors } from '@/lib/scans'
import { DEMO_BIZ, DEMO_SNAPSHOTS, DEMO_COMPETITORS } from '@/lib/demo-data'
import ScanTrigger from '../components/scan-trigger'
import DemoBanner from '../components/demo-banner'

function ChangeChip({ dir, change }: { dir: string; change: number }) {
  if (dir === 'flat') return <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
  const up = dir === 'up'
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
      {up ? '↑' : '↓'}{change}
    </span>
  )
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold ring-1 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-700">
        —
      </span>
    )
  }
  const color =
    rank === 1 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800' :
    rank <= 3 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800' :
    rank <= 7 ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-800' :
    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700'
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold ring-1 ${color}`}>
      #{rank}
    </span>
  )
}

function MiniSparkline({ trend }: { trend: (number | null)[] }) {
  const values = trend.map(v => v ?? 20)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 56
  const h = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const improving = values[values.length - 1] < values[0]
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={improving ? '#10b981' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function MapsPage() {
  const user = await getCurrentUser()
  const isDemo = !user

  let snapshots: typeof DEMO_SNAPSHOTS
  let competitors: typeof DEMO_COMPETITORS
  let businessName: string
  let cityState: string
  let allKeywords: string[]

  if (isDemo) {
    snapshots = DEMO_SNAPSHOTS
    competitors = DEMO_COMPETITORS
    businessName = DEMO_BIZ.business_name
    cityState = DEMO_BIZ.city_state
    allKeywords = DEMO_BIZ.keywords
  } else {
    const [profile, snapshotData, competitorData] = await Promise.all([
      getProfile(),
      getRankSnapshots(user!.id),
      getLatestCompetitors(user!.id),
    ])
    snapshots = snapshotData as typeof DEMO_SNAPSHOTS
    competitors = competitorData as typeof DEMO_COMPETITORS
    businessName = profile?.business_name ?? 'Your Business'
    cityState = profile?.city_state ?? ''
    allKeywords = [...new Set([
      ...Array.from(new Map(snapshotData.map(s => [s.keyword, true])).keys()),
      ...(profile?.keywords ?? []),
    ])]
  }

  const hasApiKey = !!process.env.SERP_API_KEY
  const hasData = snapshots.length > 0

  const byKeyword = new Map<string, { rank: number | null; scan_week: string }[]>()
  for (const snap of snapshots) {
    if (!byKeyword.has(snap.keyword)) byKeyword.set(snap.keyword, [])
    byKeyword.get(snap.keyword)!.push({ rank: snap.rank, scan_week: snap.scan_week })
  }

  if (isDemo) {
    for (const kw of allKeywords) {
      if (!byKeyword.has(kw)) byKeyword.set(kw, [])
    }
  }

  const keywords = Array.from(byKeyword.entries()).map(([keyword, history]) => {
    const currentRank = history[0]?.rank ?? null
    const lastWeekRank = history[1]?.rank ?? null
    const rawChange = currentRank !== null && lastWeekRank !== null ? lastWeekRank - currentRank : 0
    const dir: 'up' | 'down' | 'flat' = rawChange > 0 ? 'up' : rawChange < 0 ? 'down' : 'flat'
    const trend = history.slice(0, 7).map(h => h.rank).reverse()
    const latestWeek = history[0]?.scan_week ?? null
    return { keyword, rank: currentRank, lastWeek: lastWeekRank, change: Math.abs(rawChange), dir, trend, latestWeek }
  })

  const improving = keywords.filter(k => k.dir === 'up').length
  const top3 = keywords.filter(k => k.rank !== null && k.rank <= 3).length
  const rankedKws = keywords.filter(k => k.rank !== null)
  const avgRank = rankedKws.length
    ? Math.round(rankedKws.reduce((a, k) => a + k.rank!, 0) / rankedKws.length)
    : null

  const lastUpdated = snapshots[0]?.scan_week

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Google Maps Rankings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {businessName}{cityState ? ` · ${cityState}` : ''}
            {lastUpdated && ` · Week of ${lastUpdated}`}
          </p>
        </div>
        {!isDemo && (
          <ScanTrigger endpoint="/api/scan/maps" label="Scan now" disabled={!hasApiKey} />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Keywords tracked', value: String(allKeywords.length), sub: `${allKeywords.length} of 10 slots used`, color: 'text-slate-900 dark:text-white', delay: '' },
          { label: 'In top 3', value: hasData ? String(top3) : '—', sub: hasData ? `${Math.round(top3 / Math.max(rankedKws.length, 1) * 100)}% of tracked` : 'No data yet', color: 'text-emerald-600 dark:text-emerald-400', delay: 'delay-75' },
          { label: 'Avg rank this week', value: hasData && avgRank ? `#${avgRank}` : '—', sub: hasData ? `${improving} keyword${improving !== 1 ? 's' : ''} improved` : 'Run a scan to see data', color: 'text-blue-600 dark:text-blue-400', delay: 'delay-150' },
        ].map(s => (
          <div key={s.label} className={`animate-fade-in-up ${s.delay} bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{s.label}</p>
            <p className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Rankings table */}
      <div className="animate-fade-in-up delay-200 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Keyword Rankings</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {hasData ? 'Weekly history · rank = position in Google Maps local results' : 'Click "Scan now" to check your Google Maps rankings'}
            </p>
          </div>
          {!isDemo && (
            <a href="/dashboard/settings" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Edit keywords
            </a>
          )}
        </div>

        {allKeywords.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No keywords configured yet.</p>
            {!isDemo && (
              <a href="/dashboard/settings" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Add keywords in Settings →
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Keyword</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">This Week</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:table-cell">Trend</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">vs Last Wk</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((row, i) => (
                  <tr key={row.keyword} className={`${i < keywords.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/70' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors`}>
                    <td className="px-6 py-3.5 text-sm text-slate-700 dark:text-slate-300 font-medium">{row.keyword}</td>
                    <td className="px-4 py-3.5 text-center"><div className="flex justify-center"><RankBadge rank={row.rank} /></div></td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex justify-center">
                        {row.trend.length > 1 ? <MiniSparkline trend={row.trend} /> : <span className="text-xs text-slate-300 dark:text-slate-600">no history</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.lastWeek !== null ? <ChangeChip dir={row.dir} change={row.change} /> : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500 mb-8">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 inline-block" />#1 position</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-50 dark:bg-emerald-950/50 inline-block" />#2–3 (top 3-pack)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 dark:bg-blue-950/50 inline-block" />#4–7 (page 1)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 inline-block" />#8+ or not ranked</span>
        <span className="flex items-center gap-1.5 ml-auto text-slate-400">Trend: <span className="text-emerald-500 ml-1">green</span> = improving · <span className="text-amber-500 ml-1">amber</span> = declining</span>
      </div>

      {/* Competitor Snapshot */}
      <div className="animate-fade-in-up delay-300 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Competitor Snapshot</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Businesses ranking above you for your tracked keywords</p>
        </div>

        {competitors.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">No competitor data yet.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Run a Google Maps scan to see who&apos;s ranking above you.</p>
          </div>
        ) : (() => {
          const byKw = new Map<string, Array<{ name: string; position: number }>>()
          for (const c of competitors) {
            if (!byKw.has(c.keyword)) byKw.set(c.keyword, [])
            byKw.get(c.keyword)!.push({ name: c.competitor_name, position: c.position })
          }
          return (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/70">
              {Array.from(byKw.entries()).map(([keyword, comps]) => (
                <div key={keyword} className="px-6 py-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{keyword}</p>
                  <div className="flex flex-col gap-2">
                    {comps.map(comp => (
                      <div key={comp.name} className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ring-1 shrink-0 ${
                          comp.position === 1 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800'
                          : comp.position <= 3 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800'
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-800'
                        }`}>#{comp.position}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{comp.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
