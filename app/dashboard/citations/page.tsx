import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { getLatestCitations } from '@/lib/scans'
import ScanTrigger from '../components/scan-trigger'

const PLATFORM_URLS: Record<string, string> = {
  'Google Business Profile': 'https://business.google.com',
  'Apple Maps': 'https://mapsconnect.apple.com',
  'Yelp': 'https://biz.yelp.com',
  'Bing Places': 'https://www.bingplaces.com',
  'Facebook': 'https://business.facebook.com',
  'Foursquare': 'https://foursquare.com/add-place',
  'Yellow Pages': 'https://www.yellowpages.com/add-listing',
  'Nextdoor': 'https://business.nextdoor.com',
}

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
  const hasData = citations.length > 0
  const scanDate = citations[0]?.scan_date

  const okCount = citations.filter(c => c.status === 'ok').length
  const warnCount = citations.filter(c => c.status === 'warn').length
  const missingCount = citations.filter(c => c.status === 'missing').length
  const healthPct = citations.length > 0
    ? Math.round((okCount / citations.length) * 100)
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
      <div className="grid grid-cols-4 gap-4 mb-8">
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

      {/* Canonical NAP */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Your canonical NAP (Name · Address · Phone)</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">Every listing should match these exactly — including abbreviations and punctuation.</p>
            <div className="flex flex-wrap gap-6 mt-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                <span className="font-normal text-blue-600 dark:text-blue-400 mr-1.5">Name</span>{bizName}
              </span>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                <span className="font-normal text-blue-600 dark:text-blue-400 mr-1.5">City</span>{city}
              </span>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                <span className="font-normal text-blue-600 dark:text-blue-400 mr-1.5">Phone</span>
                {phone ?? (
                  <a href="/dashboard/settings" className="text-blue-600 dark:text-blue-400 underline">Add phone in Settings →</a>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Citations list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">All Citations</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {hasData ? `${citations.length} platforms scanned` : 'Click "Scan now" to check your listings'}
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
            {citations.map((c) => (
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
    </div>
  )
}
