import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { checkMapsRank, getWeekStart } from '@/lib/serp'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serpApiKey = process.env.SERP_API_KEY
  if (!serpApiKey) {
    return Response.json({ error: 'SERP_API_KEY not configured' }, { status: 503 })
  }

  const profile = await getProfile()
  if (!profile?.keywords?.length) {
    return Response.json({ error: 'No keywords configured' }, { status: 400 })
  }

  const scanWeek = getWeekStart(new Date())
  const businessName = profile.business_name ?? ''
  const location = profile.city_state ?? ''

  const results = await Promise.allSettled(
    profile.keywords.map(kw => checkMapsRank(kw, businessName, location, serpApiKey))
  )

  const rows = profile.keywords.map((keyword, i) => ({
    user_id: user.id,
    keyword,
    rank: results[i].status === 'fulfilled' ? results[i].value.rank : null,
    scan_week: scanWeek,
  }))

  // Replace this week's snapshots
  await supabase
    .from('rank_snapshots')
    .delete()
    .eq('user_id', user.id)
    .eq('scan_week', scanWeek)

  const { error } = await supabase.from('rank_snapshots').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const found = rows.filter(r => r.rank !== null).length
  return Response.json({ success: true, scanned: rows.length, ranked: found })
}
