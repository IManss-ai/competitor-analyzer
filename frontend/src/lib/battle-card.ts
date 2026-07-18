// Battle-card payload normalization, shared by the modal, the onboarding
// finale, and the dashboard. No 'use client': must stay importable from
// server components (mirrors lib/llm-meta.ts).

import { battleCardItemText, LLM_META_RE } from '@/lib/llm-meta';

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

// Coerce a battle-card list field to display strings. The API usually returns
// plain strings, but LLM/cached payloads can carry {type,text} / {title,detail}
// objects — rendering those raw throws React error #31 (see lib/llm-meta.ts).
// LLM meta-filler lines are dropped so each section's empty state renders.
export function toStringList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.map(battleCardItemText).filter(Boolean).filter((s) => !LLM_META_RE.test(s))
    : [];
}

// Normalize old API format (strings in what_changed, talking_points,
// win_conditions) vs new format (objects in what_changed, playbook,
// strategic_signals). Shared so every card surface renders the exact same
// report shape.
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
