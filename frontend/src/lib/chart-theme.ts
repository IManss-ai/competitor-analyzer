'use client';
import { useTheme } from '@/lib/use-theme';

export interface ChartPalette {
  accent: string; accentSoft: string;
  positive: string; warning: string; neutral: string; danger: string; violet: string;
  grid: string; axis: string; tick: string;
  surface: string; tooltipBg: string; tooltipBorder: string; cursor: string;
}

// Recharts needs concrete colors (it can't always read CSS vars), so these
// mirror the shadcn neutral-modern tokens: blue primary + zinc neutrals.
const LIGHT: ChartPalette = {
  accent: '#5266eb', accentSoft: '#8aa6ff',
  positive: '#1f5d3f', warning: '#8a5a12', neutral: '#5b6470', danger: '#b3261e', violet: '#6d4f9c',
  grid: 'rgba(9,9,11,0.08)', axis: 'rgba(9,9,11,0.18)', tick: '#71717a',
  surface: '#ffffff', tooltipBg: '#ffffff', tooltipBorder: 'rgba(9,9,11,0.12)', cursor: 'rgba(9,9,11,0.04)',
};
const DARK: ChartPalette = {
  accent: '#6e7cf0', accentSoft: '#a9b6ff',
  positive: '#5aa07a', warning: '#c79a4e', neutral: '#9aa3af', danger: '#f87171', violet: '#9b7fc7',
  grid: 'rgba(250,250,250,0.07)', axis: 'rgba(250,250,250,0.16)', tick: '#a1a1aa',
  surface: '#18181b', tooltipBg: '#18181b', tooltipBorder: 'rgba(250,250,250,0.12)', cursor: 'rgba(250,250,250,0.04)',
};

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === 'dark' ? DARK : LIGHT;
}
