import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Entry point for "Start free" / upgrade CTAs (the auth callback routes
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
  } catch (e) {
    unstable_rethrow(e); // never swallow NEXT_REDIRECT (e.g. the 401 → login redirect)
    checkoutUrl = null;
  }

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="flex flex-col items-center pt-8 pb-8 gap-6">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Clock size={28} className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Checkout is almost ready
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have full access to Rivalscope right now while we finish wiring up
              payments. We&apos;ll email you the moment paid plans go live; there&apos;s nothing
              you need to do right now.
            </p>
          </div>
          <Button asChild size="lg" className="w-full gap-2">
            <Link href="/dashboard">
              Go to your dashboard
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
