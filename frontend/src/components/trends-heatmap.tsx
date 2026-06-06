'use client';

import { motion } from 'motion/react';
import { clsx } from 'clsx';

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

export default function TrendsHeatmap({ competitors, weeks, maxCount }: TrendsHeatmapProps) {
  function heatLevel(count: number): 0 | 1 | 2 | 3 {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.6) return 2;
    return 3;
  }

  const heatClasses = [
    'bg-white/5 text-[#8892a4] border border-white/[0.04]',
    'bg-purple-900/30 text-purple-300 border border-purple-800/20',
    'bg-purple-800/60 text-purple-200 border border-purple-700/30',
    'bg-[var(--accent-primary)] text-white border border-[var(--accent-border)]',
  ];

  return (
    <div className="rs-card overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <h2 className="rs-label">
          Activity density heatmap
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Less</span>
          {[0, 1, 2, 3].map((level) => (
            <div
              key={level}
              className={clsx(
                'w-3.5 h-3.5 rounded-sm',
                heatClasses[level].split(' ')[0]
              )}
            />
          ))}
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
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
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
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
                        whileHover={{ scale: 1.12, y: -0.5 }}
                        viewport={{ once: true }}
                        transition={{ delay: (compIndex * 0.04) + (i * 0.01), duration: 0.35, type: "spring" }}
                        title={`${count} change${count !== 1 ? 's' : ''} in week of ${weeks[i]}`}
                        className={clsx(
                          'w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(124,58,237,0.15)]',
                          heatClasses[heatLevel(count)]
                        )}
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
