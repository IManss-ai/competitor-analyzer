'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Buildings, 
  Lightning, 
  CheckSquare, 
  Star, 
  Clock, 
  ArrowRight, 
  Spinner, 
  Globe, 
  CaretDown, 
  CaretUp,
  Warning,
  ArrowsClockwise,
  Plus,
  Compass,
  CheckCircle
} from '@phosphor-icons/react';
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

  // Onboarding states (Phase 5)
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    return competitors.length === 0 ? 0 : 3;
  });
  const [onboardingJobId, setOnboardingJobId] = useState<string | null>(null);
  const [onboardingCompId, setOnboardingCompId] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<string>('fetching');
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingG2Url, setOnboardingG2Url] = useState('');
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

  // Submit onboarding Step 1
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
      setOnboardingStep(1); // Move to Step 2 (scanning)
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
      const res = await fetch(`${apiUrl}/api/v1/dashboard/feed?limit=20&offset={feedOffset}`, {
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
        alert("Scan started! The analysis will complete in the background.");
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
          stroke="#2563eb"
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

  // ── ONBOARDING STEP 1: MODAL ──────────────────────────────────────────────
  if (onboardingStep === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[#171717]/40 backdrop-blur-sm" />
        
        {/* Modal content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-white rounded-xl border border-[#e5e5e5] shadow-xl p-6 md:p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Compass size={24} weight="duotone" />
            </div>
            <h2 className="text-lg font-bold text-[#171717]">Welcome! Let's add your first competitor.</h2>
            <p className="text-xs text-[#737373] mt-1">We will start monitoring them instantly in real-time.</p>
          </div>

          <form onSubmit={submitOnboardingCompetitor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">Competitor URL *</label>
              <input
                type="text"
                required
                placeholder="e.g. competitor.com"
                value={onboardingUrl}
                onChange={(e) => setOnboardingUrl(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">Competitor Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Rival Inc"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5">G2 or Trustpilot URL (Optional)</label>
              <input
                type="text"
                placeholder="e.g. g2.com/products/competitor/reviews"
                value={onboardingG2Url}
                onChange={(e) => setOnboardingG2Url(e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {onboardingError && (
              <p className="text-xs text-red-600 font-medium">{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={submittingOnboarding}
              className="w-full bg-[#2563eb] text-white hover:bg-blue-600 disabled:opacity-50 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {submittingOnboarding ? (
                <>
                  <Spinner size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Competitor + Run First Scan'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setOnboardingStep(3)}
                className="text-xs font-medium text-[#737373] hover:text-[#171717] hover:underline cursor-pointer"
              >
                Skip onboarding & go to dashboard
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
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-8 max-w-xl mx-auto shadow-sm text-center space-y-6 my-12">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          <Buildings size={36} className="text-blue-600" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[#171717]">Running your initial scan...</h2>
          <p className="text-xs text-[#737373] max-w-sm mx-auto">
            We are analyzing the competitor homepage for copy structures, pricing, and reviews.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto border border-[#e5e5e5] rounded-xl p-4 bg-[#fafafa]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#737373]">Live Status</span>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
            <Spinner size={16} className="animate-spin text-blue-600" />
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
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-8 max-w-xl mx-auto shadow-sm text-center space-y-6 my-12">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          {isError ? (
            <Warning size={32} className="text-red-500" />
          ) : (
            <CheckCircle size={32} />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[#171717]">
            {isError ? 'Competitor Added with Scan Warning' : 'First scan complete!'}
          </h2>
          <p className="text-xs text-[#737373] max-w-sm mx-auto">
            {isError 
              ? "We added your competitor but couldn't scan their page. Check their URL or try again."
              : "We've captured their current landing page snapshot and scheduled the monitor."
            }
          </p>
        </div>

        {!isError && (
          <div className="border border-[#e5e5e5] rounded-xl p-4 bg-[#fafafa] max-w-md mx-auto text-left space-y-2 text-xs">
            <p className="font-bold text-[#171717]">{onboardingName || onboardingUrl}</p>
            <p className="text-[#737373] truncate">{onboardingUrl}</p>
            <p className="text-[#737373] border-t border-[#e5e5e5] pt-2 mt-2 leading-relaxed">
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
            className="w-full sm:w-auto px-5 py-2.5 bg-[#f5f5f5] text-neutral-800 border border-[#e5e5e5] hover:bg-neutral-100 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Add another competitor
          </button>
          <button
            onClick={() => setOnboardingStep(3)}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#2563eb] text-white hover:bg-blue-600 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── NORMAL DASHBOARD RENDER ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* A) HEADER ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Competitors Tracked */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#737373] tracking-wide uppercase">Competitors Tracked</span>
            <Buildings size={20} className="text-[#737373]" />
          </div>
          <div className="text-2xl font-bold text-[#171717]">{dashboardData.competitor_count}</div>
          <p className="text-xs text-[#737373] mt-1">Active targets</p>
        </div>

        {/* Changes This Week */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#737373] tracking-wide uppercase">Changes This Week</span>
            <Lightning size={20} className="text-[#2563eb]" />
          </div>
          <div className="text-2xl font-bold text-[#171717]">{dashboardData.changes_this_week || 0}</div>
          <p className="text-xs text-[#737373] mt-1">Past 7 days</p>
        </div>

        {/* Alerts Pending */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#737373] tracking-wide uppercase">Alerts Pending</span>
            <CheckSquare size={20} className="text-[#d97706]" />
          </div>
          <div className="text-2xl font-bold text-[#171717]">{dashboardData.pending_count}</div>
          <p className="text-xs text-[#737373] mt-1">Requires review</p>
        </div>

        {/* Avg Review Score */}
        <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#737373] tracking-wide uppercase">Avg Review Score</span>
            <Star size={20} className="text-[#d97706]" weight="fill" />
          </div>
          <div className="text-2xl font-bold text-[#171717]">
            {dashboardData.avg_review_score !== null ? dashboardData.avg_review_score.toFixed(1) : '--'}
          </div>
          <p className="text-xs text-[#737373] mt-1">Across integrations</p>
        </div>
      </div>

      {/* B) ACTIVITY CHART (28-day bar chart) */}
      <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#171717]">Daily Activity (28 Days)</h2>
            <p className="text-xs text-[#737373]">Scans and detected changes</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#e5e5e5] rounded-sm"></div>
              <span className="text-[#737373]">Quiet scan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#2563eb] rounded-sm"></div>
              <span className="text-[#171717]">Changes detected</span>
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
                  tick={{ fill: '#737373', fontSize: 10 }}
                  axisLine={{ stroke: '#e5e5e5' }}
                  tickLine={{ stroke: '#e5e5e5' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const dateObj = new Date(data.date);
                      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div className="bg-[#171717] text-white text-xs px-3 py-2 rounded-lg shadow-md border border-neutral-800 font-sans">
                          <p className="font-semibold">{formattedDate}</p>
                          <p className="text-neutral-400 mt-0.5">{data.change_count} changes detected</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: '#fafafa' }}
                />
                <Bar dataKey="change_count" radius={[3, 3, 0, 0]}>
                  {activityDays.map((entry, idx) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = entry.date === todayStr;
                    const hasChanges = entry.change_count > 0;
                    return (
                      <Cell 
                        key={idx} 
                        fill={hasChanges ? (isToday ? '#2563eb' : '#3b82f6') : '#e5e5e5'} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#737373]">
              <Spinner size={20} className="animate-spin text-[#2563eb]" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C) INTEL FEED */}
        <div id="feed" className="lg:col-span-2 bg-white rounded-xl border border-[#e5e5e5] shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5e5e5]">
            <h2 className="text-sm font-bold text-[#171717]">Intel Feed</h2>
            <p className="text-xs text-[#737373]">Chronological timeline of competitor events</p>
          </div>

          <div className="divide-y divide-[#e5e5e5] flex-1">
            {feedEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#737373]">
                No change events recorded yet. Run a scan to see data.
              </div>
            ) : (
              feedEvents.map((event) => {
                const isExpanded = expandedEventId === event.id;
                const changeTypeStyles: Record<string, string> = {
                  pricing_change: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
                  new_feature: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
                  positioning_shift: 'bg-[#faf5ff] text-[#8b5cf6] border-[#e9d5ff]',
                  review_trend: 'bg-[#fffbeb] text-[#d97706] border-[#fef3c7]',
                  minor_copy: 'bg-[#fafafa] text-[#737373] border-[#e5e5e5]',
                };
                
                const typeStyle = changeTypeStyles[event.change_type] || changeTypeStyles.minor_copy;
                const hostname = event.competitor_url.split('://')[-1].split('/')[0].replace('www.', '');

                return (
                  <div key={event.id} className="p-5 hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Favicon */}
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                        alt="" 
                        className="w-8 h-8 rounded-md bg-white border border-[#e5e5e5] p-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-[#171717]">{event.competitor_name || hostname}</span>
                          <span className="text-xs text-[#737373] whitespace-nowrap">{formatTimeAgo(event.detected_at)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeStyle}`}>
                            {event.change_type.replace('_', ' ')}
                          </span>
                        </div>

                        <p 
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className={`text-sm text-[#171717] leading-relaxed cursor-pointer hover:text-[#2563eb] transition-colors ${
                            isExpanded ? '' : 'line-clamp-2'
                          }`}
                        >
                          {event.brief_text || "Website copy updated."}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Link 
                            href={`/competitors/${event.competitor_id}`}
                            className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] inline-flex items-center gap-1"
                          >
                            View Battle Card <ArrowRight size={12} />
                          </Link>
                          {event.brief_text && event.brief_text.length > 120 && (
                            <button 
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="text-xs text-[#737373] hover:text-[#171717] inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? <>Collapse <CaretUp size={12} /></> : <>Expand <CaretDown size={12} /></>}
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
            <div className="p-4 border-t border-[#e5e5e5] text-center">
              <button
                onClick={loadMoreFeed}
                disabled={loadingFeed}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] hover:bg-[#fafafa] active:bg-[#f0f0f0] text-sm font-semibold rounded-lg text-[#171717] transition-colors cursor-pointer"
              >
                {loadingFeed ? (
                  <>
                    <Spinner size={16} className="animate-spin text-[#2563eb]" />
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
        <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5e5e5]">
            <h2 className="text-sm font-bold text-[#171717]">Tracked Competitors</h2>
            <p className="text-xs text-[#737373]">Landscape health and review averages</p>
          </div>

          <div className="divide-y divide-[#e5e5e5] flex-1 overflow-x-auto">
            {dashboardData.competitors_health && dashboardData.competitors_health.length > 0 ? (
              dashboardData.competitors_health.map((comp) => {
                const statusStyles = {
                  Active: 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]',
                  'No changes': 'bg-[#fafafa] text-[#737373] border-[#e5e5e5]',
                  Error: 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]',
                };
                
                const statusStyle = statusStyles[comp.status] || statusStyles['No changes'];

                return (
                  <div key={comp.id} className="p-5 hover:bg-[#fafafa] transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#171717] truncate">{comp.name}</h3>
                        <a 
                          href={comp.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-[#737373] hover:underline truncate block"
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
                        <span className="text-[#737373] block mb-0.5">Last Scanned</span>
                        <span className="font-semibold text-[#171717]">{formatTimeAgo(comp.last_scanned)}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block mb-0.5">Reviews Avg</span>
                        <span className="font-semibold text-[#171717] inline-flex items-center gap-1">
                          {comp.avg_rating !== null ? (
                            <>
                              <Star size={12} weight="fill" className="text-[#d97706]" />
                              {comp.avg_rating.toFixed(1)}
                            </>
                          ) : (
                            '--'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#e5e5e5]/50 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-[#737373] uppercase tracking-wider font-semibold">4-Week Activity</span>
                        <div className="h-6 flex items-center">{renderSparkline(comp.trend)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scanNow(comp.id)}
                          disabled={!!scanningCompId}
                          className="inline-flex items-center justify-center p-1.5 border border-[#e5e5e5] hover:bg-neutral-100 text-[#171717] rounded-lg cursor-pointer transition-colors"
                          title="Scan now"
                        >
                          {scanningCompId === comp.id ? (
                            <Spinner size={14} className="animate-spin text-[#2563eb]" />
                          ) : (
                            <ArrowsClockwise size={14} />
                          )}
                        </button>
                        <Link 
                          href={`/competitors/${comp.id}`}
                          className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-[#737373]">
                No competitors tracked.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
