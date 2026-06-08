'use client';

import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { useChartPalette } from '@/lib/chart-theme';

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
      return { backgroundColor: 'var(--fill-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' };
    }
    const fills = { 1: 0.16, 2: 0.4, 3: 1 } as const;
    return {
      backgroundColor: level === 3 ? p.accent : rgba(fills[level]),
      color: level === 3 ? '#ffffff' : 'var(--text-primary)',
      border: `1px solid ${level === 3 ? p.accent : rgba(fills[level] + 0.1)}`,
    };
  };

  return (
    <div className="rs-card overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h2 className="rs-label">
          Activity density heatmap
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Less</span>
          {([0, 1, 2, 3] as const).map((level) => (
            <div
              key={level}
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: heatStyle(level).backgroundColor, border: heatStyle(level).border }}
            />
          ))}
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--fill-subtle)]">
              <th 
                className="text-left text-[10px] font-mono uppercase tracking-wider px-6 py-4 sticky left-0 w-[180px] z-10"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-raised)', borderRight: '1px solid var(--border-default)' }}
              >
                Competitor
              </th>
              {weeks.map((week) => (
                <th
                  key={week}
                  className="text-center text-[10px] font-mono px-2 py-4 whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {week.replace(/^\d{4}-/, '')}
                </th>
              ))}
              <th className="text-right text-[10px] font-mono uppercase tracking-wider px-6 py-4" style={{ color: 'var(--text-muted)' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp, compIndex) => {
              const total = comp.counts.reduce((a: number, b: number) => a + b, 0);
              return (
                <tr
                  key={comp.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--fill-subtle-hover)] transition-colors"
                >
                  <td 
                    className="px-6 py-4 sticky left-0 z-10 transition-colors"
                    style={{ backgroundColor: 'var(--surface-raised)', borderRight: '1px solid var(--border-default)' }}
                  >
                    <span className="text-sm font-medium truncate block max-w-[160px]" style={{ color: 'var(--text-primary)' }}>
                      {comp.name || comp.url}
                    </span>
                  </td>
                  {comp.counts.map((count: number, i: number) => (
                    <td key={i} className="px-2 py-4 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.04 }}
                        viewport={{ once: true }}
                        transition={{ delay: (compIndex * 0.04) + (i * 0.01), duration: 0.35, type: "spring" }}
                        title={`${count} change${count !== 1 ? 's' : ''} in week of ${weeks[i]}`}
                        className="w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono cursor-pointer"
                        style={heatStyle(heatLevel(count))}
                      >
                        {count > 0 ? count : ''}
                      </motion.div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {total}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
