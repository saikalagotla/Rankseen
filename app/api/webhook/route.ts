import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

function planFromPriceId(priceId: string): 'starter' | 'pro' | null {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return null
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // RLS blocks the anon client here (webhooks carry no user session), so
    // without the service role key every profile update would silently no-op.
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id ?? session.client_reference_id
    const plan = session.metadata?.plan ?? 'pro'
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          plan,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const priceId = sub.items.data[0]?.price?.id

    if ((sub.status === 'active' || sub.status === 'trialing') && priceId) {
      const plan = planFromPriceId(priceId)
      if (plan) {
        await supabase
          .from('profiles')
          .update({ plan })
          .eq('stripe_customer_id', customerId)
      }
    } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    // Only downgrade on the first failure — Stripe will also fire subscription.updated
    // with status=past_due, but handling it here ensures immediate lockout.
    if (customerId && invoice.attempt_count === 1) {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
