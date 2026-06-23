'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, X, Copy, Check } from 'lucide-react';

export interface BattleCardData {
  title: string;
  executive_summary: string;
  what_changed: { type: string; text: string }[];
  weaknesses: string[];
  strategic_signals: string[];
  playbook: string[];
  generated_at: string;
  variant?: 'saas' | 'local';
  /** True when no real change has ever been recorded — a fresh baseline scan
      OR a long-quiet competitor. In both cases what_changed is empty and the
      detected-changes panel shows an honest baseline state, not a fabricated one. */
  is_baseline?: boolean;
}

// Normalize old API format (strings in what_changed, talking_points,
// win_conditions) vs new format (objects in what_changed, playbook,
// strategic_signals). Shared so the modal and the onboarding finale render
// the exact same report shape.
export function normalizeBattleCard(raw: any): BattleCardData {
  const whatChanged: { type: string; text: string }[] = Array.isArray(raw.what_changed)
    ? raw.what_changed.map((item: unknown) =>
        typeof item === 'string'
          ? { type: 'change', text: item }
          : (item as { type: string; text: string })
      )
    : [];
  return {
    title: raw.title || '',
    executive_summary: raw.executive_summary || '',
    what_changed: whatChanged,
    weaknesses: raw.weaknesses || [],
    strategic_signals: raw.strategic_signals || raw.win_conditions || [],
    playbook: raw.playbook || raw.talking_points || raw.actions || [],
    generated_at: raw.generated_at || new Date().toISOString(),
    variant: raw.variant === 'local' ? 'local' : 'saas',
    is_baseline: raw.is_baseline === true,
  };
}

function getBadgeClass(type: string | undefined | null) {
  if (!type) return 'bg-[var(--fill-subtle)] text-[var(--text-muted)] border-[var(--border-default)]';
  const t = type.toLowerCase();
  if (t.includes('price') || t.includes('pricing')) return 'tag-amber';
  if (t.includes('feature') || t.includes('add')) return 'tag-green';
  if (t.includes('repositioning') || t.includes('messaging') || t.includes('pivot')) return 'tag-violet';
  if (t.includes('reputation')) return 'tag-red';
  if (t.includes('social') || t.includes('campaign')) return 'tag-green';
  if (t.includes('review')) return 'tag-amber';
  if (t.includes('offer') || t.includes('new')) return 'bg-sky-400/10 text-sky-400 border-sky-400/20';
  return 'bg-[var(--fill-subtle)] text-[var(--text-muted)] border-[var(--border-default)]';
}

function getBadgeLabel(type: string | undefined | null) {
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
}

interface BattleCardContentProps {
  cardData: BattleCardData | null;
  loading: boolean;
  error: string;
  /** Shown under the spinner while generating. */
  loadingLabel?: string;
}

/**
 * Presentational report body: executive summary + 4 panels + copy-to-clipboard.
 * Used by both the on-demand Battle Card modal and the onboarding finale so
 * the report looks identical everywhere.
 */
export default function BattleCardContent({ cardData, loading, error, loadingLabel }: BattleCardContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-4 py-16">
        <Loader2 size={32} className="animate-spin text-sky-400" />
        <p className="text-xs font-mono uppercase tracking-wider animate-pulse">
          {loadingLabel || 'Analyzing competitor intelligence...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-[var(--tone-danger)] space-y-3 py-16 text-center">
        <X size={32} className="text-[var(--tone-danger)]" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!cardData) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Executive Summary */}
      {cardData.executive_summary && (
        <div className="p-4 bg-[var(--surface-raised)] border border-[var(--border-default)]" style={{ borderRadius: 'var(--radius-md)' }}>
          <div className="text-[9px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Executive Summary</div>
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
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-400 mb-4">
            {cardData.variant === 'local' ? 'Activity This Week' : 'Detected Changes'}
          </div>
          {cardData.is_baseline ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              {cardData.variant === 'local'
                ? 'No activity yet — baseline captured. New reviews and posts appear after the next scan.'
                : 'No changes detected yet — baseline captured. New changes appear after the next scan.'}
            </p>
          ) : (!cardData.what_changed || cardData.what_changed.length === 0) ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              {cardData.variant === 'local'
                ? 'Quiet week — no new reviews or social posts'
                : 'No significant changes detected this week'}
            </p>
          ) : (
            <div className="space-y-4">
              {cardData.what_changed.map((change, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex">
                    <span className={`text-[8px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 border ${getBadgeClass(change.type)}`} style={{ borderRadius: 'var(--radius-sm)' }}>
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
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--tone-danger)] mb-4">
            User Complaints
          </div>
          {(!cardData.weaknesses || cardData.weaknesses.length === 0) ? (
            <p className="text-xs text-[var(--text-muted)] italic">No customer complaints reported</p>
          ) : (
            <ul className="space-y-3 text-xs text-[var(--text-primary)] leading-normal">
              {cardData.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--tone-danger)] select-none">›</span>
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
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 md:col-span-2"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--tone-warning)] mb-4">
            Strategic Signals
          </div>
          {(!cardData.strategic_signals || cardData.strategic_signals.length === 0) ? (
            <p className="text-xs text-[var(--text-muted)] italic">No strategic signals identified</p>
          ) : (
            <ul className="space-y-3 text-xs text-[var(--text-primary)] leading-normal">
              {cardData.strategic_signals.map((signal, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--tone-warning)] select-none">›</span>
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
          className="bg-[var(--surface-raised)] border border-[var(--border-default)] p-5 md:col-span-2"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--tone-positive)] mb-4">
            Playbook — This Week
          </div>
          {(!cardData.playbook || cardData.playbook.length === 0) ? (
            <p className="text-xs text-[var(--text-muted)] italic">No playbook recommendations</p>
          ) : (
            <ol className="space-y-3">
              {cardData.playbook.map((play, idx) => {
                const rankStr = String(idx + 1).padStart(2, '0');
                const isCopied = copiedIndex === idx;
                return (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-3 bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] p-3 rounded border border-[var(--border-subtle)] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono font-bold text-[var(--tone-positive)] mt-0.5">{rankStr}</span>
                      <span className="text-xs text-[var(--text-primary)] leading-relaxed">{play}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(play, idx)}
                      className="p-1 rounded bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 mt-0.5"
                      title="Copy to clipboard"
                    >
                      {isCopied ? (
                        <Check size={10} className="text-[var(--tone-positive)]" />
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
  );
}
