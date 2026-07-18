import { describe, it, expect } from 'vitest';
import { normalizeBattleCard, toStringList } from '@/lib/battle-card';

describe('toStringList', () => {
  it('returns [] for non-arrays', () => {
    expect(toStringList(undefined)).toEqual([]);
    expect(toStringList('not a list')).toEqual([]);
    expect(toStringList({ 0: 'x' })).toEqual([]);
  });

  it('passes plain strings through', () => {
    expect(toStringList(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('coerces {type,text} / {title,detail} objects to strings', () => {
    expect(
      toStringList([{ type: 'pricing', text: 'Raised prices' }, { title: 'New tier' }])
    ).toEqual(['Raised prices', 'New tier']);
  });

  it('drops empty items and LLM meta-filler lines, keeps real intel', () => {
    expect(
      toStringList([
        '',
        'No weaknesses explicitly listed in input',
        'Slow support response times',
        'Repositioned as an AI-first platform', // must NOT be filtered (34463df regression class)
      ])
    ).toEqual(['Slow support response times', 'Repositioned as an AI-first platform']);
  });
});

describe('normalizeBattleCard', () => {
  it('normalizes the old string-based format', () => {
    const card = normalizeBattleCard({
      title: 'Acme',
      what_changed: ['Homepage headline rewritten'],
      weaknesses: ['Pricing is opaque'],
      win_conditions: ['Faster onboarding'],
      talking_points: ['Lead with migration tooling'],
      generated_at: '2026-07-01T00:00:00Z',
    });
    expect(card.what_changed).toEqual([{ type: 'change', text: 'Homepage headline rewritten' }]);
    expect(card.strategic_signals).toEqual(['Faster onboarding']);
    expect(card.playbook).toEqual(['Lead with migration tooling']);
    expect(card.variant).toBe('saas');
    expect(card.is_baseline).toBe(false);
  });

  it('normalizes the new object-based format', () => {
    const card = normalizeBattleCard({
      title: 'Acme',
      executive_summary: 'They moved upmarket.',
      what_changed: [{ type: 'pricing_change', text: 'Pro plan now $99' }],
      weaknesses: [{ text: 'No SSO' }],
      strategic_signals: [{ detail: 'Hiring enterprise AEs' }],
      playbook: [{ action: 'Pitch SSO on every call' }],
      generated_at: '2026-07-01T00:00:00Z',
      variant: 'local',
      is_baseline: true,
    });
    expect(card.what_changed).toEqual([{ type: 'pricing_change', text: 'Pro plan now $99' }]);
    expect(card.weaknesses).toEqual(['No SSO']);
    expect(card.strategic_signals).toEqual(['Hiring enterprise AEs']);
    expect(card.playbook).toEqual(['Pitch SSO on every call']);
    expect(card.variant).toBe('local');
    expect(card.is_baseline).toBe(true);
  });

  it('drops what_changed entries that are empty or LLM meta-filler', () => {
    const card = normalizeBattleCard({
      what_changed: [
        { text: '' }, // nothing to salvage → dropped
        'No new changes detected',
        { type: 'feature_add', text: 'Added API rate-limit tier' },
      ],
    });
    expect(card.what_changed).toEqual([{ type: 'feature_add', text: 'Added API rate-limit tier' }]);
  });

  it('defaults missing fields safely', () => {
    const card = normalizeBattleCard({});
    expect(card.title).toBe('');
    expect(card.executive_summary).toBe('');
    expect(card.what_changed).toEqual([]);
    expect(card.weaknesses).toEqual([]);
    expect(card.strategic_signals).toEqual([]);
    expect(card.playbook).toEqual([]);
    expect(typeof card.generated_at).toBe('string');
    expect(card.variant).toBe('saas');
  });
});
