import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/profile'
import { auditWebsite, checkListicles, checkReddit } from '@/lib/content'

type Row = {
  user_id: string
  kind: 'website' | 'listicle' | 'reddit'
  title: string | null
  url: string | null
  mentioned: boolean | null
  detail: unknown
  scan_date: string
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile()
  if (!profile?.business_type || !profile?.city_state) {
    return Response.json({ error: 'Business type and city are required' }, { status: 400 })
  }

  const serpApiKey = process.env.SERP_API_KEY
  const scanDate = new Date().toISOString().split('T')[0]
  const bizName = profile.business_name ?? profile.business_type
  const rows: Row[] = []

  // Website & schema audit — needs the website URL, no API key.
  if (profile.website) {
    const audit = await auditWebsite(profile.website, bizName, profile.city_state, profile.phone)
    rows.push({
      user_id: user.id,
      kind: 'website',
      title: profile.website,
      url: profile.website,
      mentioned: audit.reachable,
      detail: audit,
      scan_date: scanDate,
    })
  }

  // Listicles + Reddit — need SerpAPI.
  if (serpApiKey) {
    const [listicles, reddit] = await Promise.all([
      checkListicles(profile.business_type, profile.city_state, bizName, serpApiKey),
      checkReddit(profile.business_type, profile.city_state, bizName, serpApiKey),
    ])
    for (const l of listicles) {
      rows.push({ user_id: user.id, kind: 'listicle', title: l.title, url: l.url, mentioned: l.mentioned, detail: { snippet: l.snippet }, scan_date: scanDate })
    }
    for (const r of reddit) {
      rows.push({ user_id: user.id, kind: 'reddit', title: r.title, url: r.url, mentioned: r.mentioned, detail: { snippet: r.snippet }, scan_date: scanDate })
    }
  }

  if (rows.length === 0) {
    return Response.json(
      { error: 'Add your website in Settings and/or configure SERP_API_KEY to run content checks.' },
      { status: 503 }
    )
  }

  // Replace today's signals.
  await supabase.from('content_signals').delete().eq('user_id', user.id).eq('scan_date', scanDate)

  const { error } = await supabase.from('content_signals').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, total: rows.length })
}
