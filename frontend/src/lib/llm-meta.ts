// Battle-card text coercion + LLM meta-filler detection, shared between
// server components (share/[id]/page.tsx filters BEFORE serializing props,
// keeping filler out of the RSC payload crawlers read) and client card
// surfaces. No 'use client': must stay importable from server components.

// Battle-card fields sometimes arrive as {type,text}-style objects instead of
// strings; rendering those raw throws React error #31. Key priority mirrors
// the backend's _item_text (app/routes/battlecard.py) and mailer._play_to_text.
export function battleCardItemText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    for (const key of ['text', 'detail', 'title', 'action', 'description']) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim()) return val;
    }
    // Salvage an unknown-key object by its longest non-empty string value rather
    // than dropping real content (mirrors the backend _item_text fallback).
    const vals = Object.values(obj).filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    );
    if (vals.length) return vals.reduce((a, b) => (b.length > a.length ? b : a));
  }
  return '';
}

// DeepSeek sometimes writes disclaimers about its own prompt into card lists
// ("No weaknesses explicitly listed in input", "No recent complaints
// available") which read as raw AI output on user-facing and publicly crawled
// surfaces. Drop those lines and let each section's empty state render instead.
export const LLM_META_RE =
  /\b(?:listed|provided|available|mentioned|specified)\s+in\s+(?:the\s+)?(?:input|prompt|context|data)\b|\bdata\s+provided\b|\bbased\s+on\s+(?:the\s+)?(?:available|provided)\s+(?:data|information)\b|\bas\s+an?\s+AI\b|^no\s+(?:recent\s+|new\s+|known\s+)?[\w\s,-]*?\b(?:complaints?|weaknesses?|changes?|signals?|data)\b[\w\s,-]*?\b(?:available|detected|listed|found|reported)\b/i;

export function isLlmMetaLine(item: unknown): boolean {
  return LLM_META_RE.test(battleCardItemText(item));
}

// Filter every array field of a raw card object. Generic on purpose: cached
// cards vary in shape (playbook/actions/talking_points/win_conditions).
export function stripLlmMetaFromCard<T extends Record<string, unknown>>(card: T): T {
  const out: Record<string, unknown> = { ...card };
  for (const [key, val] of Object.entries(out)) {
    if (Array.isArray(val)) out[key] = val.filter((item) => !isLlmMetaLine(item));
  }
  return out as T;
}
