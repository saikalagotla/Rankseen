'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StoredReview } from '@/lib/scans'
import ScanTrigger from '../components/scan-trigger'

type Filter = 'All' | 'Google' | 'Yelp' | '5★' | '4★' | '3★ & below'

const SOURCE_COLORS: Record<string, string> = {
  Google: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  Yelp: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
}

const AVATAR_COLORS = [
  'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
  'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
]

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${cls} ${i <= rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  reviews: StoredReview[]
  googleFallbackUrl?: string | null
  yelpFallbackUrl?: string | null
  googleSyncLabel?: string
  googleSyncDisabled?: boolean
  yelpSyncLabel?: string
  yelpSyncDisabled?: boolean
}

export default function ReviewsClient({
  reviews,
  googleFallbackUrl = null,
  yelpFallbackUrl = null,
  googleSyncLabel = 'Sync Google',
  googleSyncDisabled = false,
  yelpSyncLabel = 'Sync Yelp',
  yelpSyncDisabled = false,
}: Props) {
  function reviewUrl(r: StoredReview) {
    if (r.url) return r.url
    if (r.source === 'google') return googleFallbackUrl
    if (r.source === 'yelp') return yelpFallbackUrl
    return null
  }
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('All')
  const [drafting, setDrafting] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = reviews.filter(r => {
    const source = r.source.charAt(0).toUpperCase() + r.source.slice(1)
    if (filter === 'All') return true
    if (filter === 'Google') return source === 'Google'
    if (filter === 'Yelp') return source === 'Yelp'
    if (filter === '5★') return r.rating === 5
    if (filter === '4★') return r.rating === 4
    if (filter === '3★ & below') return (r.rating ?? 0) <= 3
    return true
  })

  const filters: Filter[] = ['All', 'Google', 'Yelp', '5★', '4★', '3★ & below']

  const totalReviews = reviews.length
  const avgRating = totalReviews
    ? (reviews.reduce((a, r) => a + (r.rating ?? 0), 0) / totalReviews).toFixed(1)
    : null

  const newThisMonth = reviews.filter(r => {
    if (!r.published_at) return false
    const d = new Date(r.published_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const repliedCount = reviews.filter(r => r.replied).length
  const responseRate = totalReviews ? Math.round((repliedCount / totalReviews) * 100) : 0

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))

  async function handleSaveReply(reviewId: string) {
    if (!draftText.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, replyText: draftText }),
      })
      if (res.ok) {
        setDrafting(null)
        setDraftText('')
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (totalReviews === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Reviews</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor and respond to customer reviews</p>
          </div>
          <div className="flex items-center gap-2">
            <ScanTrigger endpoint="/api/scan/reviews?source=google" label={googleSyncLabel} disabled={googleSyncDisabled} />
            <ScanTrigger endpoint="/api/scan/reviews?source=yelp" label={yelpSyncLabel} disabled={yelpSyncDisabled} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center text-center gap-3">
          <svg className="w-12 h-12 text-slate-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No reviews yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
            Use the sync buttons above to pull in your latest Google and Yelp reviews.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Reviews</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor and respond to customer reviews · {totalReviews} total</p>
        </div>
        <div className="flex items-center gap-2">
          <ScanTrigger endpoint="/api/scan/reviews?source=google" label={googleSyncLabel} disabled={googleSyncDisabled} />
          <ScanTrigger endpoint="/api/scan/reviews?source=yelp" label={yelpSyncLabel} disabled={yelpSyncDisabled} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Average rating</p>
          <p className="text-3xl font-bold text-amber-500 mb-1">{avgRating ?? '—'}</p>
          {avgRating && <StarRating rating={Math.round(Number(avgRating))} />}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Total reviews</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalReviews}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Across all platforms</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">New this month</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{newThisMonth}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">This calendar month</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Response rate</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{responseRate}%</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{repliedCount} of {totalReviews} replied</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Rating distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm mb-4">Rating breakdown</h2>
          <div className="space-y-2.5">
            {ratingDist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-4 text-right">{star}</span>
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${totalReviews ? (count / totalReviews) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 w-4">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tip: boost your response rate</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">Businesses that respond to reviews rank higher in Google Maps. Aim to reply within 24 hours.</p>
          </div>
        </div>

        {/* Needs reply */}
        <div className="lg:col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
              Needs a reply ({reviews.filter(r => !r.replied).length})
            </h2>
          </div>
          <div className="space-y-3">
            {reviews.filter(r => !r.replied).slice(0, 3).map((r, i) => {
              const source = r.source.charAt(0).toUpperCase() + r.source.slice(1)
              return (
                <div key={r.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {initials(r.author)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.author ?? 'Anonymous'}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.rating && <StarRating rating={r.rating} />}
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(r.published_at)}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${SOURCE_COLORS[source] ?? 'bg-slate-100 text-slate-600'}`}>{source}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{r.body}</p>
                  {drafting === r.id ? (
                    <div className="mt-3">
                      <textarea
                        className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                        rows={3}
                        placeholder="Write your reply..."
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveReply(r.id)}
                          disabled={saving || !draftText.trim()}
                          className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {saving ? 'Saving…' : 'Save reply'}
                        </button>
                        <button onClick={() => { setDrafting(null); setDraftText('') }} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => { setDrafting(r.id); setDraftText('') }}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Draft reply →
                      </button>
                      {reviewUrl(r) && (
                        <a
                          href={reviewUrl(r)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline"
                        >
                          View on {source} ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {reviews.filter(r => !r.replied).length === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">All reviews have been replied to!</p>
            )}
          </div>
        </div>
      </div>

      {/* All reviews */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">All Reviews</h2>
          <div className="flex flex-wrap gap-1.5">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {filtered.map((r, i) => {
            const source = r.source.charAt(0).toUpperCase() + r.source.slice(1)
            return (
              <div key={r.id} className="px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(r.author)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{r.author ?? 'Anonymous'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.rating && <StarRating rating={r.rating} />}
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(r.published_at)}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLORS[source] ?? 'bg-slate-100 text-slate-600'}`}>{source}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{r.body}</p>

                    {r.replied && r.reply_text && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border-l-2 border-emerald-400 mb-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Your reply</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{r.reply_text}</p>
                      </div>
                    )}

                    {!r.replied && (
                      drafting === r.id ? (
                        <div>
                          <textarea
                            className="w-full text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                            rows={3}
                            placeholder="Write your reply..."
                            value={draftText}
                            onChange={e => setDraftText(e.target.value)}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSaveReply(r.id)}
                              disabled={saving || !draftText.trim()}
                              className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {saving ? 'Saving…' : 'Save reply'}
                            </button>
                            <button onClick={() => { setDrafting(null); setDraftText('') }} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setDrafting(r.id); setDraftText('') }}
                            className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            Draft reply →
                          </button>
                          {reviewUrl(r) && (
                            <a
                              href={reviewUrl(r)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                            >
                              View on {source} ↗
                            </a>
                          )}
                        </div>
                      )
                    )}
                    {r.replied && reviewUrl(r) && (
                      <a
                        href={reviewUrl(r)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                      >
                        View on {source} ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
