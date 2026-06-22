import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Clean display domain for a competitor URL: hostname without the `www.`
 * prefix. Used as the fallback label when a competitor has no display name —
 * renders "stripe.com" instead of a bare "https://" scheme. Returns '' only
 * for an empty / scheme-only URL.
 */
export function competitorDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0];
  }
}
