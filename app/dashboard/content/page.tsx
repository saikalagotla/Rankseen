import { getCurrentUser } from '@/lib/auth'
import { getProfile } from '@/lib/profile'
import { getLatestContentSignals, type ContentSignal } from '@/lib/scans'
import { DEMO_BIZ, DEMO_CONTENT } from '@/lib/demo-data'
import ScanTrigger from '../components/scan-trigger'
import DemoBanner from '../components/demo-banner'

function MentionBadge({ mentioned }: { mentioned: boolean | null }) {
  if (mentioned) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-200 dark:ring-emerald-800 px-2.5 py-1 rounded-lg shrink-0">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        You&apos;re listed
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 px-2.5 py-1 rounded-lg shrink-0">
      Not mentioned
    </span>
  )
}

function ListingRows({ items, emptyText }: { items: ContentSignal[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">{emptyText}</div>
  }
  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800">
      {items.map((item, i) => (
        <div key={`${item.url}-${i}`} className="px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <a
              href={item.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline line-clamp-1"
            >
              {item.title}
            </a>
            {item.detail?.snippet && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{item.detail.snippet}</p>
            )}
          </div>
          <MentionBadge mentioned={item.mentioned} />
        </div>
      ))}
    </div>
  )
}

export default async function ContentPage() {
  const user = await getCurrentUser()
  const isDemo = !user

  let content: ContentSignal[]
  let bizName: string
  let hasWebsite: boolean
  let needsSetup = false

  if (isDemo) {
    content = DEMO_CONTENT as unknown as ContentSignal[]
    bizName = DEMO_BIZ.business_name
    hasWebsite = true
  } else {
    const [profile, signals] = await Promise.all([getProfile(), getLatestContentSignals(user!.id)])
    content = signals
    bizName = profile?.business_name ?? 'Your Business'
    hasWebsite = !!profile?.website
    needsSetup = !profile?.business_type || !profile?.city_state
  }

  const hasApiKey = !!process.env.SERP_API_KEY
  const scanDate = content[0]?.scan_date

  const website = content.find(c => c.kind === 'website')
  const listicles = content.filter(c => c.kind === 'listicle')
  const reddit = content.filter(c => c.kind === 'reddit')

  const audit = website?.detail
  const listicleHits = listicles.filter(l => l.mentioned).length
  const redditHits = reddit.filter(r => r.mentioned).length

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : s >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Content Signals</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            The source material AI reads before recommending you — your website, &ldquo;best of&rdquo; lists, and Reddit
            {scanDate && <span className="ml-1">· Last scanned {scanDate}</span>}
          </p>
        </div>
        {!isDemo && (
          <ScanTrigger endpoint="/api/scan/content" label="Scan now" needsSetup={needsSetup} />
        )}
      </div>

      {/* Website & Schema Audit */}
      <div className="animate-fade-in-up bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Website &amp; Schema Audit</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">What AI can read from the site you control</p>
          </div>
          {audit?.reachable && typeof audit.score === 'number' && (
            <div className="text-right shrink-0">
              <p className={`text-3xl font-bold ${scoreColor(audit.score)}`}>{audit.score}%</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {audit.checks?.filter(c => c.passed).length ?? 0} of {audit.checks?.length ?? 0} checks
              </p>
            </div>
          )}
        </div>

        {!website ? (
          <div className="px-6 py-10 text-center">
            {!hasWebsite && !isDemo ? (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">No website on file.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  <a href="/dashboard/settings" className="text-emerald-600 dark:text-emerald-400 hover:underline">Add your website URL in Settings →</a> then run a scan.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">No audit yet. Run a scan to check your website.</p>
            )}
          </div>
        ) : audit?.reachable === false ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Couldn&apos;t reach {website.url}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Check the URL in Settings and that the site is live.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {audit?.checks?.map((c) => (
              <div key={c.id} className="px-6 py-3.5 flex items-start gap-3">
                {c.passed ? (
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${c.passed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200'}`}>{c.label}</p>
                  {!c.passed && c.fix && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{c.fix}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listicles + Reddit */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Listicles */}
        <div className="animate-fade-in-up delay-100 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">&ldquo;Best of&rdquo; Lists</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Ranked articles AI quotes from</p>
            </div>
            {listicles.length > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${listicleHits > 0 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                On {listicleHits} of {listicles.length}
              </span>
            )}
          </div>
          <ListingRows
            items={listicles}
            emptyText={hasApiKey ? 'No lists found yet. Run a scan.' : 'Add a SERP_API_KEY to check listicles.'}
          />
        </div>

        {/* Reddit */}
        <div className="animate-fade-in-up delay-150 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Reddit &amp; Forums</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Threads AI increasingly relies on</p>
            </div>
            {reddit.length > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${redditHits > 0 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                Named in {redditHits} of {reddit.length}
              </span>
            )}
          </div>
          <ListingRows
            items={reddit}
            emptyText={hasApiKey ? 'No threads found yet. Run a scan.' : 'Add a SERP_API_KEY to check Reddit.'}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
        These are the sources AI assistants read when deciding whether to recommend {bizName}. Getting listed on more of them is the most direct lever on your AI visibility.
      </p>
    </div>
  )
}
