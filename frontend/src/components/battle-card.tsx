'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, Loader2, X, Copy, Check } from 'lucide-react';

interface BattleCardProps {
  competitorId: string;
  competitorName: string;
  userId: string;
}

interface BattleCardData {
  title: string;
  executive_summary: string;
  what_changed: { type: string; text: string }[];
  weaknesses: string[];
  strategic_signals: string[];
  playbook: string[];
  generated_at: string;
  variant?: 'saas' | 'local';
}

export default function BattleCard({ competitorId, competitorName, userId }: BattleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardData, setCardData] = useState<BattleCardData | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const generateCard = async () => {
    setIsOpen(true);
    if (cardData) return; // Already generated

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/battlecards/generate/${competitorId}`, {
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate Battle Card');
      }

      const raw = await res.json();
      // Normalize old API format (strings in what_changed, talking_points, win_conditions)
      // vs new format (objects in what_changed, playbook, strategic_signals)
      const whatChanged: { type: string; text: string }[] = Array.isArray(raw.what_changed)
        ? raw.what_changed.map((item: unknown) =>
            typeof item === 'string'
              ? { type: 'change', text: item }
              : (item as { type: string; text: string })
          )
        : [];
      const data: BattleCardData = {
        title: raw.title || '',
        executive_summary: raw.executive_summary || '',
        what_changed: whatChanged,
        weaknesses: raw.weaknesses || [],
        strategic_signals: raw.strategic_signals || raw.win_conditions || [],
        playbook: raw.playbook || raw.talking_points || raw.actions || [],
        generated_at: raw.generated_at || new Date().toISOString(),
        variant: raw.variant === 'local' ? 'local' : 'saas',
      };
      setCardData(data);
    } catch {
      setError('We could not generate this Battle Card right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getBadgeClass = (type: string | undefined | null) => {
    if (!type) return 'bg-[var(--fill-subtle)] text-[var(--text-muted)] border-[var(--border-default)]';
    const t = type.toLowerCase();
    if (t.includes('price') || t.includes('pricing')) return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    if (t.includes('feature') || t.includes('add')) return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    if (t.includes('repositioning') || t.includes('messaging') || t.includes('pivot')) return 'bg-[rgba(155,127,199,0.12)] text-[#9b7fc7] border-[rgba(155,127,199,0.30)]';
    if (t.includes('reputation')) return 'bg-red-400/10 text-red-400 border-red-400/20';
    if (t.includes('social') || t.includes('campaign')) return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    if (t.includes('review')) return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    if (t.includes('offer') || t.includes('new')) return 'bg-sky-400/10 text-sky-400 border-sky-400/20';
    return 'bg-[var(--fill-subtle)] text-[var(--text-muted)] border-[var(--border-default)]';
  };

  const getBadgeLabel = (type: string | undefined | null) => {
    if (!type) return 'change';
    const t = type.toLowerCase();
    if (t.includes('price') || t.includes('pricing')) return 'pricing';
    if (t.includes('feature') || t.includes('add')) return 'feature';
    if (t.includes('repositioning') || t.includes('messaging') || t.includes('pivot')) return 'positioning';
    if (t.includes('reputation')) return 'reputation';
    if (t.includes('social') || t.includes('campaign')) return 'social';
    if (t.includes('review')) return 'reviews';
    if (t.includes('offer')) return 'offer';
    return 'copy';
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={generateCard}
        className="px-3 py-1.5 bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] rounded text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Zap size={13} className="text-sky-400" />
        <span>Battle Card</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 15 }}
              className="p-1 bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] rounded-lg w-full max-w-2xl shadow-[var(--shadow-modal)] relative my-8"
            >
              {/* Inner Core */}
              <div className="bg-[var(--surface-overlay)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-default)] bg-[var(--fill-subtle)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Zap className="text-sky-400" size={18} />
                        {competitorName} Battle Card
                        {cardData?.variant === 'local' && (
                          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                            Local intel
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono uppercase tracking-wider">
                        {cardData?.variant === 'local'
                          ? 'Reviews + social + reputation read'
                          : 'Page changes + reviews + hiring read'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  {cardData && (
                    <div className="text-[9px] font-mono text-[var(--text-muted)] mt-3">
                      GENERATED AT: {new Date(cardData.generated_at).toLocaleString().toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-h-[200px] flex flex-col justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-4 py-16">
                      <Loader2 size={32} className="animate-spin text-sky-400" />
                      <p className="text-xs font-mono uppercase tracking-wider animate-pulse">Analyzing competitor intelligence...</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center text-red-400 space-y-3 py-16 text-center">
                      <X size={32} className="text-red-500" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  ) : cardData ? (
                    <div className="p-6 space-y-5">
                      {/* Executive Summary */}
                      {cardData.executive_summary && (
                        <div className="p-4 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md">
                          <div className="text-[9px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Executive Summary</div>
                          <p className="text-[var(--text-primary)] text-sm leading-relaxed italic">
                            &quot;{cardData.executive_summary}&quot;
                          </p>
                        </div>
                      )}

                      {/* 2x2 Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        
                        {/* Panel 1: Detected Changes */}
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0 * 0.07 }}
                          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 rounded-md"
                        >
                          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400 mb-4">
                            {cardData.variant === 'local' ? 'Activity This Week' : 'Detected Changes'}
                          </div>
                          {(!cardData.what_changed || cardData.what_changed.length === 0) ? (
                            <p className="text-xs text-[var(--text-muted)] italic">
                              {cardData.variant === 'local'
                                ? 'Quiet week — no new reviews or social posts'
                                : 'No significant changes detected this week'}
                            </p>
                          ) : (
                            <div className="space-y-3.5">
                              {cardData.what_changed.map((change, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex">
                                    <span className={`text-[8px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getBadgeClass(change.type)}`}>
                                      {getBadgeLabel(change.type)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--text-primary)] leading-normal">{change.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>

                        {/* Panel 2: User Complaints */}
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { delay: 1 * 0.07 }}
                          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 rounded-md"
                        >
                          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-red-400 mb-4">
                            User Complaints
                          </div>
                          {(!cardData.weaknesses || cardData.weaknesses.length === 0) ? (
                            <p className="text-xs text-[var(--text-muted)] italic">No customer complaints reported</p>
                          ) : (
                            <ul className="space-y-3 text-xs text-[var(--text-primary)] leading-normal">
                              {cardData.weaknesses.map((weakness, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-red-500 select-none">›</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>

                        {/* Panel 3: Strategic Signals */}
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { delay: 2 * 0.07 }}
                          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 rounded-md"
                        >
                          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400 mb-4">
                            Strategic Signals
                          </div>
                          {(!cardData.strategic_signals || cardData.strategic_signals.length === 0) ? (
                            <p className="text-xs text-[var(--text-muted)] italic">No strategic signals identified</p>
                          ) : (
                            <ul className="space-y-3 text-xs text-[var(--text-primary)] leading-normal">
                              {cardData.strategic_signals.map((signal, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-amber-500 select-none">›</span>
                                  <span>{signal}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>

                        {/* Panel 4: Playbook */}
                        <motion.div
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { delay: 3 * 0.07 }}
                          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 rounded-md md:col-span-2"
                        >
                          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 mb-4">
                            Playbook — This Week
                          </div>
                          {(!cardData.playbook || cardData.playbook.length === 0) ? (
                            <p className="text-xs text-[var(--text-muted)] italic">No playbook recommendations</p>
                          ) : (
                            <ol className="space-y-2.5">
                              {cardData.playbook.map((play, idx) => {
                                const rankStr = String(idx + 1).padStart(2, '0');
                                const isCopied = copiedIndex === idx;
                                return (
                                  <li
                                    key={idx}
                                    className="flex items-start justify-between gap-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] p-3 rounded border border-[var(--border-subtle)] transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{rankStr}</span>
                                      <span className="text-xs text-[var(--text-primary)] leading-relaxed">{play}</span>
                                    </div>
                                    <button
                                      onClick={() => handleCopy(play, idx)}
                                      className="p-1 rounded bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 mt-0.5"
                                      title="Copy to clipboard"
                                    >
                                      {isCopied ? (
                                        <Check size={10} className="text-emerald-400" />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </motion.div>

                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
