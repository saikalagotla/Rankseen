import { getCurrentUser } from '@/lib/auth'
import { getReviews, type StoredReview } from '@/lib/scans'
import { getProfile } from '@/lib/profile'
import { DEMO_REVIEWS } from '@/lib/demo-data'
import ReviewsClient from './reviews-client'

export default async function ReviewsPage() {
  const user = await getCurrentUser()
  const isDemo = !user

  if (isDemo) {
    return (
      <ReviewsClient
        reviews={DEMO_REVIEWS as unknown as StoredReview[]}
        isDemo={true}
      />
    )
  }

  const COOLDOWN_MS = 24 * 60 * 60 * 1000

  function syncLabel(source: string, lastSyncedAt: string | null, hasKey: boolean): string {
    if (!hasKey) return `Sync ${source}`
    if (!lastSyncedAt) return `Sync ${source}`
    const remaining = new Date(lastSyncedAt).getTime() + COOLDOWN_MS - Date.now()
    if (remaining <= 0) return `Sync ${source}`
    const hours = Math.floor(remaining / 3600000)
    const mins = Math.floor((remaining % 3600000) / 60000)
    return `Next sync in ${hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}`
  }

  function syncDisabled(lastSyncedAt: string | null, hasKey: boolean): boolean {
    if (!hasKey) return true
    if (!lastSyncedAt) return false
    return new Date(lastSyncedAt).getTime() + COOLDOWN_MS > Date.now()
  }

  const [reviews, profile] = await Promise.all([getReviews(user!.id), getProfile()])

  const hasGoogleKey = !!process.env.SERP_API_KEY
  const hasYelpKey = !!process.env.YELP_API_KEY

  return (
    <ReviewsClient
      reviews={reviews}
      googleFallbackUrl={profile?.gbp_url ?? null}
      yelpFallbackUrl={profile?.yelp_place_id ? `https://www.yelp.com/biz/${profile.yelp_place_id}` : null}
      googleSyncLabel={syncLabel('Google', profile?.google_reviews_synced_at ?? null, hasGoogleKey)}
      googleSyncDisabled={syncDisabled(profile?.google_reviews_synced_at ?? null, hasGoogleKey)}
      yelpSyncLabel={syncLabel('Yelp', profile?.yelp_reviews_synced_at ?? null, hasYelpKey)}
      yelpSyncDisabled={syncDisabled(profile?.yelp_reviews_synced_at ?? null, hasYelpKey)}
    />
  )
}
