import Link from 'next/link'
import Nav from './components/nav'
import PricingCard from './components/pricing-card'
import AnimateOnScroll from './components/animate-on-scroll'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Google Maps Rank',
    description: 'Track where you rank for "best [your type] near me" keywords. See movement weekly and understand what\'s driving changes.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'AI Visibility',
    description: 'Find out if ChatGPT, Perplexity, Google AI, Claude, and Bing Copilot recommend your business when customers ask.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Citation Health',
    description: 'Scan Yelp, Apple Maps, Bing, and 20+ directories for name/address/phone mismatches that hurt your local ranking.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Weekly Digest',
    description: 'Every Monday: 3 plain-English things to fix. No login required. Straight to your inbox, ready to act on.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Review Monitoring',
    description: 'New Google and Yelp reviews in your inbox. AI-drafted response suggestions so you never miss a chance to connect.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Competitor Snapshot',
    description: "See exactly who's ranking above you and what they're doing differently. Stop guessing, start acting.",
  },
]

const stats = [
  { value: '66% cheaper', label: 'than BrightLocal' },
  { value: '5', label: 'AI engines tracked' },
  { value: '2 min', label: 'setup time' },
  { value: '0', label: 'agency jargon' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  const currentPlanKey = null
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="animate-fade-in-up inline-block bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-emerald-200 dark:ring-emerald-800 mb-6">
            Local SEO + AI Visibility &mdash; in one weekly report
          </span>
          <h1 className="animate-fade-in-up delay-100 text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-6">
            Know if Google Maps and ChatGPT are sending customers to you&mdash;
            <span className="text-emerald-500"> or your competitor.</span>
          </h1>
          <p className="animate-fade-in-up delay-200 text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The weekly local SEO report built for business owners, not agencies. Track your Maps rank, AI visibility, and citation health in one place.
          </p>
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/setup"
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-emerald-500/25 inline-block"
            >
              Start Free Trial
            </Link>
            <Link
              href="/dashboard"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:shadow-md inline-block"
            >
              See Demo &rarr;
            </Link>
          </div>
          <p className="animate-fade-in-up delay-400 text-sm text-slate-400 dark:text-slate-500 mt-4">No credit card required &middot; Cancel anytime</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 py-8 px-6 transition-colors duration-300">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <AnimateOnScroll key={stat.label} stagger={(i + 1) as 1 | 2 | 3 | 4 | 5 | 6} className="text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </AnimateOnScroll>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything you need to grow local</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Stop paying agencies for reports you don&apos;t understand. SpottedHQ shows you exactly what matters, in plain English.
            </p>
          </AnimateOnScroll>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <AnimateOnScroll key={feature.title} stagger={((i % 3) + 1) as 1 | 2 | 3}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-7 hover:shadow-xl dark:hover:shadow-slate-900 hover:border-slate-200 dark:hover:border-slate-700 hover:-translate-y-1 transition-all duration-200 group h-full">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly briefing preview */}
      <section className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 py-20 px-6 transition-colors duration-300">
        <div className="max-w-4xl mx-auto text-center">
          <AnimateOnScroll>
            <h2 className="text-3xl font-bold text-white mb-4">Your weekly briefing, in plain English</h2>
            <p className="text-slate-400 mb-10">No dashboards to log into. Every Monday, three things to act on &mdash; delivered straight to your inbox.</p>
          </AnimateOnScroll>
          <AnimateOnScroll stagger={2}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-left max-w-2xl mx-auto shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">SH</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">SpottedHQ Weekly</p>
                  <p className="text-xs text-slate-400">hello@spottedhq.com &middot; Mon 7:00 AM</p>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Your weekly briefing &mdash; May 12, 2026</h3>
              <ol className="flex flex-col gap-4">
                <li className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-500 font-bold shrink-0">1.</span>
                  <span>You moved from <strong>
#5 to #3</strong> for &ldquo;barbershop near me Austin&rdquo; this week &mdash; keep it up.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-amber-500 font-bold shrink-0">2.</span>
                  <span>Your Yelp address says &ldquo;1204 South Congress&rdquo; but Google shows &ldquo;1204 S Congress Ave&rdquo; &mdash; fix the Yelp listing to match exactly.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-400">
                  <span className="font-bold shrink-0">3.</span>
                  <span>ChatGPT mentioned 3 of your competitors when asked for Austin barbershops. <span className="text-emerald-600 dark:text-emerald-400 font-medium">Upgrade to Pro</span> to see the full AI visibility report.</span>
                </li>
              </ol>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <AnimateOnScroll className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Simple, honest pricing</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">No setup fees. No annual lock-in. Cancel any time.</p>
          </AnimateOnScroll>
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {[
              {
                name: 'Free',
                price: '$0',
                desc: 'Get started tracking your local SEO with no commitment.',
                features: ['3 keywords tracked', 'Google Maps rank tracking', '2 AI engines (Perplexity + Google AI)', 'Citation health scan', 'Weekly digest'],
                cta: 'Get started free',
                href: '/setup',
                hl: false,
                badge: undefined,
              },
              {
                name: 'Starter',
                price: '$19',
                desc: 'More keywords, more AI engines, and basic reporting.',
                features: ['10 keywords tracked', 'Everything in Free', '3 AI engines (+ Claude)', 'Competitor snapshot', 'Basic reports'],
                cta: 'Start free trial',
                href: '/setup',
                hl: true,
                badge: 'Most Popular',
              },
              {
                name: 'Pro',
                price: '$49',
                desc: 'The full picture — unlimited tracking and all AI engines.',
                features: ['Unlimited keywords', 'Everything in Starter', 'All 5 AI engines (+ ChatGPT + Bing)', 'Growth Advisor (AI action plan)', 'Priority support'],
                cta: 'Start free trial',
                href: '/setup',
                hl: false,
                badge: undefined,
              },
            ].map((plan, i) => (
              <AnimateOnScroll key={plan.name} stagger={(i + 1) as 1 | 2 | 3} className="h-full">
                <PricingCard
                  name={plan.name}
                  price={plan.price}
                  description={plan.desc}
                  features={plan.features}
                  cta={plan.cta}
                  ctaHref={plan.href}
                  highlighted={plan.hl && currentPlanKey !== plan.name.toLowerCase()}
                  badge={plan.badge}
                  current={currentPlanKey === plan.name.toLowerCase()}
                />
              </AnimateOnScroll>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8">Free plan available forever. Paid plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 py-12 px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="mb-1">
              <img src="/logoLight.svg" alt="SpottedHQ" className="block dark:hidden h-7 w-auto" />
              <img src="/logoDark.svg" alt="SpottedHQ" className="hidden dark:block h-7 w-auto" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Local SEO + AI visibility for real businesses.</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Demo</Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">&copy; 2026 SpottedHQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
