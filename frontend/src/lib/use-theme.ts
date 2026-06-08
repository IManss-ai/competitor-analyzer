'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'paper' | 'ink';

function readEffectiveTheme(): Theme {
  if (typeof window === 'undefined') return 'paper';
  const saved = localStorage.getItem('theme');
  if (saved === 'ink' || saved === 'paper') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ink' : 'paper';
}

function applyTheme(next: Theme) {
  // ink = attribute set; paper = attribute set to "paper" so the OS-dark media query
  // (:root:not([data-theme])) does NOT override an explicit paper choice.
  document.documentElement.setAttribute('data-theme', next);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('paper');

  useEffect(() => { setThemeState(readEffectiveTheme()); }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!localStorage.getItem('theme')) {
        const next: Theme = mq.matches ? 'ink' : 'paper';
        setThemeState(next);
        if (next === 'ink') document.documentElement.setAttribute('data-theme', 'ink');
        else document.documentElement.removeAttribute('data-theme');
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
