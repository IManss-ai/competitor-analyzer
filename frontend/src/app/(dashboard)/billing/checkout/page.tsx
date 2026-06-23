import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';

// Entry point for "Start free trial" / upgrade CTAs (the auth callback routes
// plan-signups here). It mints a Polar hosted-checkout session and redirects to
// it. While billing is still being wired up (Polar unconfigured/unavailable),
// the checkout-url call fails — we catch it and show a graceful "almost ready"
// screen instead of dead-ending new signups on a 404.
export default async function BillingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);

  if (!session.user) {
    redirect('/auth/login');
  }

  const { plan: planParam } = await searchParams;
  const plan: 'saas' | 'local' = planParam === 'local' ? 'local' : 'saas';

  // redirect() throws to perform the redirect, so it must live OUTSIDE the
  // try/catch — otherwise the success path would be swallowed as an error.
  let checkoutUrl: string | null = null;
  try {
    const api = createApiClient(session.user.user_id);
    const { url } = await api.getCheckoutUrl(plan);
    if (url) checkoutUrl = url;
  } catch {
    checkoutUrl = null;
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="rs-card p-10 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-full flex items-center justify-center mb-6">
          <Clock size={32} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          Checkout is almost ready
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Your free trial is already active — you have full access to Rivalscope while we finish
          wiring up payments. We&apos;ll email you the moment paid plans go live; there&apos;s nothing
          you need to do right now.
        </p>
        <Link href="/dashboard" className="rs-btn-primary w-full cursor-pointer">
          Go to your dashboard
          <ArrowRight size={16} />
        </Link>

        <p className="mt-5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          By upgrading you agree to our{' '}
          <Link href="/terms" className="underline" style={{ color: 'var(--accent-primary)' }}>Terms</Link>{' '}&amp;{' '}
          <Link href="/privacy" className="underline" style={{ color: 'var(--accent-primary)' }}>Privacy</Link>.
          Cancel anytime; access reverts to read-only on cancellation, and we don&apos;t refund partial billing periods.
        </p>
      </div>
    </div>
  );
}
