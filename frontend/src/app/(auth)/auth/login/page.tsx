'use client';

import { useState } from 'react';
import {
  Crosshair,
  EnvelopeSimple,
  ArrowRight,
  CheckCircle,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel */}
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
        <div className="relative flex items-center gap-2.5 z-10">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Crosshair size={14} weight="bold" className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Competitor Analyzer
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">
            Intelligence platform
          </p>
          <h2 className="text-[2rem] font-semibold leading-tight tracking-tight mb-5 text-white">
            Know what changed
            <br />
            before your customers do.
          </h2>
          <p className="text-[#737373] text-sm leading-relaxed max-w-sm">
            Weekly AI-powered monitoring across your competitive landscape.
            Pricing shifts, feature launches, messaging changes - all surfaced
            as ready-to-use action assets.
          </p>

          {/* Feature list */}
          <motion.ul 
            className="mt-8 space-y-2.5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
          >
            {[
              'Tracks up to 7 competitor websites',
              'AI-generated action drafts per change',
              'Monday morning digest in your inbox',
            ].map((item) => (
              <motion.li 
                key={item} 
                className="flex items-center gap-2.5 text-sm text-white/50"
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
                }}
              >
                <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/20 font-mono">
          © {new Date().getFullYear()} Competitor Analyzer
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fafafa]">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Crosshair size={14} weight="bold" className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
              Competitor Analyzer
            </span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={24} weight="fill" className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-semibold text-[#0a0a0a] mb-2 tracking-tight">
                Check your email
              </h1>
              <p className="text-sm text-[#737373] leading-relaxed">
                We sent a sign-in link to{' '}
                <span className="font-medium text-[#0a0a0a]">{email}</span>.
                Click the link to continue.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-[#0a0a0a] mb-1.5 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-[#737373] mb-8">
                Enter your email to receive a sign-in link.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-[#525252] mb-1.5 uppercase tracking-wide"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
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
                      className="w-full bg-white border border-[#e5e5e5] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    />
                  </div>
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(10,10,10,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-[#1a1a1a] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Sending...' : 'Continue with email'}
                  {!loading && <ArrowRight size={14} weight="bold" />}
                </motion.button>
              </form>

              <p className="mt-6 text-[11px] text-center text-[#a3a3a3]">
                No password required. We&apos;ll email you a secure link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
