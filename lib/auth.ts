import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Cached for the duration of a single server render. Every getUser() call is a
// network round-trip to Supabase Auth to validate the token — the root layout,
// dashboard layout, the page, and getProfile() all need the user, so without
// this dedup a single navigation makes ~5 identical auth calls in a waterfall.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
