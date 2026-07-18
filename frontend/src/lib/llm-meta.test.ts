// Regression suite for the LLM meta-filler filter (LLM_META_RE and friends).
//
// The 25 repro cases below are ported VERBATIM from the 2026-07-16 QA-sweep
// node repros that drove commits 34463df (22 cases: end-anchored "No X
// detected" branch, first-person "as an AI, I", input-referencing context
// around "data provided") and 6e3843e (25 cases: added the ", which may
// indicate/suggest" hedge-tail alternative). That repro eval'd the regex out
// of the source file and was never committed; this suite imports the real
// module and is now the required gate for any llm-meta.ts regex change
// (`npm test` in frontend/).
//
// NOTE (TODOS.md watch item): first-scan Strategic Signals hedge phrasing
// like "No changes suggest X is stagnant..." deliberately does NOT match the
// regex today. Do not add it as a filler case without a founder call.
import { describe, it, expect } from 'vitest';
import {
  LLM_META_RE,
  isLlmMetaLine,
  battleCardItemText,
  stripLlmMetaFromCard,
} from '@/lib/llm-meta';

// 14 filler lines that MUST be caught (verbatim, 2026-07-16T11:20:12Z run).
const FILLER_CASES = [
  'No weaknesses explicitly listed in input',
  'No recent complaints available',
  'No recent customer complaints available',
  'No new changes detected',
  'No known weaknesses found.',
  'Based on the available data, no strategic shifts',
  'Based on the provided information there is little to report',
  'As an AI, I cannot verify this claim',
  'As an AI language model I do not have access to reviews',
  'No changes mentioned in the provided data',
  'Nothing listed in the input',
  'No strategic signals detected',
  'No recent competitor data changes detected, which may indicate slower update frequency or lack of visibility into competitor moves.',
  'No complaints found, which may suggest limited review volume',
];

// 11 real-intel lines that MUST pass through (false-positive guards, verbatim
// from the same run — each one was eaten by an earlier, looser regex).
const REAL_INTEL_CASES = [
  'Homepage repositioned as an AI-first sales platform',
  'Positioned as an AI assistant for CRM teams',
  'Shipped an AI model picker on the pricing page',
  'Users complain the data provided by their export API is stale',
  'No usage data available for sub-accounts on the Starter plan',
  'No pricing changes detected on their homepage since March, but reviews keep worsening',
  'Raised Starter to $29/mo, annual moved below the fold',
  '11 new Trustpilot complaints mention onboarding time',
  'Their AI data pipeline was mentioned in the changelog',
  'No-code integrations were removed from the free tier',
  'Absence of complaints may indicate strong customer satisfaction or limited public feedback',
];

describe('LLM_META_RE', () => {
  it.each(FILLER_CASES)('matches filler: %s', (line) => {
    expect(isLlmMetaLine(line)).toBe(true);
  });

  it.each(REAL_INTEL_CASES)('does NOT match real intel: %s', (line) => {
    expect(isLlmMetaLine(line)).toBe(false);
  });

  it('is exported as a case-insensitive regex', () => {
    expect(LLM_META_RE.flags).toContain('i');
    expect(LLM_META_RE.test('NO NEW CHANGES DETECTED')).toBe(true);
  });
});

describe('battleCardItemText', () => {
  it('passes strings through unchanged', () => {
    expect(battleCardItemText('Raised prices 10%')).toBe('Raised prices 10%');
  });

  it('coerces {type,text} objects to their text (React #31 family)', () => {
    expect(battleCardItemText({ type: 'play', text: 'Undercut on annual plans' })).toBe(
      'Undercut on annual plans'
    );
  });

  it('respects key priority text > detail > title > action > description', () => {
    expect(
      battleCardItemText({ description: 'd', action: 'a', title: 't', detail: 'de', text: 'x' })
    ).toBe('x');
    expect(battleCardItemText({ description: 'd', title: 't' })).toBe('t');
    expect(battleCardItemText({ description: 'd', action: 'a' })).toBe('a');
  });

  it('skips empty/whitespace priority keys and falls through', () => {
    expect(battleCardItemText({ text: '   ', detail: 'real detail' })).toBe('real detail');
  });

  it('salvages unknown-key objects by longest non-empty string value', () => {
    expect(battleCardItemText({ foo: 'short', bar: 'the much longer real content' })).toBe(
      'the much longer real content'
    );
  });

  it('returns empty string for null, undefined, numbers, and arrays with no strings', () => {
    expect(battleCardItemText(null)).toBe('');
    expect(battleCardItemText(undefined)).toBe('');
    expect(battleCardItemText(42)).toBe('');
    expect(battleCardItemText({ n: 3, ok: true })).toBe('');
  });
});

describe('stripLlmMetaFromCard', () => {
  it('drops filler lines while keeping real lines in the same array', () => {
    const card = {
      playbook: ['No strategic signals detected', 'Raised Starter to $29/mo, annual moved below the fold'],
    };
    expect(stripLlmMetaFromCard(card).playbook).toEqual([
      'Raised Starter to $29/mo, annual moved below the fold',
    ]);
  });

  it('filters {type,text} OBJECT items whose text is filler (repro only covered bare strings)', () => {
    const card = {
      what_changed: [
        { type: 'signal', text: 'No new changes detected' },
        { type: 'signal', text: 'Shipped an AI model picker on the pricing page' },
      ],
    };
    const out = stripLlmMetaFromCard(card);
    expect(out.what_changed).toEqual([
      { type: 'signal', text: 'Shipped an AI model picker on the pricing page' },
    ]);
  });

  it('only touches array fields; non-array fields pass through untouched', () => {
    const card = {
      executive_summary: 'No new changes detected', // string field: NOT filtered
      complaints: ['No recent complaints available'],
      generated_at: '2026-07-16',
      velocity: 3,
    };
    const out = stripLlmMetaFromCard(card);
    expect(out.executive_summary).toBe('No new changes detected');
    expect(out.complaints).toEqual([]);
    expect(out.generated_at).toBe('2026-07-16');
    expect(out.velocity).toBe(3);
  });

  it('does not mutate the input card', () => {
    const card = { plays: ['No strategic signals detected', 'Real play'] };
    stripLlmMetaFromCard(card);
    expect(card.plays).toEqual(['No strategic signals detected', 'Real play']);
  });
});
