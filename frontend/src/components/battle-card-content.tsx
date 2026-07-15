'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, X, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

// Coerce a battle-card list item to a display string. The API usually returns
// plain strings, but LLM/cached payloads can carry {type,text} / {title,detail}
// objects — rendering those raw throws React error #31. Key priority mirrors
// the backend's _item_text (app/routes/battlecard.py) and mailer._play_to_text.
// Coercion + LLM meta-filler detection live in lib/llm-meta.ts (no
// 'use client') so the share/[id] SERVER component can filter cards before
// they are serialized into the RSC payload. Re-exported for existing callers.
import { battleCardItemText, LLM_META_RE, isLlmMetaLine } from '@/lib/llm-meta';
export { battleCardItemText, isLlmMetaLine };

export function toStringList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.map(battleCardItemText).filter(Boolean).filter((s) => !LLM_META_RE.test(s))
    : [];
}

// DeepSeek battle-card copy sometimes carries inline markdown emphasis
// (**bold**, *italic*). The app has no markdown dependency (and this is not the
// Next.js you know), so parse just that subset into React nodes — text/element
// nodes only, never HTML, so it stays injection-safe. Before this, the card
// rendered literal asterisks (e.g. "**Pricing** is opaque"). Accepts a raw list
// item so callers can swap `battleCardItemText(x)` → `renderInlineMarkdown(x)`.
const MD_INLINE_RE = /\*\*([^*]+?)\*\*|\*(?!\s)([^*]+?)(?<!\s)\*/g;
export function renderInlineMarkdown(item: unknown): ReactNode {
  const s = typeof item === 'string' ? item : battleCardItemText(item);
  if (!s || !s.includes('*')) return s;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  MD_INLINE_RE.lastIndex = 0;
  while ((m = MD_INLINE_RE.exec(s)) !== null) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    if (m[1] !== undefined) nodes.push(<strong key={key++}>{m[1]}</strong>);
    else nodes.push(<em key={key++}>{m[2]}</em>);
    last = MD_INLINE_RE.lastIndex;
  }
  if (last === 0) return s; // no emphasis actually matched
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

// Normalize old API format (strings in what_changed, talking_points,
// win_conditions) vs new format (objects in what_changed, playbook,
// strategic_signals). Shared so the modal and the onboarding finale render
// the exact same report shape.
export function normalizeBattleCard(raw: any): BattleCardData {
  const whatChanged: { type: string; text: string }[] = Array.isArray(raw.what_changed)
    ? raw.what_changed
        .map((item: any) =>
          typeof item === 'string'
            ? { type: 'change', text: item }
            : { type: typeof item?.type === 'string' ? item.type : 'change', text: battleCardItemText(item) }
        )
        .filter((c: { text: string }) => c.text && !LLM_META_RE.test(c.text))
    : [];
  return {
    title: raw.title || '',
    executive_summary: raw.executive_summary || '',
    what_changed: whatChanged,
    weaknesses: toStringList(raw.weaknesses),
    strategic_signals: toStringList(raw.strategic_signals ?? raw.win_conditions),
    playbook: toStringList(raw.playbook ?? raw.talking_points ?? raw.actions),
    generated_at: raw.generated_at || new Date().toISOString(),
    variant: raw.variant === 'local' ? 'local' : 'saas',
    is_baseline: raw.is_baseline === true,
  };
}

function getBadgeClass(type: string | undefined | null) {
  if (!type) return 'tag-amber';
  const t = type.toLowerCase();
  if (t.includes('price') || t.includes('pricing')) return 'tag-amber';
  if (t.includes('feature') || t.includes('add')) return 'tag-green';
  if (t.includes('repositioning') || t.includes('messaging') || t.includes('pivot')) return 'tag-violet';
  if (t.includes('reputation')) return 'tag-red';
  if (t.includes('social') || t.includes('campaign')) return 'tag-green';
  if (t.includes('review')) return 'tag-amber';
  if (t.includes('offer') || t.includes('new')) return 'tag-blue';
  return 'tag-amber';
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
      <div className="p-6 space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl md:col-span-2" />
        </div>
        <div className="flex flex-col items-center gap-2 pt-2">
          <Loader2 size={20} className="animate-spin text-primary" />
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground animate-pulse">
            {loadingLabel || 'Analyzing competitor intelligence...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center">
        <X size={32} className="text-destructive" />
        <p className="text-sm font-medium text-destructive">{error}</p>
      </div>
    );
  }

  if (!cardData) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Executive Summary */}
      {cardData.executive_summary && (
        <Card className="bg-muted border-border">
          <CardContent className="pt-4 pb-4">
            <p className="text-[9px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-2">Executive Summary</p>
            <p className="text-foreground text-sm leading-relaxed italic">
              &quot;{renderInlineMarkdown(cardData.executive_summary)}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2x2 Grid */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Panel 1: Detected Changes */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0 * 0.07 }}
        >
          <Card className="h-full bg-card border-border">
            <CardHeader className="pb-3 pt-4 px-5">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
                {cardData.variant === 'local' ? 'Activity This Week' : 'Detected Changes'}
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {cardData.is_baseline ? (
                <p className="text-xs text-muted-foreground italic">
                  {cardData.variant === 'local'
                    ? 'No activity yet. Baseline captured. New reviews and posts appear after the next scan.'
                    : 'No changes detected yet. Baseline captured. New changes appear after the next scan.'}
                </p>
              ) : (!cardData.what_changed || cardData.what_changed.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">
                  {cardData.variant === 'local'
                    ? 'Quiet week: no new reviews or social posts'
                    : 'No significant changes detected this week'}
                </p>
              ) : (
                <div className="space-y-4">
                  {cardData.what_changed.map((change, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex">
                        <span className={`text-[8px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${getBadgeClass(change.type)}`}>
                          {getBadgeLabel(change.type)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-normal">{renderInlineMarkdown(change.text)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Panel 2: User Complaints */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 1 * 0.07 }}
        >
          <Card className="h-full bg-card border-border">
            <CardHeader className="pb-3 pt-4 px-5">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--tone-danger)' }}>
                User Complaints
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {(!cardData.weaknesses || cardData.weaknesses.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">No customer complaints reported</p>
              ) : (
                <ul className="space-y-3 text-xs text-foreground leading-normal">
                  {cardData.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="select-none" style={{ color: 'var(--tone-danger)' }}>›</span>
                      <span>{renderInlineMarkdown(weakness)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Panel 3: Strategic Signals */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 2 * 0.07 }}
          className="md:col-span-2"
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 pt-4 px-5">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--tone-warning)' }}>
                Strategic Signals
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {(!cardData.strategic_signals || cardData.strategic_signals.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">No strategic signals identified</p>
              ) : (
                <ul className="space-y-3 text-xs text-foreground leading-normal">
                  {cardData.strategic_signals.map((signal, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="select-none" style={{ color: 'var(--tone-warning)' }}>›</span>
                      <span>{renderInlineMarkdown(signal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Panel 4: Playbook */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 3 * 0.07 }}
          className="md:col-span-2"
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 pt-4 px-5">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--tone-positive)' }}>
                Playbook · This Week
              </p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {(!cardData.playbook || cardData.playbook.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">No playbook recommendations</p>
              ) : (
                <ol className="space-y-3">
                  {cardData.playbook.map((play, idx) => {
                    const rankStr = String(idx + 1).padStart(2, '0');
                    const isCopied = copiedIndex === idx;
                    return (
                      <li
                        key={idx}
                        className="flex items-start justify-between gap-3 bg-muted hover:bg-muted/80 p-3 rounded-lg border border-border transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono font-bold mt-0.5" style={{ color: 'var(--tone-positive)' }}>{rankStr}</span>
                          <span className="text-xs text-foreground leading-relaxed">{renderInlineMarkdown(play)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(play, idx)}
                          title="Copy to clipboard"
                          className="shrink-0 mt-0.5 h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                          {isCopied ? (
                            <Check size={10} style={{ color: 'var(--tone-positive)' }} />
                          ) : (
                            <Copy size={10} />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
