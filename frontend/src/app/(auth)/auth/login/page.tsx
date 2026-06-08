'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { Chrome } from '@/components/ui/brand-icons';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'direct' | 'magic'>('direct');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<'saas' | 'local' | null>(null);

  // Google Sign-In simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search).get('plan');
    if (p === 'saas' || p === 'local') setPlan(p);
  }, []);

  const callbackBase = plan
    ? `/api/auth/callback?plan=${plan}&session_token=`
    : `/api/auth/callback?session_token=`;

  // Handle direct login (Email + Password)
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
        // Exchange session token in Next.js and redirect
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

  // Handle Magic Link login
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please check your email and try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth callback exchange
  const handleGoogleLogin = async (selectedEmail: string) => {
    setLoading(true);
    setError('');
    setShowGoogleModal(false);
    
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail }),
      });
      const data = await res.json();
      
      if (res.ok && data.session_token) {
        window.location.replace(`${callbackBase}${data.session_token}`);
      } else {
        setError(data.detail || 'Google authentication failed.');
      }
    } catch {
      setError('Could not establish contact with Google login handler.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex relative">
      
      {/* Left panel - Pitch Deck Intro Info */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] text-white p-12 relative overflow-hidden"
        style={{ background: 'var(--surface-raised)', borderRight: '1px solid var(--border-default)' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Aurora Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ background: 'rgba(192, 82, 79,0.12)' }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: 'rgba(192, 82, 79,0.08)' }}
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
              'Instant Google/Gmail or credentials login',
            ].map((item) => (
              <motion.li 
                key={item} 
                className="flex items-center gap-2.5 text-sm text-white/50"
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

      {/* Right panel - Auth Forms */}
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

          {sent ? (
            <div className="text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <h1 className="text-lg font-semibold mb-2 tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Check your email
              </h1>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We sent a secure magic link to{' '}
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{email}</span>.
                Click the link in your inbox to continue.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-[13px] font-medium transition-colors cursor-pointer text-sky-400 hover:text-sky-300"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Back to Home Navigation Link */}
              <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-6 transition-colors group" style={{ color: 'var(--text-muted)' }}>
                <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
                <span>Back to home</span>
              </Link>

              <h1 className="text-[22px] font-semibold mb-1 tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Welcome back
              </h1>
              <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                Access your intelligence command center.
              </p>

              {plan && (
                <div
                  className="mb-5 px-3 py-2 rounded-lg flex items-center gap-2"
                  style={{
                    background: 'rgba(192, 82, 79,0.06)',
                    border: '1px solid rgba(192, 82, 79,0.20)',
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

              {/* Instant Gmail Sign-In Button */}
              <motion.button
                onClick={() => setShowGoogleModal(true)}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-2.5 text-[13px] font-semibold py-2.5 px-4 rounded-lg cursor-pointer mb-5 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Chrome size={16} className="text-red-400" />
                <span>Continue with Google</span>
              </motion.button>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>or email</span>
                <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
              </div>

              {/* Login Method Toggle Tab */}
              <div
                className="flex p-1 rounded-lg mb-5 gap-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-default)' }}
              >
                <button
                  type="button"
                  onClick={() => setAuthMethod('direct')}
                  className="flex-1 text-[12px] py-1.5 rounded-md font-semibold cursor-pointer transition-all"
                  style={
                    authMethod === 'direct'
                      ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('magic')}
                  className="flex-1 text-[12px] py-1.5 rounded-md font-semibold cursor-pointer transition-all"
                  style={
                    authMethod === 'magic'
                      ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  Magic Link
                </button>
              </div>

              {/* Direct Password Login / Signup form */}
              {authMethod === 'direct' ? (
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
              ) : (
                /* Magic Link Form */
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="magic-email" className="rs-label block mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                      <input
                        id="magic-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="rs-input pl-9"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rs-btn-primary w-full py-2.5 text-[13px]"
                  >
                    {loading ? 'Sending link…' : 'Send magic link'}
                    {!loading && <ArrowRight size={13} />}
                  </button>

                  <p className="text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    We&apos;ll send a one-time sign-in link to your inbox.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Simulated Premium Google Accounts Picker Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[380px] p-6 rounded-xl"
              style={{
                background: 'var(--surface-overlay)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <Chrome size={18} className="text-red-400" />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign in with Google</span>
              </div>

              <h3 className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Choose an account</h3>
              <p className="text-[12px] mb-4" style={{ color: 'var(--text-secondary)' }}>to continue to Rivalscope</p>

              <div className="space-y-2 mb-4">
                {[
                  { name: 'Demo Founder', email: 'demo.founder@gmail.com' },
                  { name: 'Active Investor', email: 'active.investor@gmail.com' },
                ].map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleGoogleLogin(account.email)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left cursor-pointer transition-all"
                    style={{ border: '1px solid var(--border-default)', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      {account.name[0]}
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{account.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{account.email}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                <label className="rs-label block">Or enter another Gmail:</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="rs-input flex-1 text-[12px]"
                  />
                  <button
                    onClick={() => { if (googleEmail.includes('@')) handleGoogleLogin(googleEmail); }}
                    className="rs-btn-primary px-3 text-[12px]"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-5 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="text-[12px] font-medium cursor-pointer transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
