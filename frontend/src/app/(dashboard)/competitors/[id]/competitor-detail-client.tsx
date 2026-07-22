'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, AlertTriangle, MessageSquare, Trophy, Copy, Share2, RefreshCw, Pencil, Globe, Calendar, CheckCircle2, Clock, Circle, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import DataSourcesPanel from '@/components/data-sources-panel';
import HiringSignalCard from '@/components/hiring-signal-card';
import HeadToHead from '@/components/head-to-head';
import { battleCardItemText, isLlmMetaLine } from '@/lib/llm-meta';
import { renderInlineMarkdown } from '@/lib/markdown';
import { useChartPalette } from '@/lib/chart-theme';
import { useApiToken } from '@/lib/use-api-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

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

// Expand/collapse without animating height:auto (a layout property): the outer
// grid transitions grid-template-rows 0fr→1fr + opacity on design tokens only.
// Content stays mounted; `inert` + aria-hidden pull it out of the tab order and
// a11y tree while collapsed. Pair with aria-expanded/aria-controls on triggers.
function Collapse({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-(--duration-base) ease-(--ease-smooth) ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

interface CompetitorDetailClientProps {
  userId: string;
  initialDetail: any;
}

export default function CompetitorDetailClient({ userId, initialDetail }: CompetitorDetailClientProps) {
  const apiToken = useApiToken();
  const [detail, setDetail] = useState(initialDetail);
  const [scanning, setScanning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(detail.competitor.name || '');
  const [editUrl, setEditUrl] = useState(detail.competitor.url || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Gate time-dependent text (relative + locale/TZ-formatted dates) behind a
  // mounted flag so SSR output matches first client render (avoids React #418).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Collapse states for Battlecard accordions
  const [cardOpenSections, setCardOpenSections] = useState<Record<string, boolean>>({
    changes: true,
    weaknesses: true,
    talkingPoints: true,
    winConditions: true,
  });

  // Collapse states for timeline events
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const comp = detail.competitor;
  const chart = useChartPalette();
  const router = useRouter();

  const toggleSection = (section: string) => {
    setCardOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const endpoint = comp.business_type === 'local'
        ? `${apiUrl}/api/v1/local/scan/${comp.id}`
        : `${apiUrl}/api/v1/scan/now`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken ?? userId}`
        }
      });
      if (res.status === 402) {
        // Free test consumed → re-run the server layout so the paywall surfaces
        // (soft nav won't otherwise re-render the gated server components).
        router.refresh();
        return;
      }
      if (res.ok) {
        // Reload detail data
        const reloadRes = await fetch(`${apiUrl}/api/v1/competitors/${comp.id}/detail`, {
          headers: { Authorization: `Bearer ${apiToken ?? userId}` }
        });
        if (reloadRes.ok) {
          const freshData = await reloadRes.json();
          setDetail(freshData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const handleRegenerateBattlecard = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/battlecards/generate/${comp.id}?force=true`, {
        headers: { Authorization: `Bearer ${apiToken ?? userId}` }
      });
      if (res.status === 402) {
        // Free test consumed → re-run the server layout so the paywall surfaces
        // (soft nav won't otherwise re-render the gated server components).
        router.refresh();
        return;
      }
      if (res.ok) {
        const freshCard = await res.json();
        setDetail((prev: any) => ({ ...prev, battlecard: freshCard }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRegenerating(false);
    }
  };

  // Stop tracking = delete the competitor and all its scan history, then leave
  // the (now-gone) detail page. Mirrors the Settings-page delete but surfaced
  // where users actually manage a competitor.
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors/${comp.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiToken ?? userId}` },
      });
      if (res.ok) {
        router.push('/competitors');
        router.refresh();
      } else {
        setDeleting(false);
      }
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  const saveCompetitorSettings = async () => {
    setSavingSettings(true);
    setSettingsError('');
    try {
      // name/url live on the generic competitors PATCH; the /local/ endpoint
      // only handles local-business fields and silently ignores these.
      const res = await fetch(`${apiUrl}/api/v1/competitors/${comp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken ?? userId}`
        },
        body: JSON.stringify({ name: editName, url: editUrl })
      });
      if (res.ok) {
        setDetail((prev: any) => ({
          ...prev,
          competitor: { ...prev.competitor, name: editName, url: editUrl }
        }));
        setEditing(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setSettingsError(errData.detail || 'Failed to save changes. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setSettingsError('Connection error. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Word-level diff highlighter
  const renderDiff = (before: string, after: string) => {
    if (!before) return <p className="text-sm text-foreground">{after}</p>;
    if (!after) return <p className="text-sm text-foreground">{before}</p>;

    const beforeWords = before.split(/\s+/);
    const afterWords = after.split(/\s+/);
    const beforeSet = new Set(beforeWords);
    const afterSet = new Set(afterWords);

    const beforeRender = beforeWords.map((word, idx) => {
      const isDeleted = !afterSet.has(word);
      return (
        <span key={idx} className={isDeleted ? 'bg-[var(--tone-danger)]/15 text-[var(--tone-danger)] line-through px-0.5 rounded' : ''}>
          {word}{' '}
        </span>
      );
    });

    const afterRender = afterWords.map((word, idx) => {
      const isAdded = !beforeSet.has(word);
      return (
        <span key={idx} className={isAdded ? 'bg-[var(--tone-positive)]/15 text-[var(--tone-positive)] px-0.5 rounded font-medium' : ''}>
          {word}{' '}
        </span>
      );
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="p-3 bg-[var(--tone-danger)]/5 border border-[var(--tone-danger)]/15 rounded">
          <span className="text-xs uppercase font-bold text-[var(--tone-danger)] tracking-wider block mb-1">Before</span>
          <div className="text-xs leading-relaxed max-h-[150px] overflow-y-auto text-muted-foreground">{beforeRender}</div>
        </div>
        <div className="p-3 bg-[var(--tone-positive)]/5 border border-[var(--tone-positive)]/15 rounded">
          <span className="text-xs uppercase font-bold text-[var(--tone-positive)] tracking-wider block mb-1">After</span>
          <div className="text-xs leading-relaxed max-h-[150px] overflow-y-auto text-foreground">{afterRender}</div>
        </div>
      </div>
    );
  };

  // Cached cards can still carry LLM meta-filler lines (e.g. "No weaknesses
  // explicitly listed in input"); this surface reads the raw cache payload, so
  // drop them here like every other card surface does.
  const cleanCardList = (raw: unknown): unknown[] =>
    Array.isArray(raw)
      ? raw.filter((item) => battleCardItemText(item).trim() && !isLlmMetaLine(item))
      : [];
  const cardLists = {
    what_changed: cleanCardList(detail.battlecard?.what_changed),
    weaknesses: cleanCardList(detail.battlecard?.weaknesses),
    talking_points: cleanCardList(detail.battlecard?.talking_points),
    win_conditions: cleanCardList(detail.battlecard?.win_conditions),
  };

  // Text formatter for Copy
  const copyBattlecardToClipboard = () => {
    const card = detail.battlecard;
    if (!card) return;

    const text = `${card.title || (comp.name + " Battle Card")}
Generated at: ${new Date(card.generated_at).toLocaleDateString()}

RECENT CHANGES:
${cardLists.what_changed.length > 0
  ? cardLists.what_changed.map((c: unknown) => `- ${battleCardItemText(c)}`).join('\n')
  : 'No pricing or feature changes detected.'}

THEIR WEAKNESSES:
${cardLists.weaknesses.length > 0
  ? cardLists.weaknesses.map((w: unknown) => `- ${battleCardItemText(w)}`).join('\n')
  : 'None identified.'}

TALKING POINTS:
${cardLists.talking_points.length > 0
  ? cardLists.talking_points.map((tp: unknown, i: number) => `${i + 1}. ${battleCardItemText(tp)}`).join('\n')
  : 'None generated.'}

WIN CONDITIONS:
${cardLists.win_conditions.length > 0
  ? cardLists.win_conditions.map((wc: unknown) => `- ${battleCardItemText(wc)}`).join('\n')
  : 'None generated.'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareBattlecard = () => {
    const url = `${window.location.origin}/share/${comp.id}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  // Process rating snapshot history for LineChart
  const ratingData = (detail.review_snapshots || [])
    .slice()
    .reverse()
    .filter((s: any) => s.avg_rating !== null)
    .map((s: any) => ({
      date: mounted ? new Date(s.snapshot_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      rating: s.avg_rating,
    }));

  // Backend emits one review snapshot PER PLATFORM per scan, so a single-scan
  // account yields several same-day points ("Jun 25" x3 on the axis). Dedupe
  // tick labels to distinct dates; with <2 distinct dates the axis says nothing
  // useful, so hide it (tooltip still shows values on hover). Pre-mount every
  // date is '' → 1 distinct → hidden, which keeps SSR/first paint consistent.
  const distinctRatingDates: string[] = Array.from(
    new Set<string>(ratingData.map((d: { date: string }) => d.date))
  );

  const lastScannedText = !mounted
    ? ''
    : detail.scan_history && detail.scan_history.length > 0
    ? formatTimeAgo(detail.scan_history[0].fetched_at)
    : 'Never';

  return (
    <div className="space-y-6">
      {/* HEAD-TO-HEAD — comparative verdict (self-hides when absent) */}
      <HeadToHead
        data={detail.battlecard?.head_to_head}
        competitorName={comp.name || comp.url}
      />

      {/* A) HEADER ROW */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={`https://www.google.com/s2/favicons?domain=${(comp.url.split('://')[1] || comp.url).split('/')[0]}&sz=64`}
              alt=""
              className="w-12 h-12 rounded-lg bg-muted border border-border p-2 flex-shrink-0"
            />
            <div>
              {editing ? (
                <>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm max-w-[150px]"
                      placeholder="Name"
                    />
                    <Input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="h-7 text-xs max-w-[200px]"
                      placeholder="URL"
                    />
                    <Button
                      size="sm"
                      onClick={saveCompetitorSettings}
                      disabled={savingSettings}
                    >
                      {savingSettings ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {settingsError && (
                    <p className="text-xs font-medium mt-2" style={{ color: 'var(--tone-danger)' }}>{settingsError}</p>
                  )}
                </>
              ) : (
                <>
                  {/* Page h1 lives in Topbar — this heading must stay h2. */}
                  <h2 className="text-xl font-bold text-foreground">{comp.name || comp.url}</h2>
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 mt-0.5 transition-colors"
                  >
                    <Globe size={12} /> {comp.url}
                  </a>
                </>
              )}
              <p className="text-xs mt-1 flex items-center gap-2 text-muted-foreground">
                <Clock size={12} /> Last scanned {lastScannedText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-primary" />
                  Scanning…
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Scan Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  className="text-muted-foreground hover:text-destructive hover:border-destructive/50"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Removing…' : 'Stop tracking'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Stop tracking this competitor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes <strong>{comp.name || comp.url}</strong> and deletes all its
                    scan history, reviews, and battle card. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Timeline & Scan History (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* B) CHANGE TIMELINE */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Change History</h2>
              <p className="text-xs text-muted-foreground">Archived snapshots and diff analyzer</p>
            </div>

            <div className="p-6">
              {detail.change_events.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No changes detected yet for this competitor.
                </div>
              ) : (
                <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8 py-2">
                  {detail.change_events.map((event: any) => {
                    const isExpanded = expandedEventId === event.id;
                    const changeTypeStyles: Record<string, string> = {
                      pricing_change: 'badge badge-pricing_change',
                      new_feature: 'badge badge-feature_add',
                      positioning_shift: 'badge badge-repositioning',
                      review_trend: 'badge badge-review_trend',
                      minor_copy: 'badge badge-minor_copy',
                    };

                    const badgeClass = changeTypeStyles[event.change_type] || changeTypeStyles.minor_copy;
                    const dateFormatted = mounted
                      ? new Date(event.detected_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '';

                    return (
                      <div key={event.id} className="relative">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[32px] top-1.5 bg-card p-0.5 rounded-full">
                          <Circle size={10} className="text-primary" />
                        </div>

                        <div className="bg-muted/40 border border-border rounded-lg overflow-hidden transition-colors duration-300">
                          {/* Event Header */}
                          <button
                            type="button"
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                            aria-expanded={isExpanded}
                            aria-controls={`event-diff-${event.id}`}
                            className="w-full text-left p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/70 transition-colors duration-(--duration-base) ease-(--ease-out)"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground">{dateFormatted}</span>
                                <span className="text-xs text-muted-foreground font-mono">({event.week_label})</span>
                              </div>
                              {/* span, not p: this now sits inside a <button> (phrasing content only) */}
                              <span className="block text-xs mt-0.5 truncate max-w-[280px] md:max-w-[400px] text-muted-foreground">
                                {event.brief_text || "Copy differences scanned."}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={badgeClass}>
                                {event.change_type.replace(/_/g, ' ')}
                              </span>
                              {isExpanded
                                ? <ChevronUp size={16} className="text-muted-foreground" />
                                : <ChevronDown size={16} className="text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Event Diff Body */}
                          <Collapse open={isExpanded} id={`event-diff-${event.id}`}>
                            <div className="p-4 bg-muted/30 border-t border-border">
                                  <p className="text-sm font-semibold text-foreground mb-2">Analysis Summary</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{event.brief_text || "No AI explanation generated."}</p>

                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-foreground">Text Diff Viewer</span>
                                    {event.net_char_delta !== 0 && (
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                        event.net_char_delta > 0 ? 'tag-green border' : 'tag-red border'
                                      }`}>
                                        {event.net_char_delta > 0 ? '+' : ''}{event.net_char_delta} chars
                                      </span>
                                    )}
                                  </div>
                              {renderDiff(event.before_text, event.after_text)}
                            </div>
                          </Collapse>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* E) SCAN HISTORY */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Scan Logs</h2>
              <p className="text-xs text-muted-foreground">Full database raw crawl history</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">File Size</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detail.scan_history && detail.scan_history.length > 0 ? (
                    detail.scan_history.map((scan: any) => (
                      <tr key={scan.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {mounted
                            ? new Date(scan.fetched_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })
                            : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                          {scan.char_count.toLocaleString('en-US')} chars
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            scan.status === 'success' ? 'badge-feature_add' : 'tag-red border'
                          }`}>
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                          {scan.changes_detected > 0 ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Zap size={12} /> {scan.changes_detected} found
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No scans recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Battle Card & Review Analytics (1/3 width) */}
        <div className="space-y-6">
          {/* C) BATTLE CARD */}
          <div className="bg-card border border-border rounded-xl overflow-hidden border-l-[3px] border-l-primary">
            <div className="p-6">
              {detail.battlecard ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{comp.name || comp.url} Battle Card</h2>
                      <p className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <Calendar size={11} /> Week of {mounted ? new Date(detail.battlecard.generated_at).toLocaleDateString() : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={copyBattlecardToClipboard}
                        title="Copy to clipboard"
                        aria-label="Copy to clipboard"
                      >
                        {copied ? <CheckCircle2 size={14} className="text-[var(--tone-positive)]" /> : <Copy size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={shareBattlecard}
                        title="Share Card"
                        aria-label="Share card"
                      >
                        {shared ? <CheckCircle2 size={14} className="text-[var(--tone-positive)]" /> : <Share2 size={14} />}
                      </Button>
                    </div>
                  </div>

                  {/* Content Accordions */}
                  <div className="space-y-2">
                    {/* Accordion 1: Recent Changes */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection('changes')}
                        aria-expanded={cardOpenSections.changes}
                        aria-controls="card-section-changes"
                        className="relative w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 flex items-center justify-between text-xs font-semibold text-foreground transition-colors duration-(--duration-base) ease-(--ease-out) after:absolute after:top-1/2 after:left-0 after:h-[max(100%,44px)] after:w-full after:-translate-y-1/2 after:content-['']"
                      >
                        <span className="flex items-center gap-2">
                          <Zap size={13} className="text-primary" /> Recent Changes
                        </span>
                        {cardOpenSections.changes
                          ? <ChevronUp size={12} className="text-muted-foreground" />
                          : <ChevronDown size={12} className="text-muted-foreground" />}
                      </button>
                      <Collapse open={cardOpenSections.changes} id="card-section-changes">
                        <div className="p-4 text-xs space-y-2 bg-card border-t border-border">
                              {cardLists.what_changed.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-2 leading-relaxed text-foreground">
                                  {cardLists.what_changed.map((c: unknown, idx: number) => (
                                    <li key={idx}>{renderInlineMarkdown(c)}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="italic text-muted-foreground">
                                  Your competitor has been quiet this week &mdash; no pricing or feature changes detected.
                                </p>
                              )}
                        </div>
                      </Collapse>
                    </div>

                    {/* Accordion 2: Their Weaknesses */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection('weaknesses')}
                        aria-expanded={cardOpenSections.weaknesses}
                        aria-controls="card-section-weaknesses"
                        className="relative w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 flex items-center justify-between text-xs font-semibold text-foreground transition-colors duration-(--duration-base) ease-(--ease-out) after:absolute after:top-1/2 after:left-0 after:h-[max(100%,44px)] after:w-full after:-translate-y-1/2 after:content-['']"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle size={13} className="text-[var(--tone-danger)]" /> Their Weaknesses
                        </span>
                        {cardOpenSections.weaknesses
                          ? <ChevronUp size={12} className="text-muted-foreground" />
                          : <ChevronDown size={12} className="text-muted-foreground" />}
                      </button>
                      <Collapse open={cardOpenSections.weaknesses} id="card-section-weaknesses">
                        <div className="p-4 text-xs space-y-2 bg-card border-t border-border">
                              {cardLists.weaknesses.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-2 leading-relaxed text-foreground">
                                  {cardLists.weaknesses.map((w: unknown, idx: number) => (
                                    <li key={idx}>{renderInlineMarkdown(w)}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="italic text-muted-foreground">No complaints found in reviews.</p>
                              )}
                        </div>
                      </Collapse>
                    </div>

                    {/* Accordion 3: Talking Points */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection('talkingPoints')}
                        aria-expanded={cardOpenSections.talkingPoints}
                        aria-controls="card-section-talking-points"
                        className="relative w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 flex items-center justify-between text-xs font-semibold text-foreground transition-colors duration-(--duration-base) ease-(--ease-out) after:absolute after:top-1/2 after:left-0 after:h-[max(100%,44px)] after:w-full after:-translate-y-1/2 after:content-['']"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={13} className="text-[var(--tone-positive)]" /> Talking Points
                        </span>
                        {cardOpenSections.talkingPoints
                          ? <ChevronUp size={12} className="text-muted-foreground" />
                          : <ChevronDown size={12} className="text-muted-foreground" />}
                      </button>
                      <Collapse open={cardOpenSections.talkingPoints} id="card-section-talking-points">
                        <div className="p-4 text-xs space-y-2 bg-card border-t border-border">
                              {cardLists.talking_points.length > 0 ? (
                                <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-foreground">
                                  {cardLists.talking_points.map((tp: unknown, idx: number) => (
                                    <li key={idx}>{renderInlineMarkdown(tp)}</li>
                                  ))}
                                </ol>
                              ) : (
                                <p className="italic text-muted-foreground">No talking points generated.</p>
                              )}
                        </div>
                      </Collapse>
                    </div>

                    {/* Accordion 4: Win Conditions */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection('winConditions')}
                        aria-expanded={cardOpenSections.winConditions}
                        aria-controls="card-section-win-conditions"
                        className="relative w-full px-4 py-3 bg-muted/50 hover:bg-muted/80 flex items-center justify-between text-xs font-semibold text-foreground transition-colors duration-(--duration-base) ease-(--ease-out) after:absolute after:top-1/2 after:left-0 after:h-[max(100%,44px)] after:w-full after:-translate-y-1/2 after:content-['']"
                      >
                        <span className="flex items-center gap-2">
                          <Trophy size={13} className="text-[var(--tone-warning)]" /> Win Conditions
                        </span>
                        {cardOpenSections.winConditions
                          ? <ChevronUp size={12} className="text-muted-foreground" />
                          : <ChevronDown size={12} className="text-muted-foreground" />}
                      </button>
                      <Collapse open={cardOpenSections.winConditions} id="card-section-win-conditions">
                        <div className="p-4 text-xs space-y-2 bg-card border-t border-border">
                              {cardLists.win_conditions.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-2 leading-relaxed text-foreground">
                                  {cardLists.win_conditions.map((wc: unknown, idx: number) => (
                                    <li key={idx}>{renderInlineMarkdown(wc)}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="italic text-muted-foreground">No win conditions generated.</p>
                              )}
                        </div>
                      </Collapse>
                    </div>
                  </div>

                  <div className="pt-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateBattlecard}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-primary" />
                          Regenerating…
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Regenerate Card
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Zap size={32} className="mx-auto text-muted-foreground animate-pulse" />
                  <h3 className="text-sm font-semibold text-foreground">No Battle Card Generated</h3>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Generate one to see recent changes, weaknesses, and talking points.</p>
                  <Button
                    onClick={handleRegenerateBattlecard}
                    disabled={regenerating}
                    size="sm"
                  >
                    {regenerating ? <RefreshCw size={12} className="animate-spin" /> : null}
                    Generate Battle Card
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* D) RATING TREND CHART */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Rating Trend</h2>
              <p className="text-xs text-muted-foreground">Avg score progression over time</p>
            </div>

            {ratingData.length > 0 ? (
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 120 }}>
                  <LineChart data={ratingData}>
                    <XAxis
                      dataKey="date"
                      ticks={distinctRatingDates}
                      hide={distinctRatingDates.length < 2}
                      tick={{ fill: chart.tick, fontSize: 10 }}
                    />
                    <YAxis domain={[1, 5]} tick={{ fill: chart.tick, fontSize: 10 }} width={15} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div
                              className="text-xs px-2 py-1 rounded shadow border"
                              style={{ background: chart.tooltipBg, borderColor: chart.tooltipBorder, color: 'var(--foreground)' }}
                            >
                              {payload[0].value} average
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke={chart.accent}
                      strokeWidth={2}
                      dot={{ r: 3, fill: chart.accent }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                No ratings history available yet.
              </div>
            )}
          </div>

          {comp.business_type !== 'local' && (
            <>
              <HiringSignalCard
                signal={detail.hiring_signal ?? null}
                careersUrl={comp.careers_url ?? null}
              />
              <DataSourcesPanel
                competitorId={comp.id}
                userId={userId}
                initialValues={{
                  g2_url: comp.g2_url ?? '',
                  trustpilot_url: comp.trustpilot_url ?? '',
                  capterra_url: comp.capterra_url ?? '',
                  careers_url: comp.careers_url ?? '',
                }}
                onSaved={(updated) =>
                  setDetail((prev: any) => ({
                    ...prev,
                    competitor: { ...prev.competitor, ...updated },
                  }))
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
