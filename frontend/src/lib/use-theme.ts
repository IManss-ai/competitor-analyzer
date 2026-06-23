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

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  // The DOM is already in the correct theme via the pre-paint script in
  // layout.tsx; here we only sync React state to it.
  useEffect(() => { setThemeState(readEffectiveTheme()); }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem('theme', next);
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(readEffectiveTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
