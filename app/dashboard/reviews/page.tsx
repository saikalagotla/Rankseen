import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReviews } from '@/lib/scans'
import { getProfile } from '@/lib/profile'
import ReviewsClient from './reviews-client'

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

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [reviews, profile] = await Promise.all([getReviews(user.id), getProfile()])

  const hasGoogleKey = !!process.env.SERP_API_KEY
  const hasYelpKey = !!process.env.YELP_API_KEY

  const googleFallbackUrl = profile?.gbp_url ?? null
  const yelpFallbackUrl = profile?.yelp_place_id
    ? `https://www.yelp.com/biz/${profile.yelp_place_id}`
    : null

  return (
    <ReviewsClient
      reviews={reviews}
      googleFallbackUrl={googleFallbackUrl}
      yelpFallbackUrl={yelpFallbackUrl}
      googleSyncLabel={syncLabel('Google', profile?.google_reviews_synced_at ?? null, hasGoogleKey)}
      googleSyncDisabled={syncDisabled(profile?.google_reviews_synced_at ?? null, hasGoogleKey)}
      yelpSyncLabel={syncLabel('Yelp', profile?.yelp_reviews_synced_at ?? null, hasYelpKey)}
      yelpSyncDisabled={syncDisabled(profile?.yelp_reviews_synced_at ?? null, hasYelpKey)}
    />
  )
}
