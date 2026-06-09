'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { motion } from 'motion/react';
import ThemeToggle from '@/components/theme-toggle';

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
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/direct-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  return (
    <div className="min-h-[100dvh] flex relative">

      {/* Theme toggle — no topbar on this page, pin to a corner for unauthenticated users */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left panel - Pitch Deck Intro Info */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: 'var(--surface-raised)', borderRight: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Aurora Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ background: 'rgba(79, 124, 176,0.12)' }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(79, 124, 176,0.08)' }}
            animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <Link href="/" className="relative flex items-center gap-3 z-10 hover:opacity-80 transition-opacity max-w-fit">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
          >
            <RivalscopeLogo size={14} className="text-sky-400" />
          </div>
          <div className="leading-none">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Rival</span>
            <span className="text-[15px] font-bold tracking-tight text-sky-400">scope</span>
          </div>
        </Link>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Intelligence platform
          </p>
          <h2 className="text-[2rem] font-semibold leading-tight tracking-tight mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            Know what changed
            <br />
            before your customers do.
          </h2>
          <p className="text-[13px] leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            Automated competitive intelligence. Track pricing, features, and reviews — then respond with AI-drafted assets.
          </p>

          {/* Feature list */}
          <motion.ul
            className="mt-8 space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
          >
            {[
              'Tracks up to 7 competitor pages',
              'AI-generated response drafts and strategies',
              'Secure email and password sign-in',
            ].map((item) => (
              <motion.li
                key={item}
                className="flex items-center gap-2.5 text-sm"
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
                }}
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-primary)' }} />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Rivalscope. All rights reserved.
        </p>
      </div>

      {/* Right panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--surface-base)' }}>
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8 hover:opacity-85 transition-opacity max-w-fit">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
            >
              <RivalscopeLogo size={14} className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              <span style={{ color: 'var(--text-primary)' }}>Rival</span>
              <span className="text-sky-400">scope</span>
            </span>
          </Link>

          {/* Back to Home Navigation Link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-6 transition-colors group" style={{ color: 'var(--text-muted)' }}>
            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            <span>Back to home</span>
          </Link>

          <h1 className="text-[22px] font-semibold mb-1 tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Sign in or create your account
          </h1>
          <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>
            Access your intelligence command center.
          </p>

          {plan && (
            <div
              className="mb-5 px-3 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: 'rgba(79, 124, 176,0.06)',
                border: '1px solid rgba(79, 124, 176,0.20)',
              }}
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                Plan
              </span>
              <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                {plan === 'local' ? 'Local Business — $19/mo' : 'SaaS Starter — $49/mo'}
              </span>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Checkout after sign in
              </span>
            </div>
          )}

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-[12px] font-medium"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', color: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="rs-label block mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="rs-input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="rs-label block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rs-input pl-9"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rs-btn-primary w-full py-2.5 text-[13px]"
            >
              {loading ? 'Authenticating…' : 'Sign in'}
              {!loading && <ArrowRight size={13} />}
            </button>

            <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              New here? Signing in with a new email creates your account automatically.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
