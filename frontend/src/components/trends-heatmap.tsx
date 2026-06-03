'use client';

import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface TrendsHeatmapProps {
  competitors: any[];
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
    <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f0f0f0] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
          Activity density heatmap
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">Less</span>
          {[0, 1, 2, 3].map((level) => (
            <div
              key={level}
              className={clsx(
                'w-3.5 h-3.5 rounded-sm',
                heatClasses[level].split(' ')[0]
              )}
            />
          ))}
          <span className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f5f5f5]">
              <th className="text-left text-[11px] font-medium text-[#737373] uppercase tracking-wide px-6 py-4 sticky left-0 bg-white w-[180px]">
                Competitor
              </th>
              {weeks.map((week) => (
                <th
                  key={week}
                  className="text-center text-[10px] font-medium text-[#a3a3a3] px-2 py-4 font-mono whitespace-nowrap"
                >
                  {week.replace(/^\d{4}-/, '')}
                </th>
              ))}
              <th className="text-right text-[11px] font-medium text-[#737373] uppercase tracking-wide px-6 py-4">
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
                  className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors"
                >
                  <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-[#fafafa] transition-colors">
                    <span className="text-sm font-medium text-[#0a0a0a] truncate block max-w-[160px]">
                      {comp.name || comp.url}
                    </span>
                  </td>
                  {comp.counts.map((count: number, i: number) => (
                    <td key={i} className="px-2 py-4 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: (compIndex * 0.05) + (i * 0.02), duration: 0.4, type: "spring" }}
                        title={`${count} change${count !== 1 ? 's' : ''} in week of ${weeks[i]}`}
                        className={clsx(
                          'w-7 h-7 rounded-[6px] mx-auto flex items-center justify-center text-[10px] font-semibold font-mono cursor-default',
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
  );
}
