// Canonical inline-markdown renderer for LLM-authored card/brief copy.
// Single source of truth — battle-card-content, dashboard-client, the share
// page, and competitor-detail-client all render through this. No 'use client':
// must stay importable from server components (mirrors lib/llm-meta.ts).

import type { ReactNode } from 'react';
import { battleCardItemText } from '@/lib/llm-meta';

// DeepSeek battle-card copy sometimes carries inline markdown emphasis
// (**bold**, *italic*). The app has no markdown dependency, so parse just that
// subset into React nodes — text/element nodes only, never HTML, so it stays
// injection-safe. Before this, cards rendered literal asterisks (e.g.
// "**Pricing** is opaque" — the raw-asterisk bug fixed in ae70cbe). Raw
// asterisks that don't form an emphasis pair (e.g. "4.2* rating", "a * b")
// pass through verbatim. Accepts a raw list item so callers can swap
// `battleCardItemText(x)` → `renderInlineMarkdown(x)`.
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
  if (last === 0) return s; // no emphasis actually matched — raw asterisks pass through
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}
