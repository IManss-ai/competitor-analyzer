'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, AlertTriangle, MessageSquare, Trophy, Copy, Share2, RefreshCw, Pencil, Globe, Calendar, CheckCircle2, Eye, EyeOff, Star, Clock, Circle, ChevronUp, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import DataSourcesPanel from '@/components/data-sources-panel';
import HiringSignalCard from '@/components/hiring-signal-card';
import { useChartPalette } from '@/lib/chart-theme';

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

interface CompetitorDetailClientProps {
  userId: string;
  initialDetail: any;
}

export default function CompetitorDetailClient({ userId, initialDetail }: CompetitorDetailClientProps) {
  const [detail, setDetail] = useState(initialDetail);
  const [scanning, setScanning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(detail.competitor.name || '');
  const [editUrl, setEditUrl] = useState(detail.competitor.url || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  
  // Collapse states for Battlecard accordions
  const [cardOpenSections, setCardOpenSections] = useState<Record<string, boolean>>({
    changes: true,
    weaknesses: true,
    talkingPoints: true,
    winConditions: true,
  });

  // Collapse states for timeline events
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const comp = detail.competitor;
  const chart = useChartPalette();

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
          Authorization: `Bearer ${userId}` 
        }
      });
      if (res.ok) {
        // Reload detail data
        const reloadRes = await fetch(`${apiUrl}/api/v1/competitors/${comp.id}/detail`, {
          headers: { Authorization: `Bearer ${userId}` }
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
        headers: { Authorization: `Bearer ${userId}` }
      });
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

  const saveCompetitorSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/local/competitors/${comp.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}` 
        },
        body: JSON.stringify({ name: editName, url: editUrl })
      });
      if (res.ok) {
        setDetail((prev: any) => ({
          ...prev,
          competitor: { ...prev.competitor, name: editName, url: editUrl }
        }));
        setEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  // Word-level diff highlighter
  const renderDiff = (before: string, after: string) => {
    if (!before) return <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{after}</p>;
    if (!after) return <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{before}</p>;

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
          <span className="text-[10px] uppercase font-bold text-[var(--tone-danger)] tracking-wider block mb-1">Before</span>
          <div className="text-xs leading-relaxed max-h-[150px] overflow-y-auto" style={{ color: 'var(--text-secondary)' }}>{beforeRender}</div>
        </div>
        <div className="p-3 bg-[var(--tone-positive)]/5 border border-[var(--tone-positive)]/15 rounded">
          <span className="text-[10px] uppercase font-bold text-[var(--tone-positive)] tracking-wider block mb-1">After</span>
          <div className="text-xs leading-relaxed max-h-[150px] overflow-y-auto" style={{ color: 'var(--text-primary)' }}>{afterRender}</div>
        </div>
      </div>
    );
  };

  // Text formatter for Copy Copy
  const copyBattlecardToClipboard = () => {
    const card = detail.battlecard;
    if (!card) return;

    const text = `${card.title || (comp.name + " Battle Card")}
Generated at: ${new Date(card.generated_at).toLocaleDateString()}

RECENT CHANGES:
${card.what_changed && card.what_changed.length > 0 
  ? card.what_changed.map((c: string | { text: string }) => `- ${typeof c === 'string' ? c : c.text}`).join('\n')
  : 'No pricing or feature changes detected.'}

THEIR WEAKNESSES:
${card.weaknesses && card.weaknesses.length > 0 
  ? card.weaknesses.map((w: string) => `- ${w}`).join('\n') 
  : 'None identified.'}

TALKING POINTS:
${card.talking_points && card.talking_points.length > 0 
  ? card.talking_points.map((tp: string, i: number) => `${i + 1}. ${tp}`).join('\n') 
  : 'None generated.'}

WIN CONDITIONS:
${card.win_conditions && card.win_conditions.length > 0 
  ? card.win_conditions.map((wc: string) => `- ${wc}`).join('\n') 
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
      date: new Date(s.snapshot_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: s.avg_rating,
    }));

  const lastScannedText = detail.scan_history && detail.scan_history.length > 0
    ? formatTimeAgo(detail.scan_history[0].fetched_at)
    : 'Never';

  return (
    <div className="space-y-6">
      {/* A) HEADER ROW */}
      <div className="rs-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${(comp.url.split('://')[1] || comp.url).split('/')[0]}&sz=64`}
              alt=""
              className="w-12 h-12 rounded bg-[var(--fill-subtle)] border border-[var(--border-default)] p-2 flex-shrink-0"
            />
            <div>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rs-input !py-1 !px-2 text-sm max-w-[150px]"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="rs-input !py-1 !px-2 text-xs max-w-[200px]"
                    placeholder="URL"
                  />
                  <button 
                    onClick={saveCompetitorSettings}
                    disabled={savingSettings}
                    className="rs-btn-primary !px-3 !py-1 text-xs cursor-pointer"
                  >
                    {savingSettings ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setEditing(false)}
                    className="rs-btn-ghost !px-3 !py-1 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{comp.name || comp.url}</h1>
                  <a 
                    href={comp.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs hover:underline inline-flex items-center gap-1 mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Globe size={12} /> {comp.url}
                  </a>
                </>
              )}
              <p className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Clock size={12} /> Last scanned {lastScannedText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="rs-btn-ghost px-4 py-2 text-sm font-semibold cursor-pointer"
            >
              {scanning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Scan Now
                </>
              )}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="rs-btn-ghost px-4 py-2 text-sm font-semibold cursor-pointer"
            >
              <Pencil size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Timeline & Scan History (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* B) CHANGE TIMELINE */}
          <div className="rs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Change History</h2>
              <p className="text-xs text-[var(--text-secondary)]">Archived snapshots and diff analyzer</p>
            </div>

            <div className="p-5">
              {detail.change_events.length === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                  No changes detected yet for this competitor.
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-subtle)] pl-6 ml-3 space-y-8 py-2">
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
                    const dateFormatted = new Date(event.detected_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <div key={event.id} className="relative">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[32px] top-1.5 bg-[var(--surface-raised)] p-0.5 rounded-full">
                          <Circle size={10} style={{ color: 'var(--accent-primary)' }} />
                        </div>

                        <div className="bg-[var(--fill-subtle)] border border-[var(--border-subtle)] rounded-md overflow-hidden transition-colors duration-300">
                          {/* Event Header */}
                          <div 
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--fill-subtle-hover)] transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[var(--text-primary)]">{dateFormatted}</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">({event.week_label})</span>
                              </div>
                              <p className="text-xs mt-0.5 truncate max-w-[280px] md:max-w-[400px]" style={{ color: 'var(--text-secondary)' }}>
                                {event.brief_text || "Copy differences scanned."}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={badgeClass}>
                                {event.change_type.replace(/_/g, ' ')}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Event Diff Body */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="border-t border-[var(--border-subtle)] overflow-hidden"
                              >
                                <div className="p-4 bg-[var(--fill-subtle)]">
                                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Analysis Summary</p>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{event.brief_text || "No AI explanation generated."}</p>

                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">Text Diff Viewer</span>
                                    {event.net_char_delta !== 0 && (
                                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                        event.net_char_delta > 0 ? 'tag-green border' : 'tag-red border'
                                      }`}>
                                        {event.net_char_delta > 0 ? '+' : ''}{event.net_char_delta} chars
                                      </span>
                                    )}
                                  </div>
                                  {renderDiff(event.before_text, event.after_text)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* E) SCAN HISTORY */}
          <div className="rs-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Scan Logs</h2>
              <p className="text-xs text-[var(--text-secondary)]">Full database raw crawl history</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ color: 'var(--text-secondary)' }}>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--fill-subtle)]">
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>File Size</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {detail.scan_history && detail.scan_history.length > 0 ? (
                    detail.scan_history.map((scan: any) => (
                      <tr key={scan.id} className="hover:bg-[var(--fill-subtle)] transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          {new Date(scan.fetched_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                          {scan.char_count.toLocaleString()} chars
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            scan.status === 'success' ? 'badge-feature_add' : 'tag-red border'
                          }`}>
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold">
                          {scan.changes_detected > 0 ? (
                            <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                              <Zap size={12} /> {scan.changes_detected} found
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
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
          <div className="rs-card relative overflow-hidden border-l-[4px]" style={{ borderLeftColor: 'var(--accent-primary)', padding: '20px' }}>
            {detail.battlecard ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">{comp.name || comp.url} Battle Card</h2>
                    <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Calendar size={11} /> Week of {new Date(detail.battlecard.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyBattlecardToClipboard}
                      className="rs-btn-ghost !p-2 cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle2 size={14} className="text-[var(--tone-positive)]" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={shareBattlecard}
                      className="rs-btn-ghost !p-2 cursor-pointer"
                      title="Share Card"
                    >
                      {shared ? <CheckCircle2 size={14} className="text-[var(--tone-positive)]" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Content Accordions */}
                <div className="space-y-3">
                  {/* Accordion 1: Recent Changes */}
                  <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                    <button
                      onClick={() => toggleSection('changes')}
                      className="w-full px-4 py-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Zap size={14} style={{ color: 'var(--accent-primary)' }} /> Recent Changes
                      </span>
                      {cardOpenSections.changes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.changes && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[var(--fill-subtle)] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.what_changed && detail.battlecard.what_changed.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-2 leading-relaxed text-[var(--text-primary)]">
                                {detail.battlecard.what_changed.map((c: string | { text: string }, idx: number) => (
                                  <li key={idx}>{typeof c === 'string' ? c : c.text}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-[var(--text-muted)]">
                                Your competitor has been quiet this week &mdash; no pricing or feature changes detected.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 2: Their Weaknesses */}
                  <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                    <button
                      onClick={() => toggleSection('weaknesses')}
                      className="w-full px-4 py-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-[var(--tone-danger)]" /> Their Weaknesses
                      </span>
                      {cardOpenSections.weaknesses ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.weaknesses && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[var(--fill-subtle)] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.weaknesses && detail.battlecard.weaknesses.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-2 leading-relaxed text-[var(--text-primary)]">
                                {detail.battlecard.weaknesses.map((w: string, idx: number) => (
                                  <li key={idx}>{w}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-[var(--text-muted)]">No complaints found in reviews.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 3: Talking Points */}
                  <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                    <button
                      onClick={() => toggleSection('talkingPoints')}
                      className="w-full px-4 py-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-[var(--tone-positive)]" /> Talking Points
                      </span>
                      {cardOpenSections.talkingPoints ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.talkingPoints && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[var(--fill-subtle)] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.talking_points && detail.battlecard.talking_points.length > 0 ? (
                              <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-[var(--text-primary)]">
                                {detail.battlecard.talking_points.map((tp: string, idx: number) => (
                                  <li key={idx}>{tp}</li>
                                ))}
                              </ol>
                            ) : (
                              <p className="italic text-[var(--text-muted)]">No talking points generated.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 4: Win Conditions */}
                  <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                    <button
                      onClick={() => toggleSection('winConditions')}
                      className="w-full px-4 py-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Trophy size={14} className="text-[var(--tone-warning)]" /> Win Conditions
                      </span>
                      {cardOpenSections.winConditions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.winConditions && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[var(--fill-subtle)] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.win_conditions && detail.battlecard.win_conditions.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-2 leading-relaxed text-[var(--text-primary)]">
                                {detail.battlecard.win_conditions.map((wc: string, idx: number) => (
                                  <li key={idx}>{wc}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-[var(--text-muted)]">No win conditions generated.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={handleRegenerateBattlecard}
                    disabled={regenerating}
                    className="rs-btn-ghost text-xs !py-2 !px-3 cursor-pointer"
                  >
                    {regenerating ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} />
                        Regenerate Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <Zap size={32} className="mx-auto text-[var(--text-muted)] animate-pulse" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Battle Card Generated</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-[200px] mx-auto">Generate one to see recent changes, weaknesses, and talking points.</p>
                <button
                  onClick={handleRegenerateBattlecard}
                  disabled={regenerating}
                  className="rs-btn-primary cursor-pointer text-xs"
                >
                  {regenerating ? <RefreshCw size={12} className="animate-spin" /> : null}
                  Generate Battle Card
                </button>
              </div>
            )}
          </div>

          {/* D) RATING TREND CHART */}
          <div className="rs-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Rating Trend</h2>
              <p className="text-xs text-[var(--text-secondary)]">Avg score progression over time</p>
            </div>
            
            {ratingData.length > 0 ? (
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 120 }}>
                  <LineChart data={ratingData}>
                    <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tick={{ fill: chart.tick, fontSize: 10 }} width={15} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div
                              className="text-[10px] px-2 py-1 rounded shadow border"
                              style={{ background: chart.tooltipBg, borderColor: chart.tooltipBorder, color: 'var(--text-primary)' }}
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
              <div className="text-center py-6 text-xs text-[var(--text-muted)] italic">
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
