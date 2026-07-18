import { describe, it, expect } from 'vitest';
import { isAbortError } from '@/lib/fetch-utils';

describe('isAbortError', () => {
  it('recognizes a DOMException named AbortError', () => {
    expect(isAbortError(new DOMException('The operation was aborted', 'AbortError'))).toBe(true);
  });

  it('does not flag other DOMExceptions', () => {
    expect(isAbortError(new DOMException('quota', 'QuotaExceededError'))).toBe(false);
  });

  it('recognizes teardown TypeErrors by message', () => {
    expect(isAbortError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isAbortError(new TypeError('The operation was aborted'))).toBe(true);
    expect(isAbortError(new TypeError('The request was cancelled'))).toBe(true);
    expect(isAbortError(new TypeError('Request canceled by user'))).toBe(true);
  });

  it('does not flag unrelated TypeErrors', () => {
    expect(isAbortError(new TypeError('x is not a function'))).toBe(false);
  });

  it('does not flag plain Errors even with abort-like messages', () => {
    expect(isAbortError(new Error('Failed to fetch'))).toBe(false);
  });

  it('does not flag non-error values', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('aborted')).toBe(false);
    expect(isAbortError({ name: 'AbortError' })).toBe(false);
  });
});
