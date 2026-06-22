'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { motion } from 'motion/react';
import ThemeToggle from '@/components/theme-toggle';

// Plausible intel-ledger rows for the left panel — the product demonstrating
// itself. Static sample data, no live fetch on an unauthenticated page.
const LEDGER_ROWS = [
  { time: '09:41', tag: 'PRICING', tagClass: 'badge-pricing_change', text: 'Competitor raised Pro tier $29 → $39, annual plan buried' },
  { time: '09:12', tag: 'FEATURE', tagClass: 'badge-feature_add', text: 'New AI assistant shipped on competitor homepage' },
  { time: '08:55', tag: 'REVIEWS', tagClass: 'badge-review_trend', text: '11 new G2 complaints clustered on onboarding time' },
  { time: '08:30', tag: 'HIRING', tagClass: 'badge-minor_copy', text: '4 new sales roles opened — they are scaling outbound' },
  { time: '08:02', tag: 'POSITION', tagClass: 'badge-repositioning', text: 'Hero copy shifted from SMB to enterprise language' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<'saas' | 'local' | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p === 'saas' || p === 'local') setPlan(p);
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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-[100dvh] flex relative" style={{ background: 'var(--surface-base)' }}>

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* ── Left: the briefing panel — the product demonstrating itself ── */}
      <div
        className="hidden lg:flex flex-col w-[46%] relative"
        style={{ background: 'var(--surface-raised)', borderRight: '1px solid var(--border-default)' }}
      >
        <div className="flex flex-col h-full p-12 xl:p-16">

          {/* Masthead */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity max-w-fit">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{ background: 'var(--accent-primary)' }}
            >
              <RivalscopeLogo size={13} className="text-[var(--accent-text)]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Rivalscope
            </span>
          </Link>

          {/* Dateline rule */}
          <div
            className="flex items-baseline justify-between mt-10 pb-2"
            style={{ borderBottom: '2px solid var(--text-primary)' }}
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
              Competitive intelligence desk
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{today}</span>
          </div>

          {/* Headline */}
          <h2
            className="mt-8 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Know what changed
            <br />
            before your
            <br />
            customers do.
          </h2>
          <p className="mt-5 text-[13px] leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            Rivalscope watches your competitors&apos; pages, pricing, reviews, and hiring —
            and turns every move into a plan you can execute.
          </p>

          {/* Live ledger — staggered terminal feed */}
          <div className="mt-10 flex-1 min-h-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-muted)' }}>
              Detected this morning
            </p>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.3 } } }}
              style={{ borderTop: '1px solid var(--border-default)' }}
            >
              {LEDGER_ROWS.map((row) => (
                <motion.div
                  key={row.time}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
                  }}
                  className="flex items-baseline gap-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-[10px] font-mono shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {row.time}
                  </span>
                  <span className={`badge ${row.tagClass} text-[9px] shrink-0`}>{row.tag}</span>
                  <span className="text-[12px] leading-snug truncate" style={{ color: 'var(--text-secondary)' }}>
                    {row.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom stat strip */}
          <div
            className="grid grid-cols-3 pt-5 mt-8"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            {[
              ['24/7', 'monitoring'],
              ['76+', 'apps indexed'],
              ['<24h', 'to action plan'],
            ].map(([num, label]) => (
              <div key={label}>
                <p className="text-[18px] font-mono font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{num}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: access form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">

          {/* Mobile masthead */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10 hover:opacity-85 transition-opacity max-w-fit">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
              <RivalscopeLogo size={13} className="text-[var(--accent-text)]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Rivalscope</span>
          </Link>

          <p className="text-[10px] font-mono uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Access
          </p>
          <h1
            className="text-[26px] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            Sign in to your desk
          </h1>
          <p className="text-[13px] mt-2 mb-7" style={{ color: 'var(--text-secondary)' }}>
            New here? Your account is created on first sign-in — no separate signup.
          </p>

          {plan && (
            <div
              className="mb-5 px-3.5 py-2.5 flex items-center gap-2.5"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
            >
              <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5"
                    style={{ background: 'var(--accent-cta)', color: 'var(--accent-text)' }}>
                Plan
              </span>
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {plan === 'local' ? 'Local Business — $19/mo' : 'SaaS Starter — $49/mo'}
              </span>
              <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                checkout after sign-in
              </span>
            </div>
          )}

          {error && (
            <div
              className="mb-5 px-3.5 py-2.5 text-[12px] font-medium"
              style={{
                background: 'color-mix(in srgb, var(--tone-danger) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--tone-danger) 28%, transparent)',
                color: 'var(--tone-danger)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="rs-label block mb-1.5">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="rs-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="rs-label block mb-1.5">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="rs-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rs-btn-primary w-full py-2.5 text-[13px] mt-1"
            >
              {loading ? 'Authenticating…' : 'Sign in'}
              {!loading && <ArrowRight size={13} />}
            </button>
          </form>

          <div className="mt-8 pt-5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href="/"
              className="text-[11px] font-mono inline-flex items-center gap-1.5 group"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
              Back to home
            </Link>
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} Rivalscope
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
