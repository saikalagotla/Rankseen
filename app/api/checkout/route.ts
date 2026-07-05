import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const plan: 'starter' | 'pro' = body.plan === 'starter' ? 'starter' : 'pro'

  const priceId = plan === 'starter'
    ? process.env.STRIPE_STARTER_PRICE_ID
    : process.env.STRIPE_PRO_PRICE_ID

  if (!priceId) {
    return NextResponse.json({ error: `STRIPE_${plan.toUpperCase()}_PRICE_ID not configured` }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    // Landing page promises "14-day free trial. No credit card required" —
    // keep checkout consistent with that claim.
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: 14,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
    success_url: `${origin}/dashboard/upgrade?success=1&plan=${plan}`,
    cancel_url: `${origin}/dashboard/settings`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
