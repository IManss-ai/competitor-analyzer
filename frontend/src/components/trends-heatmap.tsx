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
    'bg-[#f5f5f5] text-[#a3a3a3]',
    'bg-blue-100 text-blue-600',
    'bg-blue-400 text-white',
    'bg-blue-600 text-white',
  ];

  return (
    <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl transition-all">
      <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xs font-mono text-[#737373] uppercase tracking-wider">
            Activity density heatmap
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider">Less</span>
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={clsx(
                  'w-3.5 h-3.5 rounded-sm',
                  heatClasses[level].split(' ')[0]
                )}
              />
            ))}
            <span className="text-[10px] font-mono text-[#a3a3a3] uppercase tracking-wider">More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-50">
                <th className="text-left text-[10px] font-mono text-[#737373] uppercase tracking-wider px-6 py-4 sticky left-0 bg-white w-[180px]">
                  Competitor
                </th>
                {weeks.map((week) => (
                  <th
                    key={week}
                    className="text-center text-[10px] font-mono text-[#a3a3a3] px-2 py-4 whitespace-nowrap"
                  >
                    {week.replace(/^\d{4}-/, '')}
                  </th>
                ))}
                <th className="text-right text-[10px] font-mono text-[#737373] uppercase tracking-wider px-6 py-4">
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
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-zinc-50/50 transition-colors">
                      <span className="text-sm font-medium text-[#0a0a0a] truncate block max-w-[160px]">
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
                            'w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(37,99,235,0.15)]',
                            heatClasses[heatLevel(count)]
                          )}
                        >
                          {count > 0 ? count : ''}
                        </motion.div>
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-[#0a0a0a] font-mono">
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
    </div>
  );
}
