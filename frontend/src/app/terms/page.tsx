'use client';

import Link from 'next/link';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] py-16 px-6 font-sans">
      <div className="max-w-prose mx-auto">
        {/* Back Link */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded">
              <RivalscopeLogo size={13} className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] font-mono tracking-tight">RIVALSCOPE</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">Terms of Service</h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-2">Last updated: June 7, 2026</p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">1. Acceptance of Terms</h2>
            <p>
              By signing up for a Rivalscope account, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must not access or use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">2. Scope of Service</h2>
            <p>
              Rivalscope provides public-facing competitor crawling, review scraping, change classification, and response playbook drafting. We do not provide or warrant credential-level tracking. Our fetchers operate strictly on publicly accessible interfaces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">3. Acceptable Use Policy</h2>
            <p>
              You agree to use the intel, data, and playbook scripts provided by Rivalscope strictly for legitimate commercial sales, marketing, and corporate intelligence purposes. You agree not to overload our indexing fetchers or attempt to scrape Rivalscope systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">4. Subscriptions & Billing</h2>
            <p>
              Paid plans are billed in advance on a recurring monthly basis through our payment processor (Polar). Your subscription renews automatically each period until you cancel. After the free trial ends, accounts without an active paid subscription move to a read-only state: scheduled scans are paused and write actions (adding competitors, running scans, generating battle cards, approving actions) are disabled until you upgrade.
            </p>
          </section>

          <section className="space-y-3" id="refunds">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">5. Refunds & Cancellation</h2>
            <p>
              You can cancel anytime from the customer portal (Settings → Billing → Manage subscription). Cancellation stops future renewals; you keep paid access until the end of the billing period you have already paid for, after which your account reverts to the read-only state described above. Your data is retained — upgrading again restores full access.
            </p>
            <p>
              We do not issue refunds for partial billing periods or for unused time on an active subscription. If you were charged in error or believe there is a billing problem, email <a href="mailto:support@rivalscope.dev" className="text-sky-400 hover:text-sky-300 transition-colors">support@rivalscope.dev</a> and we&apos;ll make it right.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">6. Limitation of Liability</h2>
            <p>
              Rivalscope scans and playbooks are generated using automated algorithms and large language models. We do not warrant the absolute accuracy of classified changes or generated scripts. Rivalscope is provided &quot;as is&quot; with no warranty for specific outcomes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
