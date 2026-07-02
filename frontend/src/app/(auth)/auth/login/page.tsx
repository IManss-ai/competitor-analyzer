'use client';

import { useEffect, useState } from 'react';
import { useMounted } from '@/lib/use-mounted';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { motion } from 'motion/react';
import ThemeToggle from '@/components/theme-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Plausible intel-ledger rows for the left panel — the product demonstrating
// itself. Static sample data, no live fetch on an unauthenticated page.
const LEDGER_ROWS = [
  { time: '09:41', tag: 'PRICING', tagClass: 'badge-pricing_change', text: 'Competitor raised Pro tier $29 → $39, annual plan buried' },
  { time: '09:12', tag: 'FEATURE', tagClass: 'badge-feature_add', text: 'New AI assistant shipped on competitor homepage' },
  { time: '08:55', tag: 'REVIEWS', tagClass: 'badge-review_trend', text: '11 new G2 complaints clustered on onboarding time' },
  { time: '08:30', tag: 'HIRING', tagClass: 'badge-minor_copy', text: '4 new sales roles opened — they are scaling outbound' },
  { time: '08:02', tag: 'POSITION', tagClass: 'badge-repositioning', text: 'Hero copy shifted from SMB to enterprise language' },
];

// Friendly copy for the ?error= codes the auth callback/verify routes redirect
// here with. Session tokens expire after 5 minutes, so invalid_token usually
// means a stale sign-in handoff — recovery is simply signing in again.
const URL_ERROR_COPY: Record<string, string> = {
  missing_token: 'That sign-in link looks incomplete. Sign in with your email and password below.',
  invalid_token: 'Your sign-in link expired or was already used. Please sign in again below.',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<'saas' | 'local' | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plan');
    if (p === 'saas' || p === 'local') setPlan(p);
    const errCode = params.get('error');
    if (errCode) {
      setError(URL_ERROR_COPY[errCode] ?? 'Something went wrong signing you in. Please try again.');
      // Strip the param so refresh/back/shared URLs don't re-show a stale error.
      params.delete('error');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
    }
  }, []);

  const callbackBase = plan
    ? `/api/auth/callback?plan=${plan}&session_token=`
    : `/api/auth/callback?session_token=`;

  // Email + password sign-in / instant sign-up
  const handleDirectLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Read straight from the DOM inputs, falling back to React state. Browser
    // password-manager autofill (and programmatic fills) set input.value without
    // firing React's onChange, which left controlled state empty and submitted
    // blank credentials — landing the user back on the login page.
    const form = e.currentTarget;
    const fd = new FormData(form);
    const emailVal = ((fd.get('email') as string) || email || '').trim();
    const passwordVal = (fd.get('password') as string) || password || '';

    if (!emailVal || !passwordVal) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/direct-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });
      const data = await res.json();

      if (res.ok && data.session_token) {
        window.location.href = `${callbackBase}${data.session_token}`;
      } else {
        setError(data.detail || 'Failed to authenticate. Please check your credentials.');
      }
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Gate the clock/locale-derived label behind mount so the SSR HTML matches
  // the first client render (server is UTC, browser is local → React #418).
  const mounted = useMounted();
  const today = mounted ? new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }) : '';

  return (
    <div className="min-h-[100dvh] flex relative bg-background">

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── Left: the briefing panel — the product demonstrating itself ── */}
      <div className="hidden lg:flex flex-col w-[46%] relative bg-card border-r border-border">
        <div className="flex flex-col h-full p-12 xl:p-16">

          {/* Masthead */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity max-w-fit">
            <div className="w-7 h-7 flex items-center justify-center rounded bg-primary">
              <RivalscopeLogo size={13} className="text-primary-foreground" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              Rivalscope
            </span>
          </Link>

          {/* Dateline rule */}
          <div className="flex items-baseline justify-between mt-10 pb-2 border-b-2 border-foreground">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Competitive intelligence desk
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">{today}</span>
          </div>

          {/* Headline */}
          <h2 className="mt-8 text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
            Know what changed
            <br />
            before your
            <br />
            customers do.
          </h2>
          <p className="mt-5 text-[13px] leading-relaxed max-w-sm text-muted-foreground">
            Rivalscope watches your competitors&apos; pages, pricing, reviews, and hiring —
            and turns every move into a plan you can execute.
          </p>

          {/* Live ledger — staggered terminal feed */}
          <div className="mt-10 flex-1 min-h-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3 text-muted-foreground">
              Detected this morning
            </p>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } } }}
              className="border-t border-border"
            >
              {LEDGER_ROWS.map((row) => (
                <motion.div
                  key={row.time}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
                  }}
                  className="flex items-baseline gap-3 py-3 border-b border-border"
                >
                  <span className="text-[10px] font-mono shrink-0 tabular-nums text-muted-foreground">
                    {row.time}
                  </span>
                  <span className={`badge ${row.tagClass} text-[9px] shrink-0`}>{row.tag}</span>
                  <span className="text-[12px] leading-snug truncate text-muted-foreground">
                    {row.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom stat strip */}
          <div className="grid grid-cols-3 pt-5 mt-8 border-t border-border">
            {[
              ['24/7', 'monitoring'],
              ['76+', 'apps indexed'],
              ['<24h', 'to action plan'],
            ].map(([num, label]) => (
              <div key={label}>
                <p className="text-[18px] font-mono font-semibold tabular-nums text-foreground">{num}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider mt-0.5 text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: access form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">

          {/* Mobile masthead */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-10 hover:opacity-85 transition-opacity max-w-fit">
            <div className="w-7 h-7 flex items-center justify-center rounded bg-primary">
              <RivalscopeLogo size={13} className="text-primary-foreground" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">Rivalscope</span>
          </Link>

          <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3 text-muted-foreground">
            Access
          </p>
          <h1 className="text-[26px] font-extrabold tracking-[-0.025em] leading-tight text-foreground">
            Sign in to your desk
          </h1>
          <p className="text-[13px] mt-2 mb-7 text-muted-foreground">
            New here? Your account is created on first sign-in — no separate signup.
          </p>

          {plan && (
            <div className="mb-5 px-4 py-3 flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/30">
              <Badge variant="default" className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2">
                Plan
              </Badge>
              <span className="text-[12px] font-medium text-foreground">
                {plan === 'local' ? 'Local Business — $19/mo' : 'SaaS Starter — $49/mo'}
              </span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                checkout after sign-in
              </span>
            </div>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 text-[12px] font-medium rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleDirectLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 text-[13px] mt-1"
                  size="lg"
                >
                  {loading ? 'Authenticating…' : 'Sign in'}
                  {!loading && <ArrowRight size={13} />}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 pt-5 flex items-center justify-between border-t border-border">
            <Link
              href="/"
              className="text-[11px] font-mono inline-flex items-center gap-2 group text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
              Back to home
            </Link>
            <span className="text-[11px] font-mono text-muted-foreground">
              © {new Date().getFullYear()} Rivalscope
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
