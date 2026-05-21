import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getLatestCitations } from '@/lib/scans'
import ScanTrigger from '../components/scan-trigger'

const PLATFORM_URLS: Record<string, string> = {
  'Google Business Profile': 'https://business.google.com',
  'Yelp': 'https://biz.yelp.com',
  'Facebook': 'https://business.facebook.com',
  'Foursquare': 'https://foursquare.com/add-place',
  'Yellow Pages': 'https://www.yellowpages.com/add-listing',
  'Nextdoor': 'https://business.nextdoor.com',
}

const MANUAL_PLATFORMS = [
  { name: 'Apple Maps', url: 'https://mapsconnect.apple.com', note: 'Verify at Apple Business Connect' },
  { name: 'Bing Places', url: 'https://www.bingplaces.com', note: 'Verify at Bing Places for Business' },
]

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return (
    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
  if (status === 'warn') return (
    <svg className="w-5 h-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
  return (
    <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  )
}

export default async function CitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, citations] = await Promise.all([
    getProfile(),
    getLatestCitations(user.id),
  ])

  const bizName = profile?.business_name ?? 'Your Business'
  const city = profile?.city_state ?? 'Your City'
  const phone = profile?.phone ?? null
  const hasApiKey = !!process.env.SERP_API_KEY
  const scanDate = citations[0]?.scan_date
  const MANUAL_PLATFORM_NAMES = new Set(MANUAL_PLATFORMS.map(p => p.name))
  const autoCitations = citations.filter(c => !MANUAL_PLATFORM_NAMES.has(c.platform))
  const hasData = autoCitations.length > 0

  const okCount = autoCitations.filter(c => c.status === 'ok').length
  const warnCount = autoCitations.filter(c => c.status === 'warn').length
  const missingCount = autoCitations.filter(c => c.status === 'missing').length
  const healthPct = autoCitations.length > 0
    ? Math.round((okCount / autoCitations.length) * 100)
    : null

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Citation Health</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            NAP consistency across directories &amp; platforms
            {scanDate && ` · Last scanned ${scanDate}`}
          </p>
        </div>
        <ScanTrigger endpoint="/api/scan/citations" label="Scan now" disabled={!hasApiKey} />
      </div>

      {!hasApiKey && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Add a <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">SERP_API_KEY</code> to <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">.env.local</code> to enable citation scanning.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Health score',
            value: healthPct !== null ? `${healthPct}%` : '—',
            color: healthPct !== null
              ? (healthPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')
              : 'text-slate-400 dark:text-slate-500',
          },
          { label: 'Consistent', value: hasData ? String(okCount) : '—', color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Issues', value: hasData ? String(warnCount) : '—', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Not listed', value: hasData ? String(missingCount) : '—', color: 'text-slate-500 dark:text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Citations list (2/3) + sidebar (1/3) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Citations list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Auto-verified Citations</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {hasData ? `${autoCitations.length} platforms scanned` : 'Click "Scan now" to check your listings'}
            </span>
          </div>

          {!hasData ? (
            <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
              <svg className="w-10 h-10 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-slate-500 dark:text-slate-400">No citation data yet.</p>
              {hasApiKey ? (
                <ScanTrigger endpoint="/api/scan/citations" label="Run citation scan" />
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">Add a SERP_API_KEY to enable scanning.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {autoCitations.map((c) => (
                <div key={c.platform} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon status={c.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.platform}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{c.category}</span>
                        </div>
                        <a
                          href={PLATFORM_URLS[c.platform] ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                        >
                          {c.status === 'missing' ? 'Add listing →' : 'View / edit →'}
                        </a>
                      </div>

                      {c.status === 'missing' ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Not found — adding your business increases citation authority.</p>
                      ) : c.status === 'warn' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs text-amber-600 dark:text-amber-400">{c.issue ?? 'Listing may have inconsistent NAP — verify it matches your canonical.'}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Listed and consistent</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: Canonical NAP + Manual platforms */}
        <div className="flex flex-col gap-5">
          {/* Canonical NAP */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 dark:shadow-blue-950/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Your Canonical NAP</p>
                <p className="text-xs text-blue-100">Every listing must match exactly</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-0.5">Name</p>
                <p className="text-sm font-semibold text-white truncate">{bizName}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-0.5">City</p>
                <p className="text-sm font-semibold text-white">{city}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-0.5">Phone</p>
                {phone ? (
                  <p className="text-sm font-semibold text-white">{phone}</p>
                ) : (
                  <a href="/dashboard/settings" className="text-xs text-blue-200 hover:text-white underline transition-colors">Add phone in Settings →</a>
                )}
              </div>
            </div>
          </div>

          {/* Manual verification platforms */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Verify Manually</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Log in to each platform to confirm your listing.</p>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {MANUAL_PLATFORMS.map((p) => (
                <div key={p.name} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.note}</p>
                    </div>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                  >
                    Open →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
