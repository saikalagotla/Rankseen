import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type RankRow    = { keyword: string; rank: number | null; scan_week: string }
type AIRow      = { engine: string; query: string; mentioned: boolean; excerpt?: string | null; scan_week: string }
type PreviewData = {
  business_name: string | null
  business_type: string | null
  city_state:    string | null
  keywords:      string[]
  rank_snapshots: RankRow[]
  ai_visibility:  AIRow[]
}

const ENGINE_ORDER = ['chatgpt', 'google_ai', 'bing', 'claude']

const ENGINE_LABEL: Record<string, string> = {
  perplexity: 'Perplexity',
  google_ai:  'Google AI',
  claude:     'Claude',
  chatgpt:    'ChatGPT',
  bing:       'Bing Copilot',
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-xs font-bold ring-1 bg-slate-100 text-slate-400 ring-slate-200">
        —
      </span>
    )
  }
  const color =
    rank === 1 ? 'bg-amber-100 text-amber-700 ring-amber-200' :
    rank <= 3   ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
    rank <= 7   ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                  'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ring-1 ${color}`}>
      #{rank}
    </span>
  )
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_preview_data', { p_token: token })
  if (!data) notFound()

  const preview = data as PreviewData
  const bizName  = preview.business_name ?? 'This Business'
  const bizType  = preview.business_type ?? 'Business'
  const city     = preview.city_state ?? ''
  const hasRank  = preview.rank_snapshots.length > 0
  const hasAI    = preview.ai_visibility.length > 0
  const scanWeek = hasRank ? preview.rank_snapshots[0].scan_week : null

  // Group AI rows by engine, preserving ENGINE_ORDER
  const byEngine = new Map<string, AIRow[]>()
  for (const row of preview.ai_visibility) {
    if (!byEngine.has(row.engine)) byEngine.set(row.engine, [])
    byEngine.get(row.engine)!.push(row)
  }
  const engineGroups = ENGINE_ORDER
    .filter(e => byEngine.has(e))
    .map(e => ({ engine: e, label: ENGINE_LABEL[e] ?? e, queries: byEngine.get(e)! }))

  const aiMentions = preview.ai_visibility.filter(r => r.mentioned).length
  const aiTotal    = preview.ai_visibility.length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold text-lg tracking-tight">RankSeen</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Business header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{bizName}</h1>
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{bizType}</span>
          </div>
          <p className="text-slate-500 text-sm">
            {city}
            {scanWeek && <> &middot; Scanned {new Date(scanWeek).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>}
          </p>
        </div>

        {/* Summary chips */}
        {(hasRank || hasAI) && (
          <div className="flex flex-wrap gap-3">
            {hasRank && (
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">Google Maps</p>
                <p className="text-sm font-semibold text-slate-900">
                  {preview.rank_snapshots.some(r => r.rank !== null && r.rank <= 3)
                    ? 'Top 3 on some keywords'
                    : preview.rank_snapshots.some(r => r.rank !== null)
                      ? `Ranked #${Math.min(...preview.rank_snapshots.filter(r => r.rank !== null).map(r => r.rank!))} best`
                      : 'Not in top 20'}
                </p>
              </div>
            )}
            {hasAI && (
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 mb-0.5">AI Engines</p>
                <p className="text-sm font-semibold text-slate-900">
                  {aiMentions === 0
                    ? 'Not mentioned by any AI'
                    : `Mentioned by ${aiMentions} of ${aiTotal}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Google Maps Rankings */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Google Maps Rankings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Where you appear when customers search nearby</p>
          </div>
          {!hasRank ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No scan data yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {preview.rank_snapshots.map((row) => (
                <div key={row.keyword} className="px-6 py-3.5 flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium">{row.keyword}</span>
                  <RankBadge rank={row.rank} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Visibility */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">AI Engine Visibility</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Do ChatGPT, Google AI, and others recommend {bizName}?
            </p>
          </div>
          {!hasAI ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">No scan data yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {engineGroups.map(({ engine, label, queries }) => {
                const mentionedCount = queries.filter(q => q.mentioned).length
                return (
                  <div key={engine}>
                    {/* Engine header row */}
                    <div className="px-6 py-3 flex items-center justify-between bg-slate-50">
                      <span className="text-sm font-semibold text-slate-800">{label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        mentionedCount > 0
                          ? 'text-emerald-700 bg-emerald-100'
                          : 'text-slate-500 bg-slate-200'
                      }`}>
                        {mentionedCount}/{queries.length} queries
                      </span>
                    </div>
                    {/* Query sub-rows */}
                    {queries.map((q) => (
                      <div key={q.query} className="px-6 py-2.5 flex items-center justify-between gap-4 border-t border-slate-50">
                        <span className="text-xs text-slate-500 italic truncate flex-1 min-w-0">
                          &ldquo;{q.query}&rdquo;
                        </span>
                        {q.mentioned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200 shrink-0">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Mentioned
                          </span>
                        ) : q.excerpt === '__not_triggered__' ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200 shrink-0"
                            title="Google didn't show an AI Overview for this query — it showed the Maps local pack instead."
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Not triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200 shrink-0">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Not mentioned
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-emerald-900 mb-1">
            Track this every week — free to start
          </p>
          <p className="text-xs text-emerald-700 mb-4">
            RankSeen monitors your Google Maps rank, AI visibility, and citation health automatically.
            Setup takes 2 minutes.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Get started free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          This report was generated by{' '}
          <Link href="/" className="text-emerald-600 hover:underline">RankSeen</Link>
          . Rankings update weekly.
        </p>
      </div>
    </div>
  )
}
