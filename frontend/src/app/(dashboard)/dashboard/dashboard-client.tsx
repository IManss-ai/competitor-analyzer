'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Star, ArrowRight, Loader2, Globe, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Plus, Compass, CheckCircle2, MapPin, Lock } from 'lucide-react';
import { DashboardData, Competitor } from '@/lib/types';
import { useChartPalette } from '@/lib/chart-theme';
import { isAbortError } from '@/lib/fetch-utils';
import { competitorDomain } from '@/lib/utils';
import BattleCardContent, { BattleCardData, normalizeBattleCard } from '@/components/battle-card-content';
import CountUp from '@/components/count-up';

interface DashboardClientProps {
  userId: string;
  initialData: DashboardData;
  competitors: Competitor[];
  isLocalBusiness: boolean;
  // Read-only trial-freeze: gate scan + add-competitor actions and route to upgrade.
  readOnly?: boolean;
}

export default function DashboardClient({ userId, initialData, competitors, isLocalBusiness, readOnly = false }: DashboardClientProps) {
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
  // The first report (battle card) generated as the finale of onboarding, so a
  // new user goes sign-up → add → instant report without a manual click.
  const [onboardingCard, setOnboardingCard] = useState<BattleCardData | null>(null);
  const [onboardingCardLoading, setOnboardingCardLoading] = useState(false);
  const [onboardingCardError, setOnboardingCardError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const p = useChartPalette();
  const router = useRouter();

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
      // Also re-render the server components (Topbar "Last scan", etc.) which
      // hold their own copy of this data and won't update from client fetches.
      router.refresh();
    } catch (e) {
      if (isAbortError(e)) return;
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

  // Generate the first battle card as the onboarding finale. Fired the moment
  // the initial scan finishes, so the report is building while we transition.
  const generateOnboardingCard = async (compId: string) => {
    setOnboardingCardLoading(true);
    setOnboardingCardError('');
    try {
      const res = await fetch(`${apiUrl}/api/v1/battlecards/generate/${compId}`, {
        headers: { Authorization: `Bearer ${userId}` },
      });
      if (!res.ok) throw new Error('generate failed');
      setOnboardingCard(normalizeBattleCard(await res.json()));
    } catch (e) {
      if (isAbortError(e)) return;
      setOnboardingCardError('We could not build the report right now — you can open the Battle Card from your dashboard.');
    } finally {
      setOnboardingCardLoading(false);
    }
  };

  // Polling scan status for Onboarding Step 2
  useEffect(() => {
    if (onboardingStep !== 1 || !onboardingJobId) return;

    let intervalId: any = null;
    const controller = new AbortController();

    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/scan/status/${onboardingJobId}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setOnboardingStatus(data.status);
          if (data.status === 'done') {
            clearInterval(intervalId);
            setOnboardingStep(2);
            // Kick off the first report immediately so it builds while the
            // success state animates in.
            if (onboardingCompId) generateOnboardingCard(onboardingCompId);
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
        if (isAbortError(e)) return;
        console.error(e);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => {
      clearInterval(intervalId);
      controller.abort();
    };
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
  const submitOnboardingCompetitor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Trial-freeze: adding a competitor is a paid/write action. Route to upgrade
    // instead of POSTing (the backend would 402 anyway).
    if (readOnly) {
      router.push('/billing/checkout');
      return;
    }
    // Read straight from the DOM inputs, falling back to React state — same
    // fix as the login form: password-manager/programmatic fills set
    // input.value without firing React's onChange, leaving state empty.
    const fd = new FormData(e.currentTarget);
    const urlVal = ((fd.get('url') as string) || onboardingUrl || '').trim();
    const nameVal = (fd.get('name') as string) || onboardingName || '';
    if (!urlVal) {
      setOnboardingError('Please enter your competitor’s URL.');
      return;
    }
    // Sync state from the DOM-read values — the success panel renders
    // onboardingUrl/Name, which stay empty when autofill skipped onChange.
    setOnboardingUrl(urlVal);
    setOnboardingName(nameVal);
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
          url: urlVal,
          name: nameVal,
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
      if (!isAbortError(e)) console.error(e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const scanNow = async (competitorId: string) => {
    if (scanningCompId || readOnly) return;
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
      // Trial-freeze: backend returns 402 once the trial ends.
      if (res.status === 402) {
        setScanningCompId(null);
        router.push('/billing/checkout');
        return;
      }
      if (res.ok) {
        setScanDoneCompId(competitorId);
        setTimeout(() => {
          setScanDoneCompId(null);
          refreshDashboard();
        }, 3000);
      }
    } catch (e) {
      if (!isAbortError(e)) console.error(e);
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
          className="relative z-10 backdrop-blur-md border border-[var(--border-default)] shadow-[var(--shadow-modal)] p-6 md:p-8 max-w-md w-full"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)', borderColor: 'var(--accent-border)', borderWidth: 1 }}>
              <Compass size={24} />
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>What kind of business are you?</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>We&apos;ll personalize what you track and how we report it.</p>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {[
              {
                type: 'saas' as const,
                icon: <Globe size={16} />,
                title: 'B2B SaaS',
                desc: 'Pricing pages, features, messaging, G2/Trustpilot reviews.',
              },
              {
                type: 'local' as const,
                icon: <MapPin size={16} />,
                title: 'Local Business',
                desc: 'Google Maps reviews, Instagram activity, nearby competitors.',
              }
            ].map(({ type, icon, title, desc }) => {
              const selected = selectedBusinessType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedBusinessType(type)}
                  className="relative flex items-center gap-3 text-left px-4 py-3 border transition-colors cursor-pointer"
                  style={{
                    borderColor: selected ? 'var(--accent-primary)' : 'var(--border-default)',
                    backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--fill-subtle)',
                    boxShadow: selected ? 'inset 3px 0 0 var(--accent-primary)' : 'none',
                  }}
                >
                  <span style={{ color: selected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
                    <span className="block text-[11px] leading-snug truncate" style={{ color: 'var(--text-muted)' }}>{desc}</span>
                  </span>
                  {selected && (
                    <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => confirmBusinessType(selectedBusinessType)}
            disabled={savingBusinessType}
            className="w-full disabled:opacity-50 text-[var(--accent-text)] py-3 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
          >
            {savingBusinessType ? (
              <><Loader2 size={16} className="animate-spin" /> Saving…</>
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
          className="relative z-10 backdrop-blur-md border border-[var(--border-default)] shadow-[var(--shadow-modal)] p-6 md:p-8 max-w-md w-full"
          style={{ backgroundColor: 'var(--surface-overlay)' }}
        >
          <div className="text-center mb-6">
            <div 
              className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
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
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                {selectedBusinessType === 'local' ? 'Competitor Website URL *' : 'Competitor URL *'}
              </label>
              <input
                type="text"
                name="url"
                required
                placeholder={selectedBusinessType === 'local' ? 'e.g. rivalcafe.com' : 'e.g. competitor.com'}
                value={onboardingUrl}
                onChange={(e) => setOnboardingUrl(e.target.value)}
                className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Business Name (Optional)</label>
              <input
                type="text"
                name="name"
                placeholder={selectedBusinessType === 'local' ? 'e.g. Rival Cafe Downtown' : 'e.g. Rival Inc'}
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
              />
            </div>

            {selectedBusinessType === 'local' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Google Maps URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. maps.google.com/place/..."
                    value={onboardingMapsUrl}
                    onChange={(e) => setOnboardingMapsUrl(e.target.value)}
                    className="rs-input placeholder-[var(--text-muted)] focus:outline-none w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Instagram Handle (Optional)</label>
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
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>G2 or Trustpilot URL (Optional)</label>
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
              <p className="text-xs font-medium font-mono" style={{ color: 'var(--tone-danger)' }}>{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={submittingOnboarding || readOnly}
              title={readOnly ? 'Your trial has ended — upgrade to add competitors' : undefined}
              className="w-full disabled:opacity-50 text-[var(--accent-text)] py-3 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-cta)' }}
              onMouseEnter={e => { if (!readOnly) e.currentTarget.style.backgroundColor = 'var(--accent-cta-hover)'; }}
              onMouseLeave={e => { if (!readOnly) e.currentTarget.style.backgroundColor = 'var(--accent-cta)'; }}
            >
              {readOnly ? (
                <><Lock size={16} /> Upgrade to add competitors</>
              ) : submittingOnboarding ? (
                <><Loader2 size={16} className="animate-spin" /> Creating…</>
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
      fetching: 'Fetching page…',
      analyzing: 'Analyzing changes…',
      done: 'Done!',
      error: 'Error scanning.'
    };

    return (
      <div className="backdrop-blur-md border border-[var(--border-default)] p-8 max-w-xl mx-auto shadow-[var(--shadow-modal)] text-center space-y-6 my-12" style={{ backgroundColor: 'var(--surface-overlay)' }}>
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: 'var(--border-default)' }}></div>
          <div className="absolute inset-0 border-4 border-t-sky-500 rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-primary)' }}></div>
          <Building2 size={36} style={{ color: 'var(--accent-primary)' }} />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Running your initial scan...</h2>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            We are analyzing the competitor homepage for copy structures, pricing, and reviews.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto border border-[var(--border-default)] p-4" style={{ background: 'var(--fill-subtle)' }}>
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Live Status</span>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            {statusMessages[onboardingStatus] || statusMessages.fetching}
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARDING STEP 3: FIRST INTELLIGENCE REPORT ─────────────────────────
  if (onboardingStep === 2) {
    const isError = onboardingStatus === 'error';
    const compLabel = onboardingName || onboardingUrl;
    const resetAndAddAnother = () => {
      setOnboardingUrl('');
      setOnboardingName('');
      setOnboardingG2Url('');
      setOnboardingCard(null);
      setOnboardingCardError('');
      setOnboardingStep(0);
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="border border-[var(--border-default)] max-w-2xl mx-auto shadow-[var(--shadow-modal)] my-10 overflow-hidden"
        style={{ backgroundColor: 'var(--surface-overlay)', borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-default)] bg-[var(--fill-subtle)] text-center space-y-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${isError ? 'bg-[var(--tone-danger)]/10 border-[var(--tone-danger)]/25' : 'bg-[var(--tone-positive)]/10 border-[var(--tone-positive)]/25'}`}>
            {isError ? <AlertTriangle size={24} className="text-[var(--tone-danger)]" /> : <CheckCircle2 size={24} style={{ color: 'var(--tone-positive)' }} />}
          </div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isError ? 'Scan had an issue' : `Your first report on ${compLabel}`}
          </h2>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {isError
              ? "We added your competitor but couldn't scan their page. Check the URL or try again — we'll keep monitoring."
              : 'We scanned their site and compiled the intelligence below. We re-check automatically every week.'}
          </p>
        </div>

        {/* The report itself (or graceful fallback) */}
        {!isError && (
          <BattleCardContent
            cardData={onboardingCard}
            loading={onboardingCardLoading}
            error={onboardingCardError}
            loadingLabel="Building your first battle card..."
          />
        )}

        {/* Actions */}
        <div className="p-6 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={resetAndAddAnother}
            className="w-full sm:w-auto px-5 py-3 border border-[var(--border-default)] hover:bg-[var(--fill-subtle-hover)] text-sm font-semibold transition-colors cursor-pointer"
            style={{ background: 'var(--fill-subtle)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)' }}
          >
            Add another competitor
          </button>
          <button
            onClick={() => setOnboardingStep(3)}
            className="w-full sm:w-auto px-5 py-3 text-[var(--accent-text)] text-sm font-semibold transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-md)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
          >
            Go to Dashboard <ArrowRight size={14} className="inline ml-1 -mt-0.5" />
          </button>
        </div>
      </motion.div>
    );
  }
  // ── Signal scoring — derived from REAL fields only (never invented numbers) ──
  const TYPE_WEIGHT: Record<string, number> = {
    pricing_change: 100, repositioning: 86, positioning_shift: 86,
    new_feature: 74, feature_add: 74, review_trend: 64, minor_copy: 36,
    initial_scan: 42, no_change: 14,
  };
  const TYPE_LABEL: Record<string, string> = {
    pricing_change: 'Pricing change', repositioning: 'Repositioning', positioning_shift: 'Repositioning',
    new_feature: 'New feature', feature_add: 'New feature', review_trend: 'Review shift',
    minor_copy: 'Copy change', initial_scan: 'Now tracking', no_change: 'No change',
  };
  const eventSignal = (ev: any): number => {
    const base = TYPE_WEIGHT[ev?.change_type] ?? 48;
    const ts = ev?.detected_at ? new Date(ev.detected_at).getTime() : 0;
    const days = ts ? (Date.now() - ts) / 86400000 : 60;
    const recency = Math.max(0, 1 - days / 30);
    const mag = Math.min(1, Math.abs(ev?.net_char_delta || 0) / 2000);
    return Math.min(99, Math.round(base * 0.68 + recency * 22 + mag * 10));
  };
  const hostnameOf = (u: string) => competitorDomain(u);

  const rankedEvents = [...feedEvents].sort((a, b) => eventSignal(b) - eventSignal(a));
  const topEvent = rankedEvents[0] || null;
  const topIsReal = !!topEvent && topEvent.change_type !== 'initial_scan' && topEvent.change_type !== 'no_change';

  const rankedComps = [...(dashboardData.competitors_health || [])].map((c) => {
    const evs = feedEvents.filter((e: any) => e.competitor_id === c.id);
    const signal = evs.length ? Math.max(...evs.map(eventSignal)) : (c.total_changes > 0 ? 52 : 22);
    const latest = [...evs].sort((a: any, b: any) => eventSignal(b) - eventSignal(a))[0] || null;
    return { ...c, signal, latest };
  }).sort((a, b) => b.signal - a.signal);
  const anyRealSignal = rankedComps.some((c: any) => c.latest && c.latest.change_type !== 'initial_scan' && c.latest.change_type !== 'no_change');

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();

  return (
    <div className="space-y-5">
      {/* THE BRIEF — leads with the single most important real signal */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="rs-card p-6 lg:p-7"
      >
        <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
          {topIsReal ? (
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
              <span className="sr-pulse" /> Top signal
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>Briefing</span>
          )}
          <span>· {dateLabel}</span>
        </div>

        {topIsReal ? (
          <>
            <h2 className="font-semibold tracking-tight leading-[1.15] max-w-2xl" style={{ color: 'var(--text-primary)', fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--accent-primary)' }}>{topEvent.competitor_name}</span>{' — '}{(TYPE_LABEL[topEvent.change_type] || 'change').toLowerCase()} detected.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
              {topEvent.brief_text || 'Their homepage changed. Open the battle card for the full breakdown and the play to run.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={`/competitors/${topEvent.competitor_id}`} className="rs-btn-primary">
                Open battle card <ArrowRight size={14} />
              </Link>
              <a href="#feed" className="rs-btn-ghost">See all changes</a>
            </div>
          </>
        ) : dashboardData.competitor_count > 0 ? (
          <>
            <h2 className="font-semibold tracking-tight max-w-2xl" style={{ color: 'var(--text-primary)', fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
              Watching <span style={{ color: 'var(--accent-primary)' }}>{dashboardData.competitor_count}</span> {dashboardData.competitor_count === 1 ? 'competitor' : 'competitors'}. No moves yet.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              We&apos;re watching their homepages, pricing, reviews and hiring. The first real change surfaces here the moment it lands — we re-scan every week.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/competitors" className="rs-btn-primary"><Plus size={14} /> Add more competitors</Link>
              <a href="#feed" className="rs-btn-ghost">See baselines</a>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold tracking-tight" style={{ color: 'var(--text-primary)', fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>Add your first competitor.</h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>Point Rivalscope at a competitor and we&apos;ll capture their homepage, reviews and hiring — then flag every move before it costs you a deal.</p>
            <div className="mt-5"><Link href="/competitors" className="rs-btn-primary"><Plus size={14} /> Add a competitor</Link></div>
          </>
        )}

        {/* Compact real metric strip — ledger, hairline-divided */}
        <div className="mt-6 pt-5 grid grid-cols-2 sm:grid-cols-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { k: 'Tracked', v: dashboardData.competitor_count, sub: 'competitors' },
            { k: 'Changes · 7d', v: dashboardData.changes_this_week || 0, sub: 'this week' },
            { k: 'Needs review', v: dashboardData.pending_count, sub: 'in queue', accent: dashboardData.pending_count > 0 },
            { k: 'Avg review', v: dashboardData.avg_review_score, dec: 1, sub: 'all platforms' },
          ].map((m, i) => (
            <div key={m.k} style={i > 0 ? { paddingLeft: 18, borderLeft: '1px solid var(--border-subtle)' } : undefined} className="py-1">
              <p className="rs-label text-[9.5px]">{m.k}</p>
              <p className="font-mono tabular-nums font-semibold text-[24px] leading-none mt-3" style={{ color: m.accent ? 'var(--accent-primary)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {typeof m.v === 'number' ? <CountUp value={m.v} decimals={m.dec || 0} /> : '—'}
              </p>
              <p className="text-[9.5px] mt-2 font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* SIGNAL BOARD — competitors ranked by real signal; lime marks the hot one */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="rs-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 gap-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="rs-heading-sm">Signal Board</h2>
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{rankedComps.length} tracked · {anyRealSignal ? 'ranked by signal' : 'baselines captured'}</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {activityDays.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="rs-label text-[9px]">28d</span>
                {renderSparkline(activityDays.map((d: any) => d.change_count))}
              </div>
            )}
            <Link href="/competitors" className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Manage →</Link>
          </div>
        </div>

        {rankedComps.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {rankedComps.map((c, idx) => {
                const hot = idx === 0 && c.signal >= 55 && !!c.latest && c.latest.change_type !== 'initial_scan';
                const hotBg = 'linear-gradient(90deg, var(--accent-subtle), transparent 42%)';
                return (
                  <div
                    key={c.id}
                    className="relative grid items-center gap-4 px-5 py-4 transition-colors duration-150"
                    style={{ gridTemplateColumns: '24px 1.5fr 2fr 92px 64px auto', borderTop: idx ? '1px solid var(--border-subtle)' : 'none', background: hot ? hotBg : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = hot ? hotBg : 'var(--fill-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = hot ? hotBg : 'transparent')}
                  >
                    {hot && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--accent-primary)' }} />}
                    <span className="font-mono tabular-nums text-[12px]" style={{ color: hot ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={`https://www.google.com/s2/favicons?domain=${hostnameOf(c.url)}&sz=32`} alt="" className="w-6 h-6 rounded flex-shrink-0" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', padding: 2 }} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name || hostnameOf(c.url)}</div>
                        <div className="font-mono text-[9.5px] truncate" style={{ color: 'var(--text-muted)' }}>{hostnameOf(c.url)}</div>
                      </div>
                    </div>
                    <div className="text-[12px] flex items-center gap-2 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                      {c.latest ? (
                        <>
                          <span className={`badge badge-${c.latest.change_type} flex-shrink-0`}>{c.latest.change_type === 'initial_scan' ? 'New' : (TYPE_LABEL[c.latest.change_type] || 'Change')}</span>
                          <span className="truncate">{c.latest.brief_text || 'Update detected'}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No changes yet</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 42, height: 4, background: 'var(--fill-subtle-hover)' }}><span style={{ display: 'block', height: '100%', width: `${c.signal}%`, background: hot ? 'var(--accent-primary)' : 'var(--text-muted)' }} /></span>
                      <span className="font-mono tabular-nums text-[11px] w-6 text-right" style={{ color: hot ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{c.signal}</span>
                    </div>
                    <span className="font-mono text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(c.last_scanned)}</span>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => scanNow(c.id)} disabled={!!scanningCompId || readOnly} title={readOnly ? 'Your trial has ended — upgrade to resume scans' : 'Scan now'} className="p-2 cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                        {readOnly ? <Lock size={13} /> : scanningCompId === c.id ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-primary)' }} /> : scanDoneCompId === c.id ? <CheckCircle2 size={13} style={{ color: 'var(--tone-positive)' }} /> : <RefreshCw size={13} />}
                      </button>
                      <Link href={`/competitors/${c.id}`} className="font-mono text-[10.5px] whitespace-nowrap" style={{ color: hot ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>Card →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No competitors tracked yet.</p>
            <Link href="/competitors" className="rs-btn-primary inline-flex"><Plus size={14} /> Add your first competitor</Link>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C) INTEL FEED */}
        <div id="feed" className="rs-card lg:col-span-2 flex flex-col">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="rs-heading-md">Intel Feed</h2>
            <p className="rs-body-sm mt-0.5">Chronological timeline of competitor changes</p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] flex-1">
            {feedEvents.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-3">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No change events yet</p>
                <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Add a competitor and run your first scan to start tracking changes.</p>
                <a href="/competitors" className="mt-1 inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded" style={{ background: 'var(--accent-cta)', color: 'var(--accent-text)' }}>
                  Add competitor
                </a>
              </div>
            ) : (
              feedEvents.map((event, idx) => {
                const isExpanded = expandedEventId === event.id;
                const hostname = competitorDomain(event.competitor_url);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="p-4 transition-colors duration-150"
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
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{event.competitor_name || hostname}</span>
                          <time suppressHydrationWarning className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(event.detected_at)}</time>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-${event.change_type}`}>
                            {event.change_type === 'initial_scan' ? 'New' : event.change_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className={`text-[13px] leading-relaxed cursor-pointer transition-colors ${isExpanded ? '' : 'line-clamp-2'}`}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {event.brief_text || 'Website copy updated.'}
                        </p>

                        <div className="flex items-center gap-4 mt-3">
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
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] inline-flex items-center gap-0.5 py-2 -my-2 px-1 -mx-1 cursor-pointer"
                            >
                              {isExpanded ? <>Collapse <ChevronUp size={12} /></> : <>Expand <ChevronDown size={12} /></>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {hasMoreFeed && (
            <div className="p-4 border-t border-[var(--border-subtle)] text-center">
              <button
                onClick={loadMoreFeed}
                disabled={loadingFeed}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--fill-subtle)] active:bg-[var(--fill-subtle-hover)] text-sm font-semibold text-[var(--text-primary)] transition-colors cursor-pointer bg-[var(--fill-subtle)]"
              >
                {loadingFeed ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    Loading…
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
                  ? { color: p.positive, bg: 'color-mix(in srgb, var(--tone-positive) 12%, transparent)', border: 'color-mix(in srgb, var(--tone-positive) 28%, transparent)' }
                  : comp.status === 'Error'
                  ? { color: p.danger, bg: 'color-mix(in srgb, var(--tone-danger) 12%, transparent)', border: 'color-mix(in srgb, var(--tone-danger) 28%, transparent)' }
                  : { color: 'var(--text-muted)', bg: 'var(--fill-subtle)', border: 'var(--border-default)' };

                return (
                  <div
                    key={comp.id}
                    className="p-4 space-y-3 transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fill-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{comp.name || hostnameOf(comp.url)}</h3>
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
                            <><Star size={11} style={{ color: 'var(--tone-warning)' }} />{comp.avg_rating.toFixed(1)}</>
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
                          disabled={!!scanningCompId || readOnly}
                          className="inline-flex items-center justify-center p-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)' }}
                          title={readOnly ? 'Your trial has ended — upgrade to resume scans' : 'Scan now'}
                        >
                          {readOnly ? (
                            <Lock size={13} />
                          ) : scanningCompId === comp.id ? (
                            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                          ) : scanDoneCompId === comp.id ? (
                            <CheckCircle2 size={13} style={{ color: 'var(--tone-positive)' }} />
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
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>No competitors tracked</p>
                <a href="/competitors" className="text-xs font-semibold px-3 py-2 rounded" style={{ background: 'var(--accent-cta)', color: 'var(--accent-text)' }}>
                  Add one
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
