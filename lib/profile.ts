import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export type Profile = {
  id: string
  business_name: string | null
  business_type: string | null
  city_state: string | null
  gbp_url: string | null
  website: string | null
  phone: string | null
  plan: string
  keywords: string[]
  place_id: string | null
  yelp_place_id: string | null
  google_reviews_synced_at: string | null
  yelp_reviews_synced_at: string | null
  preview_token: string | null
}

// Cached per-request: the dashboard layout and page both call this, so without
// the cache each navigation runs the profiles query (and a getUser) twice.
export const getProfile = cache(async (): Promise<Profile | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, business_name, business_type, city_state, gbp_url, website, phone, plan, keywords, place_id, yelp_place_id, google_reviews_synced_at, yelp_reviews_synced_at, preview_token')
      .eq('id', user.id)
      .single()
    return (data as Profile) ?? null
  } catch {
    return null
  }
})
