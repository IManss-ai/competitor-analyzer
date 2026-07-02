'use client';

import Link from 'next/link';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-6 font-sans">
      <div className="max-w-prose mx-auto">
        {/* Back Link */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 bg-primary/10 border border-primary/25 flex items-center justify-center rounded">
              <RivalscopeLogo size={13} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground font-mono tracking-tight">RIVALSCOPE</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">Terms of Service</h1>
          <p className="text-xs text-muted-foreground font-mono mt-2">Last updated: June 7, 2026</p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By signing up for a Rivalscope account, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must not access or use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Scope of Service</h2>
            <p>
              Rivalscope provides public-facing competitor crawling, review scraping, change classification, and response playbook drafting. We do not provide or warrant credential-level tracking. Our fetchers operate strictly on publicly accessible interfaces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Acceptable Use Policy</h2>
            <p>
              You agree to use the intel, data, and playbook scripts provided by Rivalscope strictly for legitimate commercial sales, marketing, and corporate intelligence purposes. You agree not to overload our indexing fetchers or attempt to scrape Rivalscope systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Subscriptions & Billing</h2>
            <p>
              We process subscription billing via secure, third-party payment gateways. Refunds and cancelations are governed by the specific tier and terms agreed during subscription signup.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>
              Rivalscope scans and playbooks are generated using automated algorithms and large language models. We do not warrant the absolute accuracy of classified changes or generated scripts. Rivalscope is provided &quot;as is&quot; with no warranty for specific outcomes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
