// First-touch marketing attribution. captureAttribution() runs once per
// browser (root layout) and records utm_* params + the external referrer in
// localStorage; getAttribution() hands the stored object to the signup call so
// the backend can persist it on the User row (app/auth.py
// apply_signup_attribution). First-touch: an existing record is never
// overwritten by later visits.

const STORAGE_KEY = 'rs_attribution';

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}

export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // first touch wins

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
      const value = params.get(key)?.trim();
      if (value) attribution[key] = value.slice(0, 200);
    }
    const referrer = document.referrer;
    if (referrer && !referrer.startsWith(window.location.origin)) {
      attribution.referrer = referrer.slice(0, 200);
    }

    if (Object.keys(attribution).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
  } catch {
    // Private mode / storage quota — attribution is best-effort, never fatal.
  }
}

export function getAttribution(): Attribution | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}
