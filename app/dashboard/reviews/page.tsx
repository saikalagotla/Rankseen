import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReviews } from '@/lib/scans'
import ReviewsClient from './reviews-client'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const reviews = await getReviews(user.id)

  return <ReviewsClient reviews={reviews} />
}
