import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { checkMapsRank, geocodeCity, getWeekStart } from '@/lib/serp'
import { dailyCooldownRemaining, recordRun, cooldownMessage } from '@/lib/rate-limit'

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

  const cooldown = await dailyCooldownRemaining(supabase, user.id, 'maps')
  if (cooldown > 0) return Response.json({ error: cooldownMessage(cooldown) }, { status: 429 })

  const scanWeek = getWeekStart(new Date())
  const businessName = profile.business_name ?? ''
  const location = profile.city_state ?? ''

  // Geocode once, reuse for all keywords
  const ll = await geocodeCity(location)

  const results = await Promise.allSettled(
    profile.keywords.map(kw => checkMapsRank(kw, businessName, location, serpApiKey, ll ?? undefined))
  )

  const rows = profile.keywords.map((keyword, i) => ({
    user_id: user.id,
    keyword,
    rank: results[i].status === 'fulfilled' ? results[i].value.rank : null,
    scan_week: scanWeek,
  }))

  const competitorRows: Array<{
    user_id: string
    keyword: string
    scan_week: string
    position: number
    competitor_name: string
  }> = []

  for (let i = 0; i < profile.keywords.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      for (const comp of r.value.competitors) {
        if (comp.name) {
          competitorRows.push({
            user_id: user.id,
            keyword: profile.keywords[i],
            scan_week: scanWeek,
            position: comp.position,
            competitor_name: comp.name,
          })
        }
      }
    }
  }

  // Replace this week's snapshots
  await supabase
    .from('rank_snapshots')
    .delete()
    .eq('user_id', user.id)
    .eq('scan_week', scanWeek)

  const { error } = await supabase.from('rank_snapshots').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (competitorRows.length > 0) {
    await supabase
      .from('competitor_snapshots')
      .delete()
      .eq('user_id', user.id)
      .eq('scan_week', scanWeek)
    await supabase.from('competitor_snapshots').insert(competitorRows)
  }

  await recordRun(supabase, user.id, 'maps')

  const found = rows.filter(r => r.rank !== null).length
  return Response.json({ success: true, scanned: rows.length, ranked: found })
}
