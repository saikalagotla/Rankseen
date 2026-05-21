import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getProfile } from '@/lib/profile'
import {
  findBusinessDataId,
  fetchGoogleReviews,
  findYelpBusinessId,
  fetchYelpReviews,
} from '@/lib/places'

const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours

function cooldownRemaining(lastSyncedAt: string | null): number {
  if (!lastSyncedAt) return 0
  return Math.max(0, new Date(lastSyncedAt).getTime() + COOLDOWN_MS - Date.now())
}

async function syncGoogle(
  supabase: SupabaseClient,
  userId: string,
  cachedDataId: string | null,
  businessName: string,
  cityState: string,
  serpApiKey: string
): Promise<{ synced: number; error?: string }> {
  let dataId = cachedDataId

  if (!dataId) {
    dataId = await findBusinessDataId(businessName, cityState, serpApiKey)
    if (!dataId) return { synced: 0, error: 'Business not found on Google Maps' }
    await supabase.from('profiles').update({ place_id: dataId }).eq('id', userId)
  }

  const reviews = await fetchGoogleReviews(dataId, serpApiKey)
  if (reviews.length === 0) return { synced: 0 }

  const rows = reviews.map(r => ({
    user_id: userId,
    source: 'google',
    external_id: r.external_id,
    author: r.author,
    rating: r.rating,
    body: r.body,
    published_at: r.published_at,
    url: r.url,
  }))

  const { error } = await supabase
    .from('reviews')
    .upsert(rows, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true })

  if (error) return { synced: 0, error: error.message }

  // Backfill URL on existing rows that predate the url column
  await Promise.all(
    reviews
      .filter(r => r.url)
      .map(r =>
        supabase
          .from('reviews')
          .update({ url: r.url })
          .eq('user_id', userId)
          .eq('source', 'google')
          .eq('external_id', r.external_id)
          .is('url', null)
      )
  )

  await supabase
    .from('profiles')
    .update({ google_reviews_synced_at: new Date().toISOString() })
    .eq('id', userId)

  return { synced: rows.length }
}

async function syncYelp(
  supabase: SupabaseClient,
  userId: string,
  cachedYelpId: string | null,
  businessName: string,
  cityState: string,
  yelpApiKey: string
): Promise<{ synced: number; error?: string }> {
  let yelpId = cachedYelpId

  if (!yelpId) {
    yelpId = await findYelpBusinessId(businessName, cityState, yelpApiKey)
    if (!yelpId) return { synced: 0, error: 'Business not found on Yelp' }
    await supabase.from('profiles').update({ yelp_place_id: yelpId }).eq('id', userId)
  }

  const reviews = await fetchYelpReviews(yelpId, yelpApiKey)
  if (reviews.length === 0) return { synced: 0 }

  const rows = reviews.map(r => ({
    user_id: userId,
    source: 'yelp',
    external_id: r.external_id,
    author: r.author,
    rating: r.rating,
    body: r.body,
    published_at: r.published_at,
    url: r.url,
  }))

  const { error } = await supabase
    .from('reviews')
    .upsert(rows, { onConflict: 'user_id,source,external_id', ignoreDuplicates: true })

  if (error) return { synced: 0, error: error.message }

  // Backfill URL on existing rows that predate the url column
  await Promise.all(
    reviews
      .filter(r => r.url)
      .map(r =>
        supabase
          .from('reviews')
          .update({ url: r.url })
          .eq('user_id', userId)
          .eq('source', 'yelp')
          .eq('external_id', r.external_id)
          .is('url', null)
      )
  )

  await supabase
    .from('profiles')
    .update({ yelp_reviews_synced_at: new Date().toISOString() })
    .eq('id', userId)

  return { synced: rows.length }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serpApiKey = process.env.SERP_API_KEY
  const yelpApiKey = process.env.YELP_API_KEY

  if (!serpApiKey && !yelpApiKey) {
    return Response.json({ error: 'No API keys configured' }, { status: 503 })
  }

  const profile = await getProfile()
  if (!profile?.business_name) {
    return Response.json({ error: 'Business name not configured' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source') // 'google' | 'yelp' | null (both)

  if (source === 'google' && !serpApiKey) {
    return Response.json({ error: 'SERP_API_KEY not configured' }, { status: 503 })
  }
  if (source === 'yelp' && !yelpApiKey) {
    return Response.json({ error: 'YELP_API_KEY not configured' }, { status: 503 })
  }

  // Rate limit check
  if (source === 'google' || !source) {
    const remaining = cooldownRemaining(profile.google_reviews_synced_at)
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      return Response.json(
        { error: `Next Google sync available in ${label}` },
        { status: 429 }
      )
    }
  }
  if (source === 'yelp' || !source) {
    const remaining = cooldownRemaining(profile.yelp_reviews_synced_at)
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      return Response.json(
        { error: `Next Yelp sync available in ${label}` },
        { status: 429 }
      )
    }
  }

  const businessName = profile.business_name
  const cityState = profile.city_state ?? ''

  const runGoogle = (!source || source === 'google') && !!serpApiKey
  const runYelp = (!source || source === 'yelp') && !!yelpApiKey

  const [googleResult, yelpResult] = await Promise.all([
    runGoogle
      ? syncGoogle(supabase, user.id, profile.place_id, businessName, cityState, serpApiKey!)
      : Promise.resolve({ synced: 0 }),
    runYelp
      ? syncYelp(supabase, user.id, profile.yelp_place_id, businessName, cityState, yelpApiKey!)
      : Promise.resolve({ synced: 0 }),
  ])

  return Response.json({
    success: true,
    google: googleResult,
    yelp: yelpResult,
    synced: googleResult.synced + yelpResult.synced,
  })
}
