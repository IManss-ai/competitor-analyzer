'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function readEffectiveTheme(): Theme {
  // Dark-first: dark is the default for everyone; light is opt-in only when the
  // visitor has explicitly chosen it (persisted in localStorage 'theme').
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(next: Theme) {
  // shadcn convention: the `.dark` class on <html> drives the dark token set.
  document.documentElement.classList.toggle('dark', next === 'dark');
}

// Same-tab toggles broadcast on this event so every useTheme() instance stays
// in sync (each call has its own useState; without this, components that read
// the `theme` value — e.g. charts via useChartPalette — keep the mount-time
// theme after a live toggle while the `.dark` class updates instantly).
const THEME_EVENT = 'rivalscope:themechange';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  // The DOM is already in the correct theme via the pre-paint script in
  // layout.tsx; here we sync React state to it and subscribe to changes from
  // other useTheme() instances (same tab) and other tabs (native storage).
  useEffect(() => {
    setThemeState(readEffectiveTheme());
    // Re-apply the class as well as React state so a cross-tab change (native
    // storage event, which doesn't run applyTheme in this tab) keeps the
    // `.dark` class and the JS theme value consistent. Idempotent same-tab.
    const sync = () => {
      const next = readEffectiveTheme();
      applyTheme(next);
      setThemeState(next);
    };
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem('theme', next);
    applyTheme(next);
    setThemeState(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setTheme(readEffectiveTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
