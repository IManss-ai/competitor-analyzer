'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Zap, CheckSquare, Star, Clock, ArrowRight, Loader2, Globe, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Plus, Compass, CheckCircle2, MapPin, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { DashboardData, Competitor } from '@/lib/types';
import { useChartPalette } from '@/lib/chart-theme';

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
  const p = useChartPalette();

  const refreshDashboard = async () => {
    try {
      const dbRes = await fetch(`${apiUrl}/api/v1/dashboard`, {
        headers: { Authorization: `Bearer ${userId}` }
      });
      if (dbRes.ok) {
        const freshData = await dbRes.json();
        setDashboardData(freshData);
        if (freshData.events) {
          setFeedEvents(freshData.events.slice(0, 20));
        }
      }
    } catch (e) {
      console.error('Failed to refresh dashboard data:', e);
    }
  };

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
            await refreshDashboard();
          } else if (data.status === 'error') {
            clearInterval(intervalId);
            // The competitor was still created even if its first scan failed —
            // refresh so it appears on the dashboard without a manual reload.
            await refreshDashboard();
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
        setTimeout(() => {
          setScanDoneCompId(null);
          refreshDashboard();
        }, 3000);
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
          stroke={p.accentSoft}
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
          className="relative z-10 backdrop-blur-md rounded-xl border border-[var(--border-default)] shadow-2xl p-6 md:p-8 max-w-md w-full"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)', borderColor: 'var(--accent-border)', borderWidth: 1 }}>
              <Compass size={24} />
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>What kind of business are you?</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>We&apos;ll personalize what you track and how we report it.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              {
                type: 'saas' as const,
                icon: <Globe size={22} style={{ color: 'var(--accent-primary)' }} />,
                title: 'B2B SaaS',
                desc: 'Track pricing pages, features, messaging, and G2/Trustpilot reviews.',
                borderStyle: { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-subtle)' },
                checkColor: 'var(--accent-primary)'
              },
              {
                type: 'local' as const,
                icon: <MapPin size={22} style={{ color: 'var(--accent-primary)' }} />,
                title: 'Local Business',
                desc: 'Track Google Maps reviews, Instagram activity, and nearby competitors.',
                borderStyle: { borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-subtle)' },
                checkColor: 'var(--accent-primary)'
              }
            ].map(({ type, icon, title, desc, borderStyle, checkColor }) => (
              <button
                key={type}
                onClick={() => setSelectedBusinessType(type)}
                className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer`}
                style={selectedBusinessType === type ? borderStyle : { borderColor: 'var(--border-default)', backgroundColor: 'var(--fill-subtle)' }}
              >
                {selectedBusinessType === type && (
                  <CheckCircle2 size={14} className="absolute top-3 right-3" style={{ color: checkColor }} />
                )}
                <div className="mb-2">{icon}</div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => confirmBusinessType(selectedBusinessType)}
            disabled={savingBusinessType}
            className="w-full disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
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
          className="relative z-10 backdrop-blur-md rounded-xl border border-[var(--border-default)] shadow-2xl p-6 md:p-8 max-w-md w-full"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
        >
          <div className="text-center mb-6">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                borderColor: 'var(--accent-border)',
                borderWidth: 1,
              }}
            >
              {selectedBusinessType === 'local' ? <MapPin size={24} /> : <Compass size={24} />}
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {selectedBusinessType === 'local' ? "Add your first local competitor" : "Add your first competitor"}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {selectedBusinessType === 'local'
                ? "We'll track their Google Maps reviews, social posts, and nearby presence."
                : "We'll start monitoring them instantly in real-time."}
            </p>
          </div>

          <form onSubmit={submitOnboardingCompetitor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {selectedBusinessType === 'local' ? 'Competitor Website URL *' : 'Competitor URL *'}
              </label>
              <input
                type="text"
                required
                placeholder={selectedBusinessType === 'local' ? 'e.g. rivalcafe.com' : 'e.g. competitor.com'}
                value={onboardingUrl}
                onChange={(e) => setOnboardingUrl(e.target.value)}
                className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Business Name (Optional)</label>
              <input
                type="text"
                placeholder={selectedBusinessType === 'local' ? 'e.g. Rival Cafe Downtown' : 'e.g. Rival Inc'}
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
              />
            </div>

            {selectedBusinessType === 'local' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Google Maps URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. maps.google.com/place/..."
                    value={onboardingMapsUrl}
                    onChange={(e) => setOnboardingMapsUrl(e.target.value)}
                    className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Instagram Handle (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. @rivalcafe"
                    value={onboardingInstagram}
                    onChange={(e) => setOnboardingInstagram(e.target.value)}
                    className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>G2 or Trustpilot URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. g2.com/products/competitor/reviews"
                  value={onboardingG2Url}
                  onChange={(e) => setOnboardingG2Url(e.target.value)}
                  className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
                />
              </div>
            )}

            {onboardingError && (
              <p className="text-xs text-red-400 font-medium font-mono">{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={submittingOnboarding}
              className="w-full disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
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
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline cursor-pointer"
              >
                ← Change type
              </button>
              <button
                type="button"
                onClick={() => setOnboardingStep(3)}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer"
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
      <div className="backdrop-blur-md rounded-xl border border-[var(--border-default)] p-8 max-w-xl mx-auto shadow-2xl text-center space-y-6 my-12" style={{ backgroundColor: 'var(--surface-overlay)' }}>
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: 'rgba(79, 124, 176,0.1)' }}></div>
          <div className="absolute inset-0 border-4 border-t-sky-500 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }}></div>
          <Building2 size={36} style={{ color: 'var(--accent-primary)' }} />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Running your initial scan...</h2>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            We are analyzing the competitor homepage for copy structures, pricing, and reviews.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto border border-[var(--border-default)] rounded-xl p-4" style={{ background: 'var(--fill-subtle)' }}>
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Live Status</span>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
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
      <div className="backdrop-blur-md rounded-xl border border-[var(--border-default)] p-8 max-w-xl mx-auto shadow-2xl text-center space-y-6 my-12" style={{ backgroundColor: 'var(--surface-overlay)' }}>
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          {isError ? (
            <AlertTriangle size={32} className="text-red-400" />
          ) : (
            <CheckCircle2 size={32} />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isError ? 'Scan had an issue' : 'First scan complete!'}
          </h2>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {isError
              ? "We added your competitor but couldn't scan their page. Check their URL or try again."
              : "We've captured their current landing page snapshot and scheduled the monitor."
            }
          </p>
        </div>

        {!isError && (
          <div className="border border-[var(--border-default)] rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-xs" style={{ background: 'var(--fill-subtle)' }}>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{onboardingName || onboardingUrl}</p>
            <p className="truncate" style={{ color: 'var(--text-secondary)' }}>{onboardingUrl}</p>
            <p className="border-t border-[var(--border-subtle)] pt-2 mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
            className="w-full sm:w-auto px-5 py-2.5 border border-[var(--border-default)] hover:bg-[var(--fill-subtle-hover)] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            style={{ background: 'var(--fill-subtle)', color: 'var(--text-primary)' }}
          >
            Add another competitor
          </button>
          <button
            onClick={() => setOnboardingStep(3)}
            className="w-full sm:w-auto px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* A) STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{
          label: 'Competitors',
          value: dashboardData.competitor_count,
          sub: 'Active targets',
          accent: p.accent,
        },{
          label: 'Changes / week',
          value: dashboardData.changes_this_week || 0,
          sub: 'Past 7 days',
          accent: p.warning,
        },{
          label: 'Pending alerts',
          value: dashboardData.pending_count,
          sub: 'Requires review',
          accent: p.danger,
        },{
          label: 'Avg review',
          value: dashboardData.avg_review_score !== null ? dashboardData.avg_review_score.toFixed(1) : '--',
          sub: 'Across integrations',
          accent: p.positive,
        }].map(({ label, value, sub, accent }) => (
          <div key={label} className="rs-card relative overflow-hidden p-5 group">
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg" style={{ background: accent }} />
            <p className="rs-label mb-3 pt-1">{label}</p>
            <p className="text-[28px] font-semibold leading-none tracking-tight font-mono" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</p>
            <p className="text-[11px] mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* B) ACTIVITY CHART (28-day bar chart) */}
      <div className="rs-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="rs-heading-md">Daily Activity</h2>
            <p className="rs-body-sm mt-0.5">28-day scan + change history</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: p.grid }} />
              <span style={{ color: 'var(--text-muted)' }}>Quiet</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent-primary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Changes</span>
            </div>
          </div>
        </div>
        <div className="h-[160px] w-full">
          {activityDays.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityDays} barSize={10} barGap={2}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => { const p = val.split('-'); return `${p[1]}/${p[2]}`; }}
                  tick={{ fill: p.tick, fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  axisLine={{ stroke: p.axis }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const fmt = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}>
                          <p className="font-semibold">{fmt}</p>
                          <p className="mt-0.5 font-mono" style={{ color: 'var(--accent-primary)' }}>{d.change_count} changes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: p.cursor }}
                />
                <Bar dataKey="change_count" radius={[3, 3, 0, 0]}>
                  {activityDays.map((entry, idx) => (
                    <Cell key={idx} fill={entry.change_count > 0 ? p.accent : p.grid} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C) INTEL FEED */}
        <div id="feed" className="rs-card lg:col-span-2 flex flex-col">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="rs-heading-md">Intel Feed</h2>
            <p className="rs-body-sm mt-0.5">Chronological timeline of competitor changes</p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] flex-1">
            {feedEvents.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No change events recorded yet. Run a scan to see data.
              </div>
            ) : (
              feedEvents.map((event) => {
                const isExpanded = expandedEventId === event.id;
                const hostname = (event.competitor_url.split('://')[1] || event.competitor_url).split('/')[0].replace('www.', '');

                return (
                  <div
                    key={event.id}
                    className="p-5 transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                        alt=""
                        className="w-7 h-7 rounded-md flex-shrink-0"
                        style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', padding: '3px' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{event.competitor_name || hostname}</span>
                          <time suppressHydrationWarning className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(event.detected_at)}</time>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-${event.change_type}`}>
                            {event.change_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className={`text-[13px] leading-relaxed cursor-pointer transition-colors ${isExpanded ? '' : 'line-clamp-2'}`}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {event.brief_text || 'Website copy updated.'}
                        </p>

                        <div className="flex items-center gap-4 mt-2.5">
                          <Link
                            href={`/competitors/${event.competitor_id}`}
                            className="text-[12px] font-semibold inline-flex items-center gap-1 transition-colors"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            Battle Card <ArrowRight size={11} />
                          </Link>
                          {event.brief_text && event.brief_text.length > 120 && (
                            <button 
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] inline-flex items-center gap-0.5"
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
            <div className="p-4 border-t border-[var(--border-subtle)] text-center">
              <button
                onClick={loadMoreFeed}
                disabled={loadingFeed}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--fill-subtle)] active:bg-[var(--fill-subtle-hover)] text-sm font-semibold rounded-lg text-[var(--text-primary)] transition-colors cursor-pointer bg-[var(--fill-subtle)]"
              >
                {loadingFeed ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
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
        <div className="rs-card flex flex-col">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="rs-heading-md">Tracked Competitors</h2>
            <p className="rs-body-sm mt-0.5">Health and review averages</p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] flex-1 overflow-x-auto">
            {dashboardData.competitors_health && dashboardData.competitors_health.length > 0 ? (
              dashboardData.competitors_health.map((comp) => {
                const statusColor = comp.status === 'Active'
                  ? { color: p.positive, bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' }
                  : comp.status === 'Error'
                  ? { color: p.danger, bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' }
                  : { color: 'var(--text-muted)', bg: 'var(--fill-subtle)', border: 'var(--border-default)' };

                return (
                  <div
                    key={comp.id}
                    className="p-5 space-y-3 transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{comp.name}</h3>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono truncate block transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {comp.url}
                        </a>
                      </div>
                      <span
                        className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                        style={{ color: statusColor.color, background: statusColor.bg, borderColor: statusColor.border }}
                      >
                        {comp.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="rs-label block mb-0.5">Last Scanned</span>
                        <span suppressHydrationWarning className="text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{formatTimeAgo(comp.last_scanned)}</span>
                      </div>
                      <div>
                        <span className="rs-label block mb-0.5">Reviews Avg</span>
                        <span className="text-[12px] font-mono inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          {comp.avg_rating !== null ? (
                            <><Star size={11} className="text-amber-400" />{comp.avg_rating.toFixed(1)}</>
                          ) : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="flex flex-col gap-0.5">
                        <span className="rs-label">4-Week Activity</span>
                        <div className="h-6 flex items-center">{renderSparkline(comp.trend)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scanNow(comp.id)}
                          disabled={!!scanningCompId}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg cursor-pointer transition-colors"
                          style={{ border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)' }}
                          title="Scan now"
                        >
                          {scanningCompId === comp.id ? (
                            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                          ) : scanDoneCompId === comp.id ? (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                          ) : (
                            <RefreshCw size={13} />
                          )}
                        </button>
                        <Link
                          href={`/competitors/${comp.id}`}
                          className="text-[12px] font-semibold transition-colors"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                No competitors tracked yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
