import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.reviewId || typeof body.replyText !== 'string') {
    return Response.json({ error: 'reviewId and replyText are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('reviews')
    .update({ replied: true, reply_text: body.replyText })
    .eq('id', body.reviewId)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
