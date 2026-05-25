import Link from 'next/link'
import Nav from '../components/nav'

export const metadata = {
  title: 'Terms of Service — SpottedHQ',
  description: 'The terms that govern your use of SpottedHQ.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-12">Last updated: May 25, 2026</p>

        <Section title="1. Acceptance">
          By creating an account or using SpottedHQ, you agree to these Terms of Service. If you do not agree, do not use the service.
        </Section>

        <Section title="2. Description of Service">
          SpottedHQ is a local SEO and AI visibility tracking platform. It tracks your Google Maps rankings, monitors whether AI engines (ChatGPT, Perplexity, Google AI, Claude, Bing Copilot) mention your business, scans directories for citation issues, monitors reviews, and delivers a plain-English weekly digest.
        </Section>

        <Section title="3. Account Responsibilities">
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must provide accurate business information. Entering false business data to manipulate results is prohibited.</li>
            <li>You may not share your account with others or use the service on behalf of multiple businesses under one account unless you have a plan that supports it.</li>
            <li>You must be at least 18 years old to use SpottedHQ.</li>
          </ul>
        </Section>

        <Section title="4. Plans and Payment">
          <SubSection title="Free plan">
            The Free plan is available at no cost and includes a limited feature set as described on our pricing page.
          </SubSection>
          <SubSection title="Paid plans">
            Paid plans (Starter at $19/mo, Pro at $49/mo) are billed monthly via Stripe. Your subscription renews automatically until cancelled.
          </SubSection>
          <SubSection title="Free trial">
            Paid plans include a 14-day free trial. No credit card is required to start the trial. You will only be charged if you add a payment method and continue past the trial period.
          </SubSection>
          <SubSection title="Cancellation and refunds">
            You may cancel at any time from your account settings. Cancellation takes effect at the end of your current billing period — you retain access until then. We do not offer prorated refunds for partial months.
          </SubSection>
          <SubSection title="Price changes">
            We may change pricing with 30 days&apos; notice. Continued use after the notice period constitutes acceptance of the new pricing.
          </SubSection>
        </Section>

        <Section title="5. Acceptable Use">
          You agree not to:
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mt-3">
            <li>Use SpottedHQ for any unlawful purpose</li>
            <li>Attempt to reverse-engineer, scrape, or copy any part of the service</li>
            <li>Use automated scripts to access the service beyond what is provided</li>
            <li>Interfere with or disrupt the infrastructure of SpottedHQ</li>
            <li>Resell or white-label the service without written permission</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          SpottedHQ and its content, features, and functionality are owned by SpottedHQ and are protected by copyright and other intellectual property laws. You retain ownership of the business data you provide. You grant us a limited license to use your data solely to operate and improve the service.
        </Section>

        <Section title="7. Third-Party Services">
          SpottedHQ relies on third-party APIs (Google, OpenAI, Anthropic, Perplexity, Yelp, SerpAPI, and others) to deliver data. We do not guarantee the accuracy or availability of data provided by these services. Rankings, AI mentions, and citation data reflect the state of those platforms at the time of the check and may change.
        </Section>

        <Section title="8. Disclaimer of Warranties">
          SpottedHQ is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no warranties, express or implied, including fitness for a particular purpose or that the service will be uninterrupted or error-free. We do not guarantee any specific improvement in your search rankings or AI visibility.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by law, SpottedHQ shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including lost profits or business opportunities. Our total liability for any claim is limited to the amount you paid us in the 3 months preceding the claim.
        </Section>

        <Section title="10. Termination">
          We may suspend or terminate your account if you violate these terms, with or without notice. You may delete your account at any time. Upon termination, your right to use the service ceases immediately.
        </Section>

        <Section title="11. Governing Law">
          These terms are governed by the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Travis County, Texas.
        </Section>

        <Section title="12. Changes to These Terms">
          We may update these terms from time to time. We will notify you of material changes by email or in-app notice at least 14 days before they take effect. Continued use of the service after that date constitutes acceptance.
        </Section>

        <Section title="13. Contact">
          Questions about these terms? Email us at{' '}
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
