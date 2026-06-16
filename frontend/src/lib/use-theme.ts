'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'paper' | 'ink';

function readEffectiveTheme(): Theme {
  // Redesign: dark-first. Ink is the default for everyone; light is opt-in
  // only when the visitor has explicitly chosen it.
  if (typeof window === 'undefined') return 'ink';
  return localStorage.getItem('theme') === 'paper' ? 'paper' : 'ink';
}

function applyTheme(next: Theme) {
  // ink = attribute set; paper = attribute set to "paper" so the OS-dark media query
  // (:root:not([data-theme])) does NOT override an explicit paper choice.
  document.documentElement.setAttribute('data-theme', next);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('ink');

  // DOM is already in the correct theme via the inline pre-paint script + CSS
  // OS fallback; here we only sync React state. Do NOT add applyTheme() — it would
  // stamp data-theme and defeat the live OS-change path below for no-preference users.
  useEffect(() => { setThemeState(readEffectiveTheme()); }, []);

  // Dark-first: we no longer follow the OS color scheme. Default is ink for
  // everyone; the only way to light mode is the explicit toggle (saved pref).

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem('theme', next);
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(readEffectiveTheme() === 'ink' ? 'paper' : 'ink');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
