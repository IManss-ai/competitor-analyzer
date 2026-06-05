'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Zap, CheckSquare, Star, Clock, ArrowRight, Loader2, Globe, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Plus, Compass, CheckCircle2, MapPin, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { DashboardData, Competitor } from '@/lib/types';

interface DashboardClientProps {
  userId: string;
  initialData: DashboardData;
  competitors: Competitor[];
  isLocalBusiness: boolean;
}

export default function DashboardClient({ userId, initialData, competitors, isLocalBusiness }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [activityDays, setActivityDays] = useState<{ date: string; change_count: number; scan_count: number }[]>([]);
  const [feedEvents, setFeedEvents] = useState<any[]>(initialData.events.slice(0, 20));
  const [feedOffset, setFeedOffset] = useState(20);
  const [hasMoreFeed, setHasMoreFeed] = useState(initialData.events.length > 20);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [scanningCompId, setScanningCompId] = useState<string | null>(null);
  const [scanDoneCompId, setScanDoneCompId] = useState<string | null>(null);

  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    return competitors.length === 0 ? -1 : 3;
  });
  const [selectedBusinessType, setSelectedBusinessType] = useState<'saas' | 'local'>(isLocalBusiness ? 'local' : 'saas');
  const [savingBusinessType, setSavingBusinessType] = useState(false);
  const [onboardingJobId, setOnboardingJobId] = useState<string | null>(null);
  const [onboardingCompId, setOnboardingCompId] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<string>('fetching');
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingG2Url, setOnboardingG2Url] = useState('');
  const [onboardingMapsUrl, setOnboardingMapsUrl] = useState('');
  const [onboardingInstagram, setOnboardingInstagram] = useState('');
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch 28-day activity
  useEffect(() => {
    fetch(`${apiUrl}/api/v1/dashboard/activity`, {
      headers: { Authorization: `Bearer ${userId}` }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setActivityDays(data.days || []))
      .catch(() => {
        const dummyDays = Array.from({ length: 28 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (27 - i));
          return {
            date: d.toISOString().split('T')[0],
            change_count: 0,
            scan_count: 1
          };
        });
        setActivityDays(dummyDays);
      });
  }, [userId, apiUrl]);

  // Polling scan status for Onboarding Step 2
  useEffect(() => {
    if (onboardingStep !== 1 || !onboardingJobId) return;

    let intervalId: any;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/scan/status/${onboardingJobId}`);
        if (res.ok) {
          const data = await res.json();
          setOnboardingStatus(data.status);
          if (data.status === 'done') {
            clearInterval(intervalId);
            setOnboardingStep(2);
            // Re-fetch dashboard data to update the background counts
            const dbRes = await fetch(`${apiUrl}/api/v1/dashboard`, {
              headers: { Authorization: `Bearer ${userId}` }
            });
            if (dbRes.ok) {
              const freshData = await dbRes.json();
              setDashboardData(freshData);
              setFeedEvents(freshData.events.slice(0, 20));
            }
          } else if (data.status === 'error') {
            clearInterval(intervalId);
            setOnboardingStep(2); // Still move to Step 3 so they see error and can proceed
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [onboardingStep, onboardingJobId, userId, apiUrl]);

  // Business type selection handler
  const confirmBusinessType = async (type: 'saas' | 'local') => {
    setSelectedBusinessType(type);
    setSavingBusinessType(true);
    try {
      await fetch(`${apiUrl}/api/v1/onboarding/business-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` },
        body: JSON.stringify({ business_type: type })
      });
    } catch (_) {}
    setSavingBusinessType(false);
    setOnboardingStep(0);
  };

  // Submit onboarding competitor form
  const submitOnboardingCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingUrl.trim()) return;
    setSubmittingOnboarding(true);
    setOnboardingError('');

    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`
        },
        body: JSON.stringify({
          url: onboardingUrl,
          name: onboardingName,
          g2_url: onboardingG2Url
        })
      });

      if (!res.ok) {
        throw new Error("Could not add competitor");
      }

      const data = await res.json();
      setOnboardingCompId(data.id);
      setOnboardingJobId(data.job_id);

      // If local business, PATCH the local-specific fields
      if (selectedBusinessType === 'local' && (onboardingMapsUrl || onboardingInstagram)) {
        await fetch(`${apiUrl}/api/v1/local/competitors/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` },
          body: JSON.stringify({
            google_maps_url: onboardingMapsUrl || null,
            instagram_handle: onboardingInstagram || null,
            business_type: 'local'
          })
        }).catch(() => {});
      }

      setOnboardingStep(1); // Move to scanning
    } catch (err: any) {
      setOnboardingError(err.message || 'An error occurred.');
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  // Load more feed events
  const loadMoreFeed = async () => {
    if (loadingFeed) return;
    setLoadingFeed(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/dashboard/feed?limit=20&offset=${feedOffset}`, {
        headers: { Authorization: `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        const newEvents = data.events || [];
        if (newEvents.length > 0) {
          setFeedEvents(prev => [...prev, ...newEvents]);
          setFeedOffset(prev => prev + 20);
          if (newEvents.length < 20) {
            setHasMoreFeed(false);
          }
        } else {
          setHasMoreFeed(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const scanNow = async (competitorId: string) => {
    if (scanningCompId) return;
    setScanningCompId(competitorId);
    try {
      const endpoint = isLocalBusiness 
        ? `${apiUrl}/api/v1/local/scan/${competitorId}`
        : `${apiUrl}/api/v1/scan/now`;
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`
        }
      });
      if (res.ok) {
        setScanDoneCompId(competitorId);
        setTimeout(() => setScanDoneCompId(null), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanningCompId(null);
    }
  };

  const renderSparkline = (trend: number[]) => {
    if (!trend || trend.length === 0) return null;
    const maxVal = Math.max(1, ...trend);
    const width = 80;
    const height = 24;
    const padding = 2;
    const points = trend.map((val, idx) => {
      const x = padding + (idx * (width - padding * 2)) / (trend.length - 1);
      const y = height - padding - (val / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // ── ONBOARDING STEP -1: BUSINESS TYPE SELECTION ──────────────────────────
  if (onboardingStep === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-[#080e1c]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-2xl p-6 md:p-8 max-w-md w-full"
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Compass size={24} />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">What kind of business are you?</h2>
            <p className="text-xs text-zinc-400 mt-1">We'll personalize what you track and how we report it.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                type: 'saas' as const,
                icon: <Globe size={22} className="text-sky-400" />,
                title: 'B2B SaaS',
                desc: 'Track pricing pages, features, messaging, and G2/Trustpilot reviews.',
                border: 'border-sky-500/30 bg-sky-500/5',
                check: 'text-sky-400'
              },
              {
                type: 'local' as const,
                icon: <MapPin size={22} className="text-cyan-400" />,
                title: 'Local Business',
                desc: 'Track Google Maps reviews, Instagram activity, and nearby competitors.',
                border: 'border-cyan-500/30 bg-cyan-500/5',
                check: 'text-cyan-400'
              }
            ].map(({ type, icon, title, desc, border, check }) => (
              <button
                key={type}
                onClick={() => setSelectedBusinessType(type)}
                className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedBusinessType === type
                    ? border
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {selectedBusinessType === type && (
                  <CheckCircle2 size={14} className={`absolute top-3 right-3 ${check}`} />
                )}
                <div className="mb-2">{icon}</div>
                <p className="text-sm font-bold text-white mb-1">{title}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">{desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => confirmBusinessType(selectedBusinessType)}
            disabled={savingBusinessType}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {savingBusinessType ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <>Continue as {selectedBusinessType === 'saas' ? 'SaaS' : 'Local Business'} <ArrowRight size={14} /></>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── ONBOARDING STEP 0: ADD FIRST COMPETITOR ───────────────────────────────
  if (onboardingStep === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        
        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-[#080e1c]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-2xl p-6 md:p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className={`w-12 h-12 border rounded-full flex items-center justify-center mx-auto mb-3 ${
              selectedBusinessType === 'local'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
            }`}>
              {selectedBusinessType === 'local' ? <MapPin size={24} /> : <Compass size={24} />}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {selectedBusinessType === 'local' ? "Add your first local competitor" : "Add your first competitor"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {selectedBusinessType === 'local'
                ? "We'll track their Google Maps reviews, social posts, and nearby presence."
                : "We'll start monitoring them instantly in real-time."}
            </p>
          </div>

          <form onSubmit={submitOnboardingCompetitor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                {selectedBusinessType === 'local' ? 'Competitor Website URL *' : 'Competitor URL *'}
              </label>
              <input
                type="text"
                required
                placeholder={selectedBusinessType === 'local' ? 'e.g. rivalcafe.com' : 'e.g. competitor.com'}
                value={onboardingUrl}
                onChange={(e) => setOnboardingUrl(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Business Name (Optional)</label>
              <input
                type="text"
                placeholder={selectedBusinessType === 'local' ? 'e.g. Rival Cafe Downtown' : 'e.g. Rival Inc'}
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>

            {selectedBusinessType === 'local' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Google Maps URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. maps.google.com/place/..."
                    value={onboardingMapsUrl}
                    onChange={(e) => setOnboardingMapsUrl(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Instagram Handle (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. @rivalcafe"
                    value={onboardingInstagram}
                    onChange={(e) => setOnboardingInstagram(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">G2 or Trustpilot URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. g2.com/products/competitor/reviews"
                  value={onboardingG2Url}
                  onChange={(e) => setOnboardingG2Url(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            )}

            {onboardingError && (
              <p className="text-xs text-red-400 font-medium">{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={submittingOnboarding}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submittingOnboarding ? (
                <><Loader2 size={16} className="animate-spin" /> Creating...</>
              ) : (
                'Add Competitor + Run First Scan'
              )}
            </button>

            <div className="text-center pt-2 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setOnboardingStep(-1)}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-300 hover:underline cursor-pointer"
              >
                ← Change type
              </button>
              <button
                type="button"
                onClick={() => setOnboardingStep(3)}
                className="text-xs font-medium text-zinc-500 hover:text-white hover:underline cursor-pointer"
              >
                Skip & go to dashboard
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── ONBOARDING STEP 2: INLINE SCAN PROGRESS ──────────────────────────────
  if (onboardingStep === 1) {
    const statusMessages: Record<string, string> = {
      fetching: 'Fetching page...',
      analyzing: 'Analyzing changes...',
      done: 'Done!',
      error: 'Error scanning.'
    };

    return (
      <div className="bg-[#0c0919]/60 backdrop-blur-md rounded-2xl border border-white/[0.08] p-8 max-w-xl mx-auto shadow-2xl text-center space-y-6 my-12">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-sky-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-sky-500 rounded-full animate-spin"></div>
          <Building2 size={36} className="text-sky-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Running your initial scan...</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            We are analyzing the competitor homepage for copy structures, pricing, and reviews.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto border border-white/[0.08] rounded-xl p-4 bg-white/[0.02]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Live Status</span>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Loader2 size={16} className="animate-spin text-sky-400" />
            {statusMessages[onboardingStatus] || statusMessages.fetching}
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARDING STEP 3: INLINE FIRST RESULTS ──────────────────────────────
  if (onboardingStep === 2) {
    const isError = onboardingStatus === 'error';
    return (
      <div className="bg-[#0c0919]/60 backdrop-blur-md rounded-2xl border border-white/[0.08] p-8 max-w-xl mx-auto shadow-2xl text-center space-y-6 my-12">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          {isError ? (
            <AlertTriangle size={32} className="text-red-400" />
          ) : (
            <CheckCircle2 size={32} />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isError ? 'Scan had an issue' : 'First scan complete!'}
          </h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {isError 
              ? "We added your competitor but couldn't scan their page. Check their URL or try again."
              : "We've captured their current landing page snapshot and scheduled the monitor."
            }
          </p>
        </div>

        {!isError && (
          <div className="border border-white/[0.08] rounded-xl p-4 bg-white/[0.02] max-w-md mx-auto text-left space-y-2 text-xs">
            <p className="font-bold text-white">{onboardingName || onboardingUrl}</p>
            <p className="text-zinc-400 truncate">{onboardingUrl}</p>
            <p className="text-zinc-500 border-t border-white/[0.06] pt-2 mt-2 leading-relaxed">
              We will automatically check this competitor every Monday and email you changes.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setOnboardingUrl('');
              setOnboardingName('');
              setOnboardingG2Url('');
              setOnboardingStep(0);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-white/[0.02] text-zinc-300 border border-white/10 hover:bg-white/[0.05] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Add another competitor
          </button>
          <button
            onClick={() => setOnboardingStep(3)}
            className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* A) HEADER ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Competitors Tracked */}
        <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md hover:border-sky-500/15 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Competitors Tracked</span>
            <Building2 size={20} className="text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{dashboardData.competitor_count}</div>
          <p className="text-xs text-zinc-500 mt-1">Active targets</p>
        </div>

        {/* Changes This Week */}
        <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md hover:border-sky-500/15 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Changes This Week</span>
            <Zap size={20} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{dashboardData.changes_this_week || 0}</div>
          <p className="text-xs text-zinc-500 mt-1">Past 7 days</p>
        </div>

        {/* Alerts Pending */}
        <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md hover:border-sky-500/15 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Alerts Pending</span>
            <CheckSquare size={20} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{dashboardData.pending_count}</div>
          <p className="text-xs text-zinc-500 mt-1">Requires review</p>
        </div>

        {/* Avg Review Score */}
        <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md hover:border-sky-500/15 hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Avg Review Score</span>
            <Star size={20} className="text-amber-500"  />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {dashboardData.avg_review_score !== null ? dashboardData.avg_review_score.toFixed(1) : '--'}
          </div>
          <p className="text-xs text-zinc-500 mt-1">Across integrations</p>
        </div>
      </div>

      {/* B) ACTIVITY CHART (28-day bar chart) */}
      <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Daily Activity (28 Days)</h2>
            <p className="text-xs text-zinc-400">Scans and detected changes</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-white/5 rounded-sm"></div>
              <span className="text-zinc-500">Quiet scan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></div>
              <span className="text-zinc-300">Changes detected</span>
            </div>
          </div>
        </div>
        <div className="h-[160px] w-full">
          {activityDays.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityDays} barSize={10} barGap={2}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const parts = val.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const dateObj = new Date(data.date);
                      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div className="bg-[#130f2c]/90 border border-white/[0.08] backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-2xl font-sans">
                          <p className="font-semibold text-zinc-200">{formattedDate}</p>
                          <p className="text-sky-400 font-medium mt-0.5">{data.change_count} changes detected</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="change_count" radius={[3, 3, 0, 0]}>
                  {activityDays.map((entry, idx) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = entry.date === todayStr;
                    const hasChanges = entry.change_count > 0;
                    return (
                      <Cell 
                        key={idx} 
                        fill={hasChanges ? (isToday ? '#38bdf8' : '#0ea5e9') : 'rgba(255,255,255,0.06)'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500">
              <Loader2 size={20} className="animate-spin text-sky-500" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C) INTEL FEED */}
        <div id="feed" className="lg:col-span-2 bg-[#0b0819]/45 border border-white/[0.06] shadow-lg rounded-2xl flex flex-col backdrop-blur-md">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Intel Feed</h2>
            <p className="text-xs text-zinc-400">Chronological timeline of competitor events</p>
          </div>

          <div className="divide-y divide-white/[0.04] flex-1">
            {feedEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                No change events recorded yet. Run a scan to see data.
              </div>
            ) : (
              feedEvents.map((event) => {
                const isExpanded = expandedEventId === event.id;
                const changeTypeStyles: Record<string, string> = {
                  pricing_change: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  new_feature: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  positioning_shift: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                  review_trend: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  minor_copy: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                };
                
                const typeStyle = changeTypeStyles[event.change_type] || changeTypeStyles.minor_copy;
                const hostname = (event.competitor_url.split('://')[1] || event.competitor_url).split('/')[0].replace('www.', '');

                return (
                  <div key={event.id} className="p-5 hover:bg-white/[0.02] transition-colors duration-200">
                    <div className="flex items-start gap-4">
                      {/* Favicon */}
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                        alt="" 
                        className="w-8 h-8 rounded-md bg-[#130f2c] border border-white/[0.08] p-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{event.competitor_name || hostname}</span>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">{formatTimeAgo(event.detected_at)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeStyle}`}>
                            {event.change_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p 
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className={`text-sm text-zinc-300 leading-relaxed cursor-pointer hover:text-sky-400 transition-colors ${
                            isExpanded ? '' : 'line-clamp-2'
                          }`}
                        >
                          {event.brief_text || "Website copy updated."}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Link 
                            href={`/competitors/${event.competitor_id}`}
                            className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 hover:underline"
                          >
                            View Battle Card <ArrowRight size={12} />
                          </Link>
                          {event.brief_text && event.brief_text.length > 120 && (
                            <button 
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? <>Collapse <ChevronUp size={12} /></> : <>Expand <ChevronDown size={12} /></>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasMoreFeed && (
            <div className="p-4 border-t border-white/[0.06] text-center">
              <button
                onClick={loadMoreFeed}
                disabled={loadingFeed}
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/[0.04] active:bg-white/[0.08] text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer bg-white/[0.01]"
              >
                {loadingFeed ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-sky-400" />
                    Loading...
                  </>
                ) : (
                  'Load More Events'
                )}
              </button>
            </div>
          )}
        </div>

        {/* D) COMPETITOR HEALTH TABLE */}
        <div className="bg-[#0b0819]/45 border border-white/[0.06] shadow-lg rounded-2xl flex flex-col backdrop-blur-md">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Tracked Competitors</h2>
            <p className="text-xs text-zinc-400">Landscape health and review averages</p>
          </div>

          <div className="divide-y divide-white/[0.04] flex-1 overflow-x-auto">
            {dashboardData.competitors_health && dashboardData.competitors_health.length > 0 ? (
              dashboardData.competitors_health.map((comp) => {
                const statusStyles = {
                  Active: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                  'No changes': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                  Error: 'bg-red-500/10 text-red-400 border-red-500/20',
                };
                
                const statusStyle = statusStyles[comp.status] || statusStyles['No changes'];

                return (
                  <div key={comp.id} className="p-5 hover:bg-white/[0.02] transition-colors duration-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{comp.name}</h3>
                        <a 
                          href={comp.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-zinc-400 hover:underline truncate block"
                        >
                          {comp.url}
                        </a>
                      </div>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusStyle}`}>
                        {comp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs py-1">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Last Scanned</span>
                        <span className="font-semibold text-zinc-300">{formatTimeAgo(comp.last_scanned)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Reviews Avg</span>
                        <span className="font-semibold text-zinc-300 inline-flex items-center gap-1">
                          {comp.avg_rating !== null ? (
                            <>
                              <Star size={12}  className="text-amber-500" />
                              {comp.avg_rating.toFixed(1)}
                            </>
                          ) : (
                            '--'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">4-Week Activity</span>
                        <div className="h-6 flex items-center">{renderSparkline(comp.trend)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scanNow(comp.id)}
                          disabled={!!scanningCompId}
                          className="inline-flex items-center justify-center p-1.5 border border-white/10 hover:bg-white/[0.05] text-zinc-300 rounded-lg cursor-pointer transition-colors bg-white/[0.01]"
                          title="Scan now"
                        >
                          {scanningCompId === comp.id ? (
                            <Loader2 size={14} className="animate-spin text-sky-400" />
                          ) : scanDoneCompId === comp.id ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                        </button>
                        <Link 
                          href={`/competitors/${comp.id}`}
                          className="text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-zinc-500">
                No competitors tracked.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
