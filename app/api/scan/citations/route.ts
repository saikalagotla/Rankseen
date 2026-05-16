import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { checkCitation } from '@/lib/serp'

const CITATION_PLATFORMS = [
  { name: 'Google Business Profile', category: 'Primary', domain: 'business.google.com', url: 'https://business.google.com' },
  { name: 'Apple Maps', category: 'Primary', domain: 'maps.apple.com', url: 'https://mapsconnect.apple.com' },
  { name: 'Yelp', category: 'Primary', domain: 'yelp.com', url: 'https://biz.yelp.com' },
  { name: 'Bing Places', category: 'Primary', domain: 'bingplaces.com', url: 'https://www.bingplaces.com' },
  { name: 'Facebook', category: 'Social', domain: 'facebook.com', url: 'https://business.facebook.com' },
  { name: 'Foursquare', category: 'Directory', domain: 'foursquare.com', url: 'https://foursquare.com/add-place' },
  { name: 'Yellow Pages', category: 'Directory', domain: 'yellowpages.com', url: 'https://www.yellowpages.com/add-listing' },
  { name: 'Nextdoor', category: 'Directory', domain: 'nextdoor.com', url: 'https://business.nextdoor.com' },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serpApiKey = process.env.SERP_API_KEY
  if (!serpApiKey) {
    return Response.json({ error: 'SERP_API_KEY not configured' }, { status: 503 })
  }

  const profile = await getProfile()
  if (!profile?.business_name || !profile?.city_state) {
    return Response.json({ error: 'Business name and city are required' }, { status: 400 })
  }

  const scanDate = new Date().toISOString().split('T')[0]
  const businessName = profile.business_name
  const cityState = profile.city_state

  const results = await Promise.allSettled(
    CITATION_PLATFORMS.map(p =>
      checkCitation(p.name, p.domain, businessName, cityState, serpApiKey)
    )
  )

  const rows = CITATION_PLATFORMS.map((p, i) => {
    const r = results[i]
    const outcome = r.status === 'fulfilled'
      ? r.value
      : { status: 'missing' as const, issue: undefined }

    return {
      user_id: user.id,
      platform: p.name,
      category: p.category,
      status: outcome.status,
      issue: outcome.issue ?? null,
      scan_date: scanDate,
    }
  })

  // Replace today's citation snapshots
  await supabase
    .from('citation_snapshots')
    .delete()
    .eq('user_id', user.id)
    .eq('scan_date', scanDate)

  const { error } = await supabase.from('citation_snapshots').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const issues = rows.filter(r => r.status !== 'ok').length
  return Response.json({ success: true, total: rows.length, issues })
}
