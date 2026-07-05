import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for trusted server contexts (Stripe webhooks) that have
// no user session. Bypasses RLS — never import from client components.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
