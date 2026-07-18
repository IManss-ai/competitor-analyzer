'use client';

import type { CSSProperties } from 'react';
import { useChartPalette } from '@/lib/chart-theme';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface HeatmapCompetitor {
  id: string;
  name: string;
  url: string;
  counts: number[];
}

interface TrendsHeatmapProps {
  competitors: HeatmapCompetitor[];
  weeks: string[];
  maxCount: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const v = m.length === 3
    ? m.split('').map((c) => c + c).join('')
    : m;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function TrendsHeatmap({ competitors, weeks, maxCount }: TrendsHeatmapProps) {
  const p = useChartPalette();
  const [r, g, b] = hexToRgb(p.accent);
  const rgba = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

  function heatLevel(count: number): 0 | 1 | 2 | 3 {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.6) return 2;
    return 3;
  }

  // Accent-derived intensity ramp: faint at the low end (faint-on-light in
  // paper, faint-on-dark in ink), solid accent at the top. Level 0 is an empty
  // cell, levels 1-3 ramp opacity, level 3 is full accent with on-accent text.
  const heatStyle = (level: 0 | 1 | 2 | 3): CSSProperties => {
    if (level === 0) {
      return { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' };
    }
    const fills = { 1: 0.16, 2: 0.4, 3: 1 } as const;
    return {
      backgroundColor: level === 3 ? p.accent : rgba(fills[level]),
      color: level === 3 ? 'var(--primary-foreground)' : 'var(--foreground)',
      border: `1px solid ${level === 3 ? p.accent : rgba(fills[level] + 0.1)}`,
    };
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border flex-row items-center justify-between">
        <CardTitle>Activity density heatmap</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Less</span>
          {([0, 1, 2, 3] as const).map((level) => (
            <div
              key={level}
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: heatStyle(level).backgroundColor, border: heatStyle(level).border }}
            />
          ))}
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">More</span>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th
                className="text-left text-xs font-mono uppercase tracking-wider px-6 py-4 sticky left-0 w-[180px] z-10 text-muted-foreground"
                style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
              >
                Competitor
              </th>
              {weeks.map((week) => (
                <th
                  key={week}
                  className="text-center text-xs font-mono px-2 py-4 whitespace-nowrap text-muted-foreground"
                >
                  {week.replace(/^\d{4}-/, '')}
                </th>
              ))}
              <th className="text-right text-xs font-mono uppercase tracking-wider px-6 py-4 text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp) => {
              const total = comp.counts.reduce((a: number, b: number) => a + b, 0);
              return (
                <tr
                  key={comp.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td
                    className="px-6 py-4 sticky left-0 z-10 transition-colors"
                    style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
                  >
                    <span className="text-sm font-medium truncate block max-w-[160px] text-foreground">
                      {comp.name || comp.url}
                    </span>
                  </td>
                  {comp.counts.map((count: number, i: number) => (
                    <td key={i} className="px-2 py-4 text-center">
                      <div
                        title={`${count} change${count !== 1 ? 's' : ''} in week of ${weeks[i]}`}
                        className="w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-xs font-semibold font-mono cursor-pointer"
                        style={heatStyle(heatLevel(count))}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold font-mono text-foreground">
                      {total}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
