'use client';
import { useTheme } from '@/lib/use-theme';

export interface ChartPalette {
  accent: string; accentSoft: string;
  positive: string; warning: string; neutral: string; danger: string; violet: string;
  grid: string; axis: string; tick: string;
  surface: string; tooltipBg: string; tooltipBorder: string; cursor: string;
}

const PAPER: ChartPalette = {
  accent: '#345781', accentSoft: '#6a96c8',
  positive: '#1f5d3f', warning: '#8a5a12', neutral: '#5b6470', danger: '#b3261e', violet: '#6d4f9c',
  grid: 'rgba(26,23,20,0.08)', axis: 'rgba(26,23,20,0.18)', tick: '#6b6258',
  surface: '#ffffff', tooltipBg: '#ffffff', tooltipBorder: 'rgba(26,23,20,0.12)', cursor: 'rgba(26,23,20,0.04)',
};
const INK: ChartPalette = {
  accent: '#c8ff00', accentSoft: '#a8d600',
  positive: '#5aa07a', warning: '#c79a4e', neutral: '#9aa3af', danger: '#f87171', violet: '#9b7fc7',
  grid: 'rgba(233,236,242,0.07)', axis: 'rgba(233,236,242,0.16)', tick: '#9a9ea6',
  surface: '#101216', tooltipBg: '#15171c', tooltipBorder: 'rgba(233,236,242,0.14)', cursor: 'rgba(233,236,242,0.04)',
};

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return theme === 'ink' ? INK : PAPER;
}
