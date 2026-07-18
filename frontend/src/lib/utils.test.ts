import { describe, it, expect } from 'vitest';
import { competitorDomain, cn } from '@/lib/utils';

describe('competitorDomain', () => {
  it('extracts hostname from a full URL', () => {
    expect(competitorDomain('https://stripe.com')).toBe('stripe.com');
    expect(competitorDomain('https://stripe.com/pricing')).toBe('stripe.com');
  });

  it('strips the www. prefix', () => {
    expect(competitorDomain('https://www.stripe.com')).toBe('stripe.com');
  });

  it('handles bare domains without a scheme (URL parse fails, fallback path)', () => {
    expect(competitorDomain('stripe.com')).toBe('stripe.com');
    expect(competitorDomain('www.stripe.com/pricing')).toBe('stripe.com');
  });

  it('returns empty string for empty input', () => {
    expect(competitorDomain('')).toBe('');
  });

  it('returns empty string for a scheme-only URL', () => {
    expect(competitorDomain('https://')).toBe('');
  });

  it('keeps the port as part of the hostname-ish fallback but not for parsed URLs', () => {
    // Parsed URL: hostname excludes the port.
    expect(competitorDomain('http://localhost:8000/x')).toBe('localhost');
  });
});

describe('cn', () => {
  it('merges tailwind classes with later values winning', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional class values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
