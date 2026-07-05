import Link from 'next/link'
import Nav from '../components/nav'

export const metadata = {
  title: 'Support — SpottedHQ',
  description: 'Get help with SpottedHQ — billing, tracking setup, and frequently asked questions.',
}

const faqs = [
  {
    q: 'How do I cancel my subscription?',
    a: (
      <>
        Go to{' '}
        <Link href="/dashboard/settings" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Settings → Plan &amp; Billing
        </Link>{' '}
        and click &ldquo;Manage billing &amp; cancel subscription.&rdquo; You&apos;ll keep access until the end of your billing period, and you won&apos;t be charged again.
      </>
    ),
  },
  {
    q: 'How does the free trial work?',
    a: 'Paid plans start with a 14-day free trial — no credit card required. If you don’t add a payment method before the trial ends, your account simply moves back to the Free plan. Nothing is ever charged without a card on file.',
  },
  {
    q: 'When do my rankings update?',
    a: 'Scans run weekly. Your Monday digest summarizes what changed: Maps rank movement, AI engine mentions, and any citation issues found that week. You can also trigger a fresh scan any time from the dashboard.',
  },
  {
    q: 'Why does my Maps rank look different from what I see on Google?',
    a: 'Google personalizes results based on your exact location, search history, and device. We check rankings from a neutral location in your city, which reflects what a typical new customer sees — not what you see when searching for your own business.',
  },
  {
    q: 'What does "AI visibility" mean?',
    a: 'We ask ChatGPT, Perplexity, Google AI, Claude, and Bing Copilot the questions your customers ask (like “best barbershop near me in Austin”) and record whether they recommend your business. More people find businesses through AI assistants every month — this shows you where you stand.',
  },
  {
    q: 'How do I change my tracked keywords?',
    a: (
      <>
        Head to{' '}
        <Link href="/dashboard/settings" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Settings → Tracked Keywords
        </Link>
        . Changes save automatically and take effect on your next scan.
      </>
    ),
  },
  {
    q: 'How do I delete my account and data?',
    a: (
      <>
        Email us at{' '}
        <a href="mailto:hello@spottedhq.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          hello@spottedhq.com
        </a>{' '}
        and we&apos;ll delete your account and personal data within 30 days, as described in our{' '}
        <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Support</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-12">
          Stuck on something? We answer every email, usually within one business day.
        </p>

        {/* Contact card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-6 mb-14">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Email us</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Billing questions, bug reports, feature requests, or anything else — include the email you signed up with so we can find your account.
          </p>
          <a
            href="mailto:hello@spottedhq.com"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            hello@spottedhq.com
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Frequently asked questions</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none text-slate-900 dark:text-white font-semibold text-sm">
                {q}
                <svg
                  className="w-4 h-4 text-slate-400 shrink-0 ml-4 transition-transform group-open:rotate-180"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        <p className="mt-12 text-sm text-slate-500 dark:text-slate-400">
          Looking for our policies? Read the{' '}
          <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms of Service</Link>
          {' '}or{' '}
          <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  )
}
