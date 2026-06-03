'use client';

import { useState } from 'react';
import { Activity, Mail, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-zinc-950 text-white p-12">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6" />
          <span className="font-heading font-bold text-lg">Competitor Analyzer</span>
        </div>
        <div>
          <h2 className="text-3xl font-heading font-bold leading-tight mb-4">
            Know what your competitors<br />changed — before your customers do.
          </h2>
          <p className="text-zinc-400 text-sm max-w-md">
            AI-powered monitoring that catches pricing changes, feature launches,
            and messaging shifts across your competitive landscape.
          </p>
        </div>
        <p className="text-zinc-600 text-xs">© {new Date().getFullYear()} Competitor Analyzer</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Activity className="w-5 h-5 text-zinc-900" />
            <span className="font-heading font-bold text-zinc-900">Competitor Analyzer</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-xl font-heading font-bold text-zinc-900 mb-2">Check your email</h1>
              <p className="text-sm text-zinc-500">
                We sent a login link to <strong className="text-zinc-700">{email}</strong>.
                Click the link to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-heading font-bold text-zinc-900 mb-1">Welcome back</h1>
              <p className="text-sm text-zinc-500 mb-8">Enter your email to receive a sign-in link.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send login link'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
