// Distinguishes "the request was aborted because the component unmounted /
// the user navigated away" from a genuine network or API failure. Aborted
// in-flight fetches reject with a DOMException AbortError (or a bare
// "Failed to fetch" TypeError in some browsers when the page tears down),
// which is expected and must NOT be logged as an error — it's just cleanup.
export function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  // Some engines surface a navigation-time teardown as a TypeError with this
  // message rather than a named AbortError.
  if (e instanceof TypeError && /Failed to fetch|aborted|cancell?ed/i.test(e.message)) return true;
  return false;
}
