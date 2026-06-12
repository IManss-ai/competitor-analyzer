'use client';

import Link from 'next/link';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded">
              <RivalscopeLogo size={13} className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] font-mono tracking-tight">RIVALSCOPE</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">Privacy Policy</h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-2">Last updated: June 7, 2026</p>
        </header>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">1. Information We Collect</h2>
            <p>
              We collect competitor URLs that you explicitly add to your watchlist. In addition, we collect your account registration details (email address) and subscription checkout details. We do not require or collect credential access, API keys, or database integrations for the competitors you watch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">2. How We Use Information</h2>
            <p>
              We use the competitor URLs you provide to monitor their public landing pages, pricing grids, changelogs, and public review profiles (e.g. G2, Trustpilot). This data is processed by our secure classification models to build weekly competitor intel summaries and action playbooks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">3. Cookies and Analytics</h2>
            <p>
              We use secure, first-party session cookies to manage user authentication and maintain login states. We do not sell user data to advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">4. Data Security</h2>
            <p>
              Your monitored competitor watchlists and user data are stored on secure cloud databases protected by transport layer security (TLS) and AES-256 encryption. Access is restricted to authenticated account owners.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">5. Contact Support</h2>
            <p>
              If you have any questions regarding this privacy policy or want to request account deletion, contact our support desk at{' '}
              <a href="mailto:support@rivalscope.com" className="text-sky-400 hover:underline">
                support@rivalscope.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
