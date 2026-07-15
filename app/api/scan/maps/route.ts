import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { checkMapsRank, checkOrganicRank, geocodeCity, getWeekStart, type OrganicRankResult } from '@/lib/serp'
import { dailyCooldownRemaining, recordRun, cooldownMessage } from '@/lib/rate-limit'

// External API calls are slow; give the function room beyond the default.
export const maxDuration = 60

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

  const website = profile.website
  const emptyOrganic: PromiseSettledResult<OrganicRankResult>[] = []

  // Maps rank and organic web rank run concurrently — organic only when a
  // website is set (it's matched by the site's domain in the results).
  const [results, organicResults] = await Promise.all([
    Promise.allSettled(
      profile.keywords.map(kw => checkMapsRank(kw, businessName, location, serpApiKey, ll ?? undefined))
    ),
    website
      ? Promise.allSettled(profile.keywords.map(kw => checkOrganicRank(kw, website, location, serpApiKey)))
      : Promise.resolve(emptyOrganic),
  ])

  const rows = profile.keywords.map((keyword, i) => ({
    user_id: user.id,
    keyword,
    rank: results[i].status === 'fulfilled' ? results[i].value.rank : null,
    scan_week: scanWeek,
  }))

  const organicRows = website
    ? profile.keywords.map((keyword, i) => {
        const r = organicResults[i]
        const val = r?.status === 'fulfilled' ? r.value : null
        return {
          user_id: user.id,
          keyword,
          rank: val?.rank ?? null,
          url: val?.url ?? null,
          scan_week: scanWeek,
        }
      })
    : []

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

  if (website) {
    await supabase
      .from('organic_snapshots')
      .delete()
      .eq('user_id', user.id)
      .eq('scan_week', scanWeek)
    if (organicRows.length > 0) {
      await supabase.from('organic_snapshots').insert(organicRows)
    }
  }

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
