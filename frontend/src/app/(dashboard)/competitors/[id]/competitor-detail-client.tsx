'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightning, 
  Warning, 
  ChatText, 
  Trophy, 
  Copy, 
  ShareNetwork, 
  ArrowsClockwise, 
  Pencil, 
  Globe, 
  Calendar,
  CheckCircle,
  Eye,
  EyeSlash,
  Star,
  Clock,
  Circle,
  CaretUp,
  CaretDown
} from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

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
      const res = await fetch(`${apiUrl}/api/v1/battlecards/generate/${comp.id}`, {
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
    if (!before) return <p className="text-sm text-[#171717]">{after}</p>;
    if (!after) return <p className="text-sm text-[#171717]">{before}</p>;

    const beforeWords = before.split(/\s+/);
    const afterWords = after.split(/\s+/);
    const beforeSet = new Set(beforeWords);
    const afterSet = new Set(afterWords);

    const beforeRender = beforeWords.map((word, idx) => {
      const isDeleted = !afterSet.has(word);
      return (
        <span key={idx} className={isDeleted ? 'bg-red-100 text-red-800 line-through px-0.5 rounded' : ''}>
          {word}{' '}
        </span>
      );
    });

    const afterRender = afterWords.map((word, idx) => {
      const isAdded = !beforeSet.has(word);
      return (
        <span key={idx} className={isAdded ? 'bg-emerald-100 text-emerald-800 px-0.5 rounded font-medium' : ''}>
          {word}{' '}
        </span>
      );
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg">
          <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider block mb-1">Before</span>
          <div className="text-xs text-[#737373] leading-relaxed max-h-[150px] overflow-y-auto">{beforeRender}</div>
        </div>
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
          <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block mb-1">After</span>
          <div className="text-xs text-[#171717] leading-relaxed max-h-[150px] overflow-y-auto">{afterRender}</div>
        </div>
      </div>
    );
  };

  // Text formatter for Clipboard Copy
  const copyBattlecardToClipboard = () => {
    const card = detail.battlecard;
    if (!card) return;

    const text = `${card.title || (comp.name + " Battle Card")}
Generated at: ${new Date(card.generated_at).toLocaleDateString()}

RECENT CHANGES:
${card.what_changed && card.what_changed.length > 0 
  ? card.what_changed.map((c: string) => `- ${c}`).join('\n') 
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
      <div className="bg-[#0b0819]/50 border border-white/[0.06] p-5 shadow-lg rounded-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${comp.url.split('://')[-1].split('/')[0]}&sz=64`}
              alt=""
              className="w-12 h-12 rounded-xl bg-[#130f2c] border border-white/[0.08] p-1.5 flex-shrink-0"
            />
            <div>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/[0.02] border border-white/[0.08] text-white rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="bg-white/[0.02] border border-white/[0.08] text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="URL"
                  />
                  <button 
                    onClick={saveCompetitorSettings}
                    disabled={savingSettings}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {savingSettings ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setEditing(false)}
                    className="px-3 py-1 bg-white/[0.02] text-zinc-300 border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/[0.05] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-white">{comp.name || comp.url}</h1>
                  <a 
                    href={comp.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-zinc-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <Globe size={12} /> {comp.url}
                  </a>
                </>
              )}
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                <Clock size={12} /> Last scanned {lastScannedText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 hover:bg-white/[0.04] active:bg-white/[0.08] text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer bg-white/[0.01]"
            >
              {scanning ? (
                <>
                  <ArrowsClockwise size={16} className="animate-spin text-sky-400" />
                  Scanning...
                </>
              ) : (
                <>
                  <ArrowsClockwise size={16} />
                  Scan Now
                </>
              )}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 hover:bg-white/[0.04] active:bg-white/[0.08] text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer bg-white/[0.01]"
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
          <div className="bg-[#0b0819]/50 border border-white/[0.06] shadow-lg rounded-2xl backdrop-blur-md">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-white">Change History</h2>
              <p className="text-xs text-zinc-400">Archived snapshots and diff analyzer</p>
            </div>

            <div className="p-5">
              {detail.change_events.length === 0 ? (
                <div className="text-center py-8 text-sm text-zinc-500">
                  No changes detected yet for this competitor.
                </div>
              ) : (
                <div className="relative border-l-2 border-white/[0.06] pl-6 ml-3 space-y-8 py-2">
                  {detail.change_events.map((event: any) => {
                    const isExpanded = expandedEventId === event.id;
                    const changeTypeStyles: Record<string, string> = {
                      pricing_change: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      new_feature: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      positioning_shift: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
                      review_trend: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                      minor_copy: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                    };
                    
                    const typeStyle = changeTypeStyles[event.change_type] || changeTypeStyles.minor_copy;
                    const dateFormatted = new Date(event.detected_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <div key={event.id} className="relative">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-1.5 bg-[#0a0715] p-0.5 rounded-full">
                          <Circle size={10} weight="fill" className="text-sky-500" />
                        </div>

                        <div className="bg-[#0a0718]/45 border border-white/[0.06] rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                          {/* Event Header */}
                          <div 
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-white">{dateFormatted}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">({event.week_label})</span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[280px] md:max-w-[400px]">
                                {event.brief_text || "Copy differences scanned."}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeStyle}`}>
                                {event.change_type.replace('_', ' ')}
                              </span>
                              {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                            </div>
                          </div>

                          {/* Event Diff Body */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="border-t border-white/[0.06] overflow-hidden"
                              >
                                <div className="p-4 bg-[#0d0922]/50">
                                  <p className="text-sm font-semibold text-white mb-2">Analysis Summary</p>
                                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{event.brief_text || "No AI explanation generated."}</p>
                                  
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-white">Text Diff Viewer</span>
                                    {event.net_char_delta !== 0 && (
                                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        event.net_char_delta > 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'
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
          <div className="bg-[#0b0819]/50 border border-white/[0.06] shadow-lg rounded-2xl backdrop-blur-md overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-white">Scan Logs</h2>
              <p className="text-xs text-zinc-400">Full database raw crawl history</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-5 py-3 font-semibold text-zinc-400 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 font-semibold text-zinc-400 text-xs uppercase tracking-wider">File Size</th>
                    <th className="px-5 py-3 font-semibold text-zinc-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-semibold text-zinc-400 text-xs uppercase tracking-wider">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {detail.scan_history && detail.scan_history.length > 0 ? (
                    detail.scan_history.map((scan: any) => (
                      <tr key={scan.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                          {new Date(scan.fetched_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs">
                          {scan.char_count.toLocaleString()} chars
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            scan.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold">
                          {scan.changes_detected > 0 ? (
                            <span className="text-sky-400 inline-flex items-center gap-1">
                              <Lightning size={12} weight="fill" /> {scan.changes_detected} found
                            </span>
                          ) : (
                            <span className="text-zinc-500">None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-500">
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
          <div className="bg-[#0b0819]/50 border border-white/[0.06] border-l-4 border-l-sky-500 shadow-lg rounded-2xl backdrop-blur-md p-5 relative">
            {detail.battlecard ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white">{comp.name || comp.url} Battle Card</h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                      <Calendar size={11} /> Week of {new Date(detail.battlecard.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyBattlecardToClipboard}
                      className="p-1.5 hover:bg-white/[0.04] active:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer relative bg-white/[0.01]"
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={shareBattlecard}
                      className="p-1.5 hover:bg-white/[0.04] active:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer bg-white/[0.01]"
                      title="Share Card"
                    >
                      {shared ? <CheckCircle size={14} className="text-emerald-400" /> : <ShareNetwork size={14} />}
                    </button>
                  </div>
                </div>

                {/* Content Accordions */}
                <div className="space-y-3">
                  {/* Accordion 1: Recent Changes */}
                  <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('changes')}
                      className="w-full px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Lightning size={14} className="text-sky-400" /> Recent Changes
                      </span>
                      {cardOpenSections.changes ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.changes && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#0c0922]/50 text-zinc-400 border-t border-white/[0.06]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.what_changed && detail.battlecard.what_changed.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed text-zinc-200">
                                {detail.battlecard.what_changed.map((c: string, idx: number) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-zinc-500">
                                Your competitor has been quiet this week &mdash; no pricing or feature changes detected.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 2: Their Weaknesses */}
                  <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('weaknesses')}
                      className="w-full px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Warning size={14} className="text-red-400" /> Their Weaknesses
                      </span>
                      {cardOpenSections.weaknesses ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.weaknesses && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#0c0922]/50 text-zinc-400 border-t border-white/[0.06]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.weaknesses && detail.battlecard.weaknesses.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed text-zinc-200">
                                {detail.battlecard.weaknesses.map((w: string, idx: number) => (
                                  <li key={idx}>{w}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-zinc-500">No complaints found in reviews.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 3: Talking Points */}
                  <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('talkingPoints')}
                      className="w-full px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ChatText size={14} className="text-emerald-400" /> Talking Points
                      </span>
                      {cardOpenSections.talkingPoints ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.talkingPoints && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#0c0922]/50 text-zinc-400 border-t border-white/[0.06]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.talking_points && detail.battlecard.talking_points.length > 0 ? (
                              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-zinc-200">
                                {detail.battlecard.talking_points.map((tp: string, idx: number) => (
                                  <li key={idx}>{tp}</li>
                                ))}
                              </ol>
                            ) : (
                              <p className="italic text-zinc-500">No talking points generated.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Accordion 4: Win Conditions */}
                  <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('winConditions')}
                      className="w-full px-4 py-3 bg-white/[0.02] flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Trophy size={14} className="text-amber-400" /> Win Conditions
                      </span>
                      {cardOpenSections.winConditions ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <AnimatePresence>
                      {cardOpenSections.winConditions && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden bg-[#0c0922]/50 text-zinc-400 border-t border-white/[0.06]"
                        >
                          <div className="p-4 text-xs space-y-2">
                            {detail.battlecard.win_conditions && detail.battlecard.win_conditions.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed text-zinc-200">
                                {detail.battlecard.win_conditions.map((wc: string, idx: number) => (
                                  <li key={idx}>{wc}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="italic text-zinc-500">No win conditions generated.</p>
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 hover:bg-white/[0.05] text-xs font-semibold rounded-lg text-zinc-300 transition-colors cursor-pointer bg-white/[0.01]"
                  >
                    {regenerating ? (
                      <>
                        <ArrowsClockwise size={12} className="animate-spin text-sky-400" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <ArrowsClockwise size={12} />
                        Regenerate Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <Lightning size={32} className="mx-auto text-zinc-600 animate-pulse" />
                <h3 className="text-sm font-semibold text-white">No Battle Card Generated</h3>
                <p className="text-xs text-zinc-400 max-w-[200px] mx-auto">Generate one to see recent changes, weaknesses, and talking points.</p>
                <button
                  onClick={handleRegenerateBattlecard}
                  disabled={regenerating}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {regenerating ? <ArrowsClockwise size={12} className="animate-spin" /> : null}
                  Generate Battle Card
                </button>
              </div>
            )}
          </div>

          {/* D) RATING TREND CHART */}
          <div className="bg-[#0b0819]/50 border border-white/[0.06] shadow-lg rounded-2xl p-5 space-y-4 backdrop-blur-md">
            <div>
              <h2 className="text-sm font-bold text-white">Rating Trend</h2>
              <p className="text-xs text-zinc-400">Avg score progression over time</p>
            </div>
            
            {ratingData.length > 0 ? (
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingData}>
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tick={{ fill: '#71717a', fontSize: 10 }} width={15} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#130f2c]/90 border border-white/[0.08] backdrop-blur-md text-white text-[10px] px-2 py-1 rounded shadow">
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
                      stroke="#a855f7" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#a855f7' }} 
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-zinc-500 italic">
                No ratings history available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
