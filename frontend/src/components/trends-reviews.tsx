'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { ReviewTrend } from '@/lib/types';
import { useChartPalette } from '@/lib/chart-theme';

export default function TrendsReviews({ trends }: { trends: ReviewTrend[] }) {
  const p = useChartPalette();
  const colors = [p.accent, p.positive, p.warning, p.accentSoft, p.violet, p.neutral, p.danger];

  // Gate the ResponsiveContainer on mount so it measures the real 220px box
  // instead of -1x-1 on first paint (Recharts dimension warning).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const allDates = Array.from(
    new Set(
      trends.flatMap((t) => t.history.map((h) => h.date).filter(Boolean) as string[])
    )
  ).sort();

  if (allDates.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center border border-dashed border-[var(--border-default)] rounded-lg text-sm bg-[var(--fill-subtle)]" style={{ color: 'var(--text-secondary)' }}>
        No review score trends available yet.
      </div>
    );
  }

  const chartData = allDates.map((date) => {
    const point: Record<string, any> = { date };
    trends.forEach((t) => {
      const hist = t.history.find((h) => h.date === date);
      if (hist && hist.avg_rating !== null) {
        point[t.name] = hist.avg_rating;
      }
    });
    return point;
  });

  return (
    <div className="h-[220px] w-full">
      {mounted && (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={p.grid} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: p.tick, fontSize: 10, fontFamily: 'var(--font-mono)' }}
            dy={10}
          />
          <YAxis
            domain={[1, 5]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: p.tick, fontSize: 10, fontFamily: 'var(--font-mono)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: p.tooltipBg, color: 'var(--text-primary)', borderRadius: '12px', border: `1px solid ${p.tooltipBorder}`, boxShadow: 'var(--shadow-card)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: 'var(--text-primary)', padding: '2px 0' }}
            cursor={{ stroke: p.axis, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }} />
          {trends.map((t, idx) => (
            <Line 
              key={t.id}
              type="monotone" 
              dataKey={t.name} 
              stroke={colors[idx % colors.length]} 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
