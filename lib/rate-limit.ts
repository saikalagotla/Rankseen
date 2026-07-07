import type { SupabaseClient } from '@supabase/supabase-js'

export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours

// Scans and generations that are limited to once per day, per user.
export type RunKind = 'maps' | 'ai' | 'citations' | 'content' | 'action_plan'

// How many ms remain before this user may run `kind` again. 0 = allowed now.
export async function dailyCooldownRemaining(
  supabase: SupabaseClient,
  userId: string,
  kind: RunKind
): Promise<number> {
  const { data } = await supabase
    .from('scan_runs')
    .select('last_run_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .maybeSingle()

  if (!data?.last_run_at) return 0
  return Math.max(0, new Date(data.last_run_at).getTime() + DAILY_COOLDOWN_MS - Date.now())
}

// Record that the user just ran `kind` (call only after the run succeeds).
export async function recordRun(
  supabase: SupabaseClient,
  userId: string,
  kind: RunKind
): Promise<void> {
  await supabase
    .from('scan_runs')
    .upsert({ user_id: userId, kind, last_run_at: new Date().toISOString() }, { onConflict: 'user_id,kind' })
}

export function cooldownMessage(remainingMs: number, noun = 'scan'): string {
  const hours = Math.floor(remainingMs / (60 * 60 * 1000))
  if (hours >= 1) return `You've already run this ${noun} today — try again in about ${hours} hour${hours > 1 ? 's' : ''}.`
  const minutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)))
  return `You've already run this ${noun} today — try again in about ${minutes} minute${minutes > 1 ? 's' : ''}.`
}
