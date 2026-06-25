'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Star, ArrowRight, Loader2, Globe, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Plus, Compass, CheckCircle2, MapPin, Sparkles, Check } from 'lucide-react';
import { DashboardData, Competitor, BusinessProfile, DiscoveredCompetitor, HeadToHead as HeadToHeadType } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { useChartPalette } from '@/lib/chart-theme';
import { isAbortError } from '@/lib/fetch-utils';
import { competitorDomain } from '@/lib/utils';
import BattleCardContent, { BattleCardData, normalizeBattleCard } from '@/components/battle-card-content';
import HeadToHead from '@/components/head-to-head';
import CountUp from '@/components/count-up';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  // Onboarding states. Numeric steps (-1/0/1/2/3) are the legacy modal and are
  // load-bearing (the scan poll keys on step === 1; finale on === 2). The magic
  // flow adds string steps ('website' | 'analyzing' | 'review') at the FRONT;
  // they're inert against the numeric guards by design. A fresh user lands on
  // 'website'; -1/0 stay reachable as the profile-failure fallback.
  type OnboardingStep = number | 'website' | 'analyzing' | 'review';
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(() => {
    return competitors.length === 0 ? 'website' : 3;
  });
  const [selectedBusinessType, setSelectedBusinessType] = useState<'saas' | 'local'>(isLocalBusiness ? 'local' : 'saas');

  // Magic onboarding: user's own site → AI profile → discovered competitors.
  // Kept SEPARATE from onboardingUrl/onboardingName (those belong to the legacy
  // single-add + finale header); we only write into those at the hand-off.
  const [magicUrl, setMagicUrl] = useState('');
  const [magicError, setMagicError] = useState('');
  const [analyzingLine, setAnalyzingLine] = useState(0);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [profileName, setProfileName] = useState(''); // editable business name
  const [discovered, setDiscovered] = useState<DiscoveredCompetitor[]>([]);
  const [discoverReason, setDiscoverReason] = useState<string | null>(null);
  const [checkedUrls, setCheckedUrls] = useState<Set<string>>(new Set());
  const [manualUrl, setManualUrl] = useState('');
  const [startingTracking, setStartingTracking] = useState(false);
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
  // Comparative verdict (rides along the same battle-card response); self-hides
  // when the user has no business profile.
  const [onboardingHeadToHead, setOnboardingHeadToHead] = useState<HeadToHeadType | null>(null);

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
      const raw = await res.json();
      setOnboardingCard(normalizeBattleCard(raw));
      setOnboardingHeadToHead(raw.head_to_head ?? null);
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

  // ── MAGIC ONBOARDING ──────────────────────────────────────────────────────
  const api = createApiClient(userId);

  const ANALYZING_LINES = [
    'Reading your site…',
    'Building your profile…',
    'Finding your competitors…',
  ];

  // Cycle the status lines while the (real) profile + discover calls run.
  useEffect(() => {
    if (onboardingStep !== 'analyzing') return;
    setAnalyzingLine(0);
    const id = setInterval(() => {
      setAnalyzingLine((n) => Math.min(n + 1, ANALYZING_LINES.length - 1));
    }, 1400);
    return () => clearInterval(id);
  }, [onboardingStep]);

  // Step 1 → 2: profile the user's own site, then discover competitors.
  const analyzeMyBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const urlVal = ((fd.get('magicUrl') as string) || magicUrl || '').trim();
    if (!urlVal) {
      setMagicError('Please enter your website.');
      return;
    }
    setMagicUrl(urlVal);
    setMagicError('');
    setOnboardingStep('analyzing');

    let prof: BusinessProfile | null = null;
    try {
      const res = await api.profileBusiness(urlVal);
      prof = res.profile;
      setProfile(prof);
      setProfileName(prof.name || '');
      // The profile decides saas vs local server-side; sync local state so the
      // downstream scanNow / local-vs-saas branches behave.
      setSelectedBusinessType(res.is_saas ? 'saas' : 'local');
    } catch (err) {
      if (isAbortError(err)) return;
      // Network/AI fail must never trap the user — fall back to manual add.
      setProfile(null);
    }

    // Discover competitors (best-effort; SaaS only on the backend).
    try {
      const disc = await api.discoverCompetitors();
      const comps = disc.competitors || [];
      setDiscovered(comps);
      setDiscoverReason(disc.reason);
      setCheckedUrls(new Set(comps.map((c) => c.url))); // all pre-checked
    } catch (err) {
      if (isAbortError(err)) return;
      setDiscovered([]);
      setDiscoverReason('none_suggested');
    }

    setOnboardingStep('review');
  };

  const toggleChecked = (url: string) => {
    setCheckedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  // Add a single competitor and return its id + job_id (the inline POST shape;
  // api.addCompetitor omits job_id which the finale needs).
  const addOneCompetitor = async (url: string, name?: string): Promise<{ id: string; job_id: string } | null> => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userId}` },
        body: JSON.stringify({ url, name: name || '' }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return { id: data.id, job_id: data.job_id };
    } catch (e) {
      if (!isAbortError(e)) console.error(e);
      return null;
    }
  };

  // Step 2 → existing scan/battlecard tail. Add every chosen competitor, then
  // hand the FIRST one off to the legacy step 1 (poll) → 2 (battlecard) flow by
  // populating onboardingCompId/JobId/Url/Name; the rest scan in the background.
  const startTracking = async () => {
    if (startingTracking) return;

    // One uniform list across every `reason` branch: checked discovered comps +
    // an optional manual URL.
    const toAdd: { url: string; name?: string }[] = discovered
      .filter((c) => checkedUrls.has(c.url))
      .map((c) => ({ url: c.url, name: c.name }));
    const manual = manualUrl.trim();
    if (manual) toAdd.push({ url: manual });

    if (toAdd.length === 0) {
      setMagicError('Pick at least one competitor or add one by URL.');
      return;
    }

    setStartingTracking(true);
    setMagicError('');

    const results = await Promise.all(toAdd.map((c) => addOneCompetitor(c.url, c.name)));
    const added = toAdd
      .map((c, i) => ({ ...c, res: results[i] }))
      .filter((c) => c.res);

    if (added.length === 0) {
      setStartingTracking(false);
      setMagicError('We could not add those competitors. Check the URLs and try again.');
      return;
    }

    // Hand the primary off to the legacy poll → battlecard tail.
    const primary = added[0];
    setOnboardingCompId(primary.res!.id);
    setOnboardingJobId(primary.res!.job_id);
    setOnboardingName(primary.name || '');
    setOnboardingUrl(primary.url);
    setStartingTracking(false);
    setOnboardingStep(1); // legacy scan-progress step
  };

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
    // Read straight from the DOM inputs, falling back to React state — same
    // fix as the login form: password-manager/programmatic fills set
    // input.value without firing React's onChange, leaving state empty.
    const fd = new FormData(e.currentTarget);
    const urlVal = ((fd.get('url') as string) || onboardingUrl || '').trim();
    const nameVal = (fd.get('name') as string) || onboardingName || '';
    if (!urlVal) {
      setOnboardingError("Please enter your competitor's URL.");
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

  // ── MAGIC STEP 1: YOUR WEBSITE ───────────────────────────────────────────
  if (onboardingStep === 'website') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-7 shadow-lg md:p-8"
        >
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Let&apos;s set up your competitive radar</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tell us your website and we&apos;ll read it, build your profile, and find who you&apos;re up against.
            </p>
          </div>

          <form onSubmit={analyzeMyBusiness} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="magic-url">Your website</Label>
              <Input
                id="magic-url"
                name="magicUrl"
                type="text"
                autoFocus
                placeholder="yourcompany.com"
                value={magicUrl}
                onChange={(e) => setMagicUrl(e.target.value)}
              />
            </div>

            {magicError && <p className="text-xs font-medium text-destructive">{magicError}</p>}

            <Button type="submit" size="lg" className="w-full">
              Analyze my business <ArrowRight size={14} />
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Takes a few seconds. You can edit everything before we start tracking.
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── MAGIC STEP 2: ANALYZING ──────────────────────────────────────────────
  if (onboardingStep === 'analyzing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg"
        >
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Setting up your radar</h2>
          <div className="mx-auto mt-5 flex max-w-xs flex-col gap-2.5">
            {ANALYZING_LINES.map((line, i) => {
              const done = i < analyzingLine;
              const active = i === analyzingLine;
              return (
                <div key={line} className="flex items-center gap-2.5 text-sm">
                  <span className="flex h-4 w-4 flex-none items-center justify-center">
                    {done ? (
                      <Check size={14} className="text-primary" />
                    ) : active ? (
                      <Loader2 size={14} className="animate-spin text-primary" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-border" />
                    )}
                  </span>
                  <span className={done || active ? 'text-foreground' : 'text-muted-foreground'}>{line}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── MAGIC STEP 3: REVIEW PROFILE + COMPETITORS ───────────────────────────
  if (onboardingStep === 'review') {
    const isLocal = discoverReason === 'local' || selectedBusinessType === 'local';
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 sm:py-12">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg space-y-5"
        >
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Here&apos;s what we found</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Review it, edit anything that&apos;s off, then start tracking.</p>
          </div>

          {/* Your business */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">Your business</span>
              {profile?.source === 'fallback' && (
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Best guess
                </span>
              )}
            </div>

            {profile ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Business name</Label>
                  <Input
                    id="profile-name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                {profile.one_liner && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{profile.one_liner}</p>
                )}
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="mt-0.5 text-sm text-foreground">{profile.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Positioning</p>
                    <p className="mt-0.5 text-sm text-foreground">{profile.positioning || '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">We read this from your site — edit anything that&apos;s off.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t read your site automatically — no problem. Add a competitor below and we&apos;ll take it from there.
              </p>
            )}
          </div>

          {/* Your top competitors */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">
                {isLocal ? 'Your competitors' : 'Your top competitors'}
              </span>
              {!isLocal && discovered.length > 0 && (
                <span className="font-mono text-xs text-muted-foreground">{checkedUrls.size} selected</span>
              )}
            </div>

            {isLocal ? (
              <p className="mb-4 text-sm text-muted-foreground">
                We&apos;ll track competitors you add manually.
              </p>
            ) : discovered.length > 0 ? (
              <div className="-mx-1.5 mb-4 mt-3 divide-y divide-border">
                {discovered.map((c) => {
                  const checked = checkedUrls.has(c.url);
                  return (
                    <button
                      key={c.url}
                      type="button"
                      onClick={() => toggleChecked(c.url)}
                      className="flex w-full items-start gap-3 rounded-lg px-1.5 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors"
                        style={{
                          borderColor: checked ? 'var(--primary)' : 'var(--border)',
                          backgroundColor: checked ? 'var(--primary)' : 'transparent',
                        }}
                      >
                        {checked && <Check size={11} className="text-primary-foreground" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{c.name}</span>
                          <span className="truncate font-mono text-xs text-muted-foreground">{competitorDomain(c.url)}</span>
                        </span>
                        {c.why && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{c.why}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                We couldn&apos;t auto-suggest competitors. Add your first one below.
              </p>
            )}

            {/* Manual add — ALWAYS visible */}
            <div className="space-y-1.5 border-t border-border pt-4">
              <Label htmlFor="manual-url">
                {isLocal || discovered.length === 0 ? 'Add your first competitor' : 'Add another by URL'}
              </Label>
              <Input
                id="manual-url"
                type="text"
                placeholder="competitor.com"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
              />
            </div>
          </div>

          {magicError && <p className="text-center text-xs font-medium text-destructive">{magicError}</p>}

          <div className="flex flex-col gap-2">
            <Button onClick={startTracking} disabled={startingTracking} size="lg" className="w-full">
              {startingTracking ? (
                <><Loader2 size={16} className="animate-spin" /> Setting up…</>
              ) : (
                <>Start tracking <ArrowRight size={14} /></>
              )}
            </Button>
            <button
              type="button"
              onClick={() => setOnboardingStep(3)}
              className="mx-auto text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Skip for now
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── ONBOARDING STEP -1: BUSINESS TYPE SELECTION ──────────────────────────
  if (onboardingStep === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-card border border-border shadow-lg rounded-xl p-6 md:p-8 max-w-md w-full"
        >
          <div className="text-center mb-7">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Compass size={24} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">What kind of business are you?</h2>
            <p className="text-sm mt-1 text-muted-foreground">We&apos;ll personalize what you track and how we report it.</p>
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
                  className="relative flex items-center gap-3 text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer"
                  style={{
                    borderColor: selected ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: selected ? 'color-mix(in oklch, var(--primary) 10%, transparent)' : 'var(--muted)',
                    boxShadow: selected ? 'inset 3px 0 0 var(--primary)' : 'none',
                  }}
                >
                  <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground">{title}</span>
                    <span className="block text-[11px] leading-snug truncate text-muted-foreground">{desc}</span>
                  </span>
                  {selected && (
                    <CheckCircle2 size={14} className="shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={() => confirmBusinessType(selectedBusinessType)}
            disabled={savingBusinessType}
            className="w-full"
            size="lg"
          >
            {savingBusinessType ? (
              <><Loader2 size={16} className="animate-spin" /> Saving…</>
            ) : (
              <>Continue as {selectedBusinessType === 'saas' ? 'SaaS' : 'Local Business'} <ArrowRight size={14} /></>
            )}
          </Button>
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
          className="relative z-10 bg-card border border-border shadow-lg rounded-xl p-6 md:p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
              {selectedBusinessType === 'local' ? <MapPin size={24} /> : <Compass size={24} />}
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {selectedBusinessType === 'local' ? "Add your first local competitor" : "Add your first competitor"}
            </h2>
            <p className="text-sm mt-1 text-muted-foreground">
              {selectedBusinessType === 'local'
                ? "We'll track their Google Maps reviews, social posts, and nearby presence."
                : "We'll start monitoring them instantly in real-time."}
            </p>
          </div>

          <form onSubmit={submitOnboardingCompetitor} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-url">
                {selectedBusinessType === 'local' ? 'Competitor Website URL *' : 'Competitor URL *'}
              </Label>
              <Input
                id="onboarding-url"
                type="text"
                name="url"
                required
                placeholder={selectedBusinessType === 'local' ? 'e.g. rivalcafe.com' : 'e.g. competitor.com'}
                value={onboardingUrl}
                onChange={(e) => setOnboardingUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="onboarding-name">Business Name (Optional)</Label>
              <Input
                id="onboarding-name"
                type="text"
                name="name"
                placeholder={selectedBusinessType === 'local' ? 'e.g. Rival Cafe Downtown' : 'e.g. Rival Inc'}
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
              />
            </div>

            {selectedBusinessType === 'local' ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-maps">Google Maps URL (Optional)</Label>
                  <Input
                    id="onboarding-maps"
                    type="text"
                    placeholder="e.g. maps.google.com/place/..."
                    value={onboardingMapsUrl}
                    onChange={(e) => setOnboardingMapsUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-instagram">Instagram Handle (Optional)</Label>
                  <Input
                    id="onboarding-instagram"
                    type="text"
                    placeholder="e.g. @rivalcafe"
                    value={onboardingInstagram}
                    onChange={(e) => setOnboardingInstagram(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-g2">G2 or Trustpilot URL (Optional)</Label>
                <Input
                  id="onboarding-g2"
                  type="text"
                  placeholder="e.g. g2.com/products/competitor/reviews"
                  value={onboardingG2Url}
                  onChange={(e) => setOnboardingG2Url(e.target.value)}
                />
              </div>
            )}

            {onboardingError && (
              <p className="text-xs font-medium text-destructive">{onboardingError}</p>
            )}

            <Button
              type="submit"
              disabled={submittingOnboarding}
              className="w-full"
              size="lg"
            >
              {submittingOnboarding ? (
                <><Loader2 size={16} className="animate-spin" /> Creating…</>
              ) : (
                'Add Competitor + Run First Scan'
              )}
            </Button>

            <div className="text-center pt-2 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setOnboardingStep(-1)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                ← Change type
              </button>
              <button
                type="button"
                onClick={() => setOnboardingStep(3)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
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
      <div className="bg-card border border-border rounded-xl p-8 max-w-xl mx-auto shadow-sm text-center space-y-6 my-12">
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 border-4 rounded-full border-border"></div>
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
          <Building2 size={36} className="text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Running your initial scan...</h2>
          <p className="text-sm max-w-sm mx-auto text-muted-foreground">
            We are analyzing the competitor homepage for copy structures, pricing, and reviews.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 max-w-xs mx-auto bg-muted border border-border rounded-lg p-4">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Live Status</span>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Loader2 size={16} className="animate-spin text-primary" />
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
      setOnboardingHeadToHead(null);
      setOnboardingCardError('');
      setOnboardingStep(0);
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border border-border rounded-xl max-w-2xl mx-auto shadow-sm my-10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted text-center space-y-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${isError ? 'bg-destructive/10 border-destructive/25' : 'bg-emerald-500/10 border-emerald-500/25'}`}>
            {isError ? <AlertTriangle size={24} className="text-destructive" /> : <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {isError ? 'Scan had an issue' : `Your first report on ${compLabel}`}
          </h2>
          <p className="text-sm max-w-md mx-auto text-muted-foreground">
            {isError
              ? "We added your competitor but couldn't scan their page. Check the URL or try again — we'll keep monitoring."
              : 'We scanned their site and compiled the intelligence below. We re-check automatically every week.'}
          </p>
        </div>

        {/* Head-to-head verdict — the onboarding climax (self-hides when absent) */}
        {!isError && onboardingHeadToHead && (
          <div className="p-6 pb-0">
            <HeadToHead data={onboardingHeadToHead} competitorName={compLabel} />
          </div>
        )}

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
        <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={resetAndAddAnother}
            className="w-full sm:w-auto"
          >
            Add another competitor
          </Button>
          <Button
            onClick={() => setOnboardingStep(3)}
            className="w-full sm:w-auto"
          >
            Go to Dashboard <ArrowRight size={14} className="ml-1" />
          </Button>
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

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div className="space-y-5">
      {/* THE BRIEF — leads with the single most important real signal */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border border-border rounded-xl shadow-sm p-6 lg:p-7"
      >
        <div className="flex items-center gap-3 mb-4 text-[12px] font-medium tracking-tight text-muted-foreground">
          {topIsReal ? (
            <span className="inline-flex items-center gap-2 text-primary">
              <span className="sr-pulse" /> Top signal
            </span>
          ) : (
            <span className="text-muted-foreground">Briefing</span>
          )}
          <span className="font-mono">· {dateLabel}</span>
        </div>

        {topIsReal ? (
          <>
            <h2 className="font-semibold tracking-tight leading-[1.15] max-w-2xl text-foreground" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
              <span className="text-primary">{topEvent.competitor_name}</span>{' — '}{(TYPE_LABEL[topEvent.change_type] || 'change').toLowerCase()} detected.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl line-clamp-3 text-muted-foreground">
              {topEvent.brief_text || 'Their homepage changed. Open the battle card for the full breakdown and the play to run.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href={`/competitors/${topEvent.competitor_id}`}>
                  Open battle card <ArrowRight size={14} />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#feed">See all changes</a>
              </Button>
            </div>
          </>
        ) : dashboardData.competitor_count > 0 ? (
          <>
            <h2 className="font-semibold tracking-tight max-w-2xl text-foreground" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>
              Watching <span className="text-primary">{dashboardData.competitor_count}</span> {dashboardData.competitor_count === 1 ? 'competitor' : 'competitors'}. No moves yet.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl text-muted-foreground">
              We&apos;re watching their homepages, pricing, reviews and hiring. The first real change surfaces here the moment it lands — we re-scan every week.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/competitors"><Plus size={14} /> Add more competitors</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#feed">See baselines</a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold tracking-tight text-foreground" style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', letterSpacing: '-0.02em' }}>Add your first competitor.</h2>
            <p className="mt-3 text-[14px] leading-relaxed max-w-xl text-muted-foreground">Point Rivalscope at a competitor and we&apos;ll capture their homepage, reviews and hiring — then flag every move before it costs you a deal.</p>
            <div className="mt-5">
              <Button asChild>
                <Link href="/competitors"><Plus size={14} /> Add a competitor</Link>
              </Button>
            </div>
          </>
        )}

        {/* Compact real metric strip — ledger, hairline-divided */}
        <div className="mt-6 pt-5 grid grid-cols-2 sm:grid-cols-4 border-t border-border">
          {[
            { k: 'Tracked', v: dashboardData.competitor_count, sub: 'competitors' },
            { k: 'Changes · 7d', v: dashboardData.changes_this_week || 0, sub: 'this week' },
            { k: 'Needs review', v: dashboardData.pending_count, sub: 'in queue', accent: dashboardData.pending_count > 0 },
            { k: 'Avg review', v: dashboardData.avg_review_score, dec: 1, sub: 'all platforms' },
          ].map((m, i) => (
            <div key={m.k} className={`py-1 ${i > 0 ? 'pl-[18px] border-l border-border' : ''}`}>
              <p className="text-[11px] font-medium tracking-tight text-muted-foreground">{m.k}</p>
              <p className="font-mono tabular-nums font-semibold text-[24px] leading-none mt-3" style={{ color: m.accent ? 'var(--primary)' : undefined, letterSpacing: '-0.02em' }}>
                <span className={m.accent ? 'text-primary' : 'text-foreground'}>
                  {typeof m.v === 'number' ? <CountUp value={m.v} decimals={m.dec || 0} /> : '—'}
                </span>
              </p>
              <p className="text-[11px] mt-2 tracking-tight text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* SIGNAL BOARD — competitors ranked by real signal */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 gap-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-[17px] font-semibold text-foreground">Signal Board</h2>
            <span className="font-mono text-[10px] truncate text-muted-foreground">{rankedComps.length} tracked · {anyRealSignal ? 'ranked by signal' : 'baselines captured'}</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {activityDays.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-[0.04em] text-muted-foreground">28d</span>
                {renderSparkline(activityDays.map((d: any) => d.change_count))}
              </div>
            )}
            <Link href="/competitors" className="text-[12px] font-medium tracking-tight text-muted-foreground hover:text-foreground transition-colors">Manage →</Link>
          </div>
        </div>

        {rankedComps.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              {rankedComps.map((c, idx) => {
                const hot = idx === 0 && c.signal >= 55 && !!c.latest && c.latest.change_type !== 'initial_scan';
                const hotBg = 'linear-gradient(90deg, color-mix(in oklch, var(--primary) 8%, transparent), transparent 42%)';
                return (
                  <div
                    key={c.id}
                    className="relative grid items-center gap-4 px-5 py-4 transition-colors duration-150"
                    style={{ gridTemplateColumns: '24px 1.5fr 2fr 92px 64px auto', borderTop: idx ? '1px solid var(--border)' : 'none', background: hot ? hotBg : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = hot ? hotBg : 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = hot ? hotBg : 'transparent')}
                  >
                    {hot && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--primary)' }} />}
                    <span className={`font-mono tabular-nums text-[12px] ${hot ? 'text-primary' : 'text-muted-foreground'}`}>{String(idx + 1).padStart(2, '0')}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={`https://www.google.com/s2/favicons?domain=${hostnameOf(c.url)}&sz=32`} alt="" className="w-6 h-6 rounded flex-shrink-0 bg-card border border-border p-0.5" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate text-foreground">{c.name || hostnameOf(c.url)}</div>
                        <div className="font-mono text-[9.5px] truncate text-muted-foreground">{hostnameOf(c.url)}</div>
                      </div>
                    </div>
                    <div className="text-[12px] flex items-center gap-2 min-w-0 text-muted-foreground">
                      {c.latest ? (
                        <>
                          <span className={`badge badge-${c.latest.change_type} flex-shrink-0`}>{c.latest.change_type === 'initial_scan' ? 'New' : (TYPE_LABEL[c.latest.change_type] || 'Change')}</span>
                          <span className="truncate">{c.latest.brief_text || 'Update detected'}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No changes yet</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="rounded-full overflow-hidden flex-shrink-0 bg-muted" style={{ width: 42, height: 4 }}><span style={{ display: 'block', height: '100%', width: `${c.signal}%`, background: hot ? 'var(--primary)' : 'var(--muted-foreground)' }} /></span>
                      <span className={`font-mono tabular-nums text-[11px] w-6 text-right ${hot ? 'text-primary' : 'text-muted-foreground'}`}>{c.signal}</span>
                    </div>
                    <span className="font-mono text-[10px] text-right text-muted-foreground">{formatTimeAgo(c.last_scanned)}</span>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => scanNow(c.id)} disabled={!!scanningCompId} title="Scan now" className="p-2 cursor-pointer transition-colors flex-shrink-0 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                        {scanningCompId === c.id ? <Loader2 size={13} className="animate-spin text-primary" /> : scanDoneCompId === c.id ? <CheckCircle2 size={13} className="text-emerald-500" /> : <RefreshCw size={13} />}
                      </button>
                      <Link href={`/competitors/${c.id}`} className={`font-mono text-[10.5px] whitespace-nowrap transition-colors ${hot ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Card →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
            <p className="text-[13px] text-muted-foreground">No competitors tracked yet.</p>
            <Button asChild>
              <Link href="/competitors"><Plus size={14} /> Add your first competitor</Link>
            </Button>
          </div>
        )}
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* C) INTEL FEED */}
        <div id="feed" className="bg-card border border-border rounded-xl shadow-sm lg:col-span-2 flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[17px] font-semibold text-foreground">Intel Feed</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Chronological timeline of competitor changes</p>
          </div>

          <div className="divide-y divide-border flex-1">
            {feedEvents.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-muted-foreground">No change events yet</p>
                <p className="text-xs max-w-xs leading-relaxed text-muted-foreground">Add a competitor and run your first scan to start tracking changes.</p>
                <Button asChild size="sm" className="mt-1">
                  <a href="/competitors">Add competitor</a>
                </Button>
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
                    className="p-4 transition-colors duration-150 hover:bg-muted"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                        alt=""
                        className="w-7 h-7 rounded-md flex-shrink-0 bg-card border border-border p-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[13px] font-semibold text-foreground">{event.competitor_name || hostname}</span>
                          <time suppressHydrationWarning className="text-[11px] font-mono flex-shrink-0 text-muted-foreground">{formatTimeAgo(event.detected_at)}</time>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-${event.change_type}`}>
                            {event.change_type === 'initial_scan' ? 'New' : event.change_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          className={`text-[13px] leading-relaxed cursor-pointer text-muted-foreground transition-colors hover:text-foreground ${isExpanded ? '' : 'line-clamp-2'}`}
                        >
                          {event.brief_text || 'Website copy updated.'}
                        </p>

                        <div className="flex items-center gap-4 mt-3">
                          <Link
                            href={`/competitors/${event.competitor_id}`}
                            className="text-[12px] font-semibold inline-flex items-center gap-1 transition-colors text-primary hover:text-primary/80"
                          >
                            Battle Card <ArrowRight size={11} />
                          </Link>
                          {event.brief_text && event.brief_text.length > 120 && (
                            <button
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 py-2 -my-2 px-1 -mx-1 cursor-pointer"
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
            <div className="p-4 border-t border-border text-center">
              <Button
                variant="outline"
                onClick={loadMoreFeed}
                disabled={loadingFeed}
                size="sm"
              >
                {loadingFeed ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-primary" />
                    Loading…
                  </>
                ) : (
                  'Load More Events'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* D) COMPETITOR HEALTH TABLE */}
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[17px] font-semibold text-foreground">Tracked Competitors</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Health and review averages</p>
          </div>

          <div className="divide-y divide-border flex-1 overflow-x-auto">
            {dashboardData.competitors_health && dashboardData.competitors_health.length > 0 ? (
              dashboardData.competitors_health.map((comp) => {
                const statusColor = comp.status === 'Active'
                  ? { color: p.positive, bg: 'color-mix(in srgb, var(--tone-positive) 12%, transparent)', border: 'color-mix(in srgb, var(--tone-positive) 28%, transparent)' }
                  : comp.status === 'Error'
                  ? { color: p.danger, bg: 'color-mix(in srgb, var(--tone-danger) 12%, transparent)', border: 'color-mix(in srgb, var(--tone-danger) 28%, transparent)' }
                  : { color: 'var(--muted-foreground)', bg: 'var(--muted)', border: 'var(--border)' };

                return (
                  <div
                    key={comp.id}
                    className="p-4 space-y-3 transition-colors duration-150 hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold truncate text-foreground">{comp.name || hostnameOf(comp.url)}</h3>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono truncate block transition-colors text-muted-foreground hover:text-foreground"
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
                        <span className="block mb-0.5 text-xs text-muted-foreground">Last Scanned</span>
                        <span suppressHydrationWarning className="text-[12px] font-mono text-muted-foreground">{formatTimeAgo(comp.last_scanned)}</span>
                      </div>
                      <div>
                        <span className="block mb-0.5 text-xs text-muted-foreground">Reviews Avg</span>
                        <span className="text-[12px] font-mono inline-flex items-center gap-1 text-muted-foreground">
                          {comp.avg_rating !== null ? (
                            <><Star size={11} style={{ color: 'var(--tone-warning)' }} />{comp.avg_rating.toFixed(1)}</>
                          ) : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">4-Week Activity</span>
                        <div className="h-6 flex items-center">{renderSparkline(comp.trend)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scanNow(comp.id)}
                          disabled={!!scanningCompId}
                          className="inline-flex items-center justify-center p-2 cursor-pointer transition-colors rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Scan now"
                        >
                          {scanningCompId === comp.id ? (
                            <Loader2 size={13} className="animate-spin text-primary" />
                          ) : scanDoneCompId === comp.id ? (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          ) : (
                            <RefreshCw size={13} />
                          )}
                        </button>
                        <Link
                          href={`/competitors/${comp.id}`}
                          className="text-[12px] font-semibold transition-colors text-primary hover:text-primary/80"
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
                <p className="text-[13px] font-medium text-muted-foreground">No competitors tracked</p>
                <Button asChild size="sm">
                  <a href="/competitors">Add one</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
