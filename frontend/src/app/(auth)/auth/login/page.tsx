'use client';

import { useState } from 'react';
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
  
  // Google Sign-In simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        window.location.href = `/api/auth/callback?session_token=${data.session_token}`;
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
        window.location.href = `/api/auth/callback?session_token=${data.session_token}`;
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
        className="hidden lg:flex flex-col justify-between w-[45%] bg-[#0a0a0a] text-white p-12 relative overflow-hidden"
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
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600 opacity-[0.18] rounded-full blur-[100px]"
            animate={{ 
              x: [0, 50, 0], 
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-indigo-500 opacity-[0.15] rounded-full blur-[100px]"
            animate={{ 
              x: [0, -40, 0], 
              y: [0, 40, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        
        <Link href="/" className="relative flex items-center gap-2.5 z-10 hover:opacity-85 transition-opacity max-w-fit">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <RivalscopeLogo size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Rivalscope
          </span>
        </Link>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">
            Intelligence platform
          </p>
          <h2 className="text-[2.2rem] font-bold leading-tight tracking-tight mb-5 text-white">
            Know what changed
            <br />
            before your customers do.
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
            Continuous automated competitive intelligence. Track adjustments, tags, and reviews, then respond instantly with custom AI assets.
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
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/20 font-mono">
          © {new Date().getFullYear()} Rivalscope. All rights reserved.
        </p>
      </div>

      {/* Right panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fafafa]">
        <div className="w-full max-w-[360px]">
          
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8 hover:opacity-85 transition-opacity max-w-fit">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <RivalscopeLogo size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
              Rivalscope
            </span>
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 size={24}  className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-semibold text-[#0a0a0a] mb-2 tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-[#737373] leading-relaxed">
                We sent a secure magic link to{' '}
                <span className="font-medium text-[#0a0a0a]">{email}</span>.
                Click the link in your inbox to continue.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
              >
                Use a different account method
              </button>
            </div>
          ) : (
            <>
              {/* Back to Home Navigation Link */}
              <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 font-semibold mb-6 transition-colors group">
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                <span>Back to home</span>
              </Link>

              <h1 className="text-2xl font-bold text-[#0a0a0a] mb-1 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-[#737373] mb-6">
                Access your competitor command center.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              {/* Instant Gmail Sign-In Button */}
              <motion.button
                onClick={() => setShowGoogleModal(true)}
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 bg-white border border-[#e5e5e5] text-zinc-700 text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 shadow-sm transition-all cursor-pointer mb-5"
              >
                <Chrome size={18}  className="text-red-500" />
                <span>Continue with Google / Gmail</span>
              </motion.button>

              <div className="flex items-center gap-3 mb-5">
                <div className="h-px bg-[#e5e5e5] flex-1" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">or use email</span>
                <div className="h-px bg-[#e5e5e5] flex-1" />
              </div>

              {/* Login Method Toggle Tab */}
              <div className="flex bg-[#f4f4f5] border border-[#e5e5e5] p-1 rounded-lg mb-5 gap-1">
                <button
                  type="button"
                  onClick={() => setAuthMethod('direct')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
                    authMethod === 'direct'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Direct Access
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('magic')}
                  className={`flex-1 text-xs py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
                    authMethod === 'magic'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {/* Direct Password Login / Signup form */}
              {authMethod === 'direct' ? (
                <form onSubmit={handleDirectLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-[#525252] mb-1 uppercase tracking-wider"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none"
                      />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-white border border-[#e5e5e5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-[#525252] mb-1 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none"
                      />
                      <input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-[#e5e5e5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.015, boxShadow: '0 4px 20px rgba(10,10,10,0.15)' }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-[#1f1f23] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Enter command center'}
                    {!loading && <ArrowRight size={13}  />}
                  </motion.button>

                  <p className="text-[10px] text-center text-[#a3a3a3] leading-relaxed">
                    First-time entering? Choosing a new email instantly registers your account automatically.
                  </p>
                </form>
              ) : (
                /* Magic Link Form */
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label
                      htmlFor="magic-email"
                      className="block text-xs font-semibold text-[#525252] mb-1 uppercase tracking-wider"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] pointer-events-none"
                      />
                      <input
                        id="magic-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-white border border-[#e5e5e5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.015, boxShadow: '0 4px 20px rgba(10,10,10,0.15)' }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-[#1f1f23] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? 'Sending link...' : 'Continue with link'}
                    {!loading && <ArrowRight size={13}  />}
                  </motion.button>

                  <p className="text-[10px] text-center text-[#a3a3a3] leading-relaxed">
                    We will send you a one-time sign-in link to click in your inbox.
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[380px] p-6 shadow-2xl text-left border border-zinc-200"
            >
              {/* Google Header */}
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100">
                <Chrome size={22}  className="text-blue-500" />
                <span className="text-sm font-bold text-zinc-800">Sign in with Google</span>
              </div>

              <h3 className="text-base font-semibold text-zinc-900 mb-1">Choose an account</h3>
              <p className="text-xs text-zinc-500 mb-5">to continue to Rivalscope</p>

              {/* Fast selector buttons */}
              <div className="space-y-2 mb-5">
                {[
                  { name: 'Demo Founder', email: 'demo.founder@gmail.com' },
                  { name: 'Active Investor', email: 'active.investor@gmail.com' },
                ].map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleGoogleLogin(account.email)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 text-left transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                      {account.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-800">{account.name}</div>
                      <div className="text-[10px] text-zinc-500">{account.email}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Text input option for custom Gmail */}
              <div className="space-y-3 pt-3 border-t border-zinc-100">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Or enter another Gmail:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    onClick={() => {
                      if (googleEmail.includes('@')) {
                        handleGoogleLogin(googleEmail);
                      }
                    }}
                    className="px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
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
