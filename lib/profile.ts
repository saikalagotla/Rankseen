import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  business_name: string | null
  business_type: string | null
  city_state: string | null
  gbp_url: string | null
  phone: string | null
  plan: string
  keywords: string[]
  place_id: string | null
  yelp_place_id: string | null
  google_reviews_synced_at: string | null
  yelp_reviews_synced_at: string | null
  preview_token: string | null
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('profiles')
      .select('id, business_name, business_type, city_state, gbp_url, phone, plan, keywords, place_id, yelp_place_id, google_reviews_synced_at, yelp_reviews_synced_at, preview_token')
      .eq('id', user.id)
      .single()
    return (data as Profile) ?? null
  } catch {
    return null
  }
}
