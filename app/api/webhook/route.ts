import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id ?? session.client_reference_id
    if (userId) {
      await supabase.from('profiles').update({ plan: 'pro' }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string
    // Look up user by stripe_customer_id if you store it, or fall back to metadata
    const metadata = sub.metadata as { user_id?: string }
    if (metadata?.user_id) {
      await supabase.from('profiles').update({ plan: 'solo' }).eq('id', metadata.user_id)
    }
  }

  return NextResponse.json({ received: true })
}
