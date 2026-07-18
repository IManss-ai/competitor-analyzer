import { describe, it, expect } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderInlineMarkdown } from '@/lib/markdown';

// Node-env tokenization tests: assert on the returned React element tree
// (plain objects) without rendering — no jsdom this wave.

type Token = string | { tag: string; text: ReactNode };

function tokenize(result: ReactNode): Token[] | string {
  if (!Array.isArray(result)) return result as string;
  return result.map((node) => {
    if (isValidElement(node)) {
      const el = node as ReactElement<{ children?: ReactNode }>;
      return { tag: String(el.type), text: el.props.children };
    }
    return node as string;
  });
}

describe('renderInlineMarkdown', () => {
  it('renders **bold** as a strong element with surrounding text preserved', () => {
    const out = tokenize(renderInlineMarkdown('**Pricing** is opaque'));
    expect(out).toEqual([{ tag: 'strong', text: 'Pricing' }, ' is opaque']);
  });

  it('renders *italic* as an em element', () => {
    const out = tokenize(renderInlineMarkdown('a *subtle* shift'));
    expect(out).toEqual(['a ', { tag: 'em', text: 'subtle' }, ' shift']);
  });

  it('handles multiple and mixed emphasis spans in one string', () => {
    const out = tokenize(renderInlineMarkdown('**Bold** then *italic* then **more**'));
    expect(out).toEqual([
      { tag: 'strong', text: 'Bold' },
      ' then ',
      { tag: 'em', text: 'italic' },
      ' then ',
      { tag: 'strong', text: 'more' },
    ]);
  });

  it('passes raw unpaired asterisks through verbatim (ae70cbe bug class)', () => {
    // Space-flanked single asterisks are not emphasis — must not be eaten.
    expect(renderInlineMarkdown('a * b * c')).toBe('a * b * c');
    expect(renderInlineMarkdown('4.2* rating on G2')).toBe('4.2* rating on G2');
  });

  it('preserves raw asterisk text alongside a real bold span', () => {
    const out = tokenize(renderInlineMarkdown('rated 4.2* but **pricing doubled**'));
    expect(out).toEqual(['rated 4.2* but ', { tag: 'strong', text: 'pricing doubled' }]);
  });

  it('handles nested asterisk runs without losing characters', () => {
    // "***x***" — the bold pair wins; the outermost raw asterisks pass through.
    const out = tokenize(renderInlineMarkdown('***x***'));
    expect(out).toEqual(['*', { tag: 'strong', text: 'x' }, '*']);
  });

  it('returns plain text unchanged (no asterisks fast path)', () => {
    expect(renderInlineMarkdown('plain text, no markdown')).toBe('plain text, no markdown');
  });

  it('returns empty string for empty input', () => {
    expect(renderInlineMarkdown('')).toBe('');
  });

  it('coerces {type,text} objects before rendering', () => {
    const out = tokenize(renderInlineMarkdown({ type: 'pricing', text: '**Doubled** overnight' }));
    expect(out).toEqual([{ tag: 'strong', text: 'Doubled' }, ' overnight']);
  });

  it('coerces non-string junk to empty string instead of crashing', () => {
    expect(renderInlineMarkdown(null)).toBe('');
    expect(renderInlineMarkdown(42)).toBe('');
  });
});
