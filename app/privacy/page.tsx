import Link from 'next/link'
import Nav from '../components/nav'

export const metadata = {
  title: 'Privacy Policy — SpottedHQ',
  description: 'How SpottedHQ collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-12">Last updated: May 25, 2026</p>

        <Section title="1. Overview">
          SpottedHQ (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the SpottedHQ platform, which helps local business owners track their Google Maps ranking, AI visibility, and citation health. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.
        </Section>

        <Section title="2. Information We Collect">
          <SubSection title="Account information">
            When you create an account, we collect your name, email address, and password (stored securely via Supabase Auth).
          </SubSection>
          <SubSection title="Business information">
            To set up tracking, you provide your business name, type, city, state, and optionally your Google Business Profile URL. We use this to run ranking and citation checks on your behalf.
          </SubSection>
          <SubSection title="Keywords">
            We store the keywords you choose to track for Google Maps rankings.
          </SubSection>
          <SubSection title="Usage data">
            We collect anonymized usage data (pages visited, features used) via Mixpanel to understand how the product is used and improve it. This data is linked to your account ID but never sold.
          </SubSection>
          <SubSection title="Payment information">
            Payments are processed by Stripe. We never see or store your full credit card number — only a subscription status and last-4 digits provided by Stripe.
          </SubSection>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
            <li>To run your Google Maps rank checks, AI visibility checks, and citation scans</li>
            <li>To send your weekly email digest every Monday</li>
            <li>To notify you of new reviews and provide AI-drafted response suggestions</li>
            <li>To process payments and manage your subscription</li>
            <li>To improve the product based on how it&apos;s used</li>
            <li>To respond to support requests</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Services">
          We use the following third-party services to operate SpottedHQ:
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mt-3">
            <li><strong className="text-slate-700 dark:text-slate-300">Supabase</strong> — database and authentication</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Stripe</strong> — payment processing</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Mixpanel</strong> — product analytics</li>
            <li><strong className="text-slate-700 dark:text-slate-300">SerpAPI</strong> — Google Maps ranking data and citation checks</li>
            <li><strong className="text-slate-700 dark:text-slate-300">OpenAI</strong> — ChatGPT AI visibility checks</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Anthropic</strong> — Claude AI visibility checks</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Perplexity</strong> — Perplexity AI visibility checks</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Yelp</strong> — review syncing via the Yelp Fusion API</li>
          </ul>
          <p className="mt-3 text-slate-600 dark:text-slate-400">Each of these services has its own privacy policy. We only share the minimum data necessary for each service to function.</p>
        </Section>

        <Section title="5. Data Retention">
          We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it by law (e.g., billing records).
        </Section>

        <Section title="6. Your Rights">
          You have the right to:
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mt-3">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of marketing emails at any time via the unsubscribe link</li>
          </ul>
          <p className="mt-3 text-slate-600 dark:text-slate-400">To exercise any of these rights, email us at <a href="mailto:hello@spottedhq.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">hello@spottedhq.com</a>.</p>
        </Section>

        <Section title="7. Cookies">
          We use a session cookie for authentication (managed by Supabase) and localStorage for your theme preference. We do not use advertising cookies or sell data to ad networks.
        </Section>

        <Section title="8. Children">
          SpottedHQ is not directed at children under 13. We do not knowingly collect data from anyone under 13.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this policy from time to time. We will notify you of significant changes by email or by a notice in the app. Continued use of SpottedHQ after changes constitutes acceptance.
        </Section>

        <Section title="10. Contact">
          Questions about this policy? Email us at{' '}
          <a href="mailto:hello@spottedhq.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">hello@spottedhq.com</a>.
        </Section>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
          <Link href="/" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">&larr; Back to SpottedHQ</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      <p>{children}</p>
    </div>
  )
}
