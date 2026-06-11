'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartPalette } from '@/lib/chart-theme';

interface ChartCompetitor {
  id: string;
  name: string;
  url: string;
}

// Series labels fall back to the raw competitor URL when a name is missing,
// which can overflow and overlap the legend. Strip the protocol/path and cap
// the length so the legend stays on one tidy line.
function legendLabel(value: string) {
  const clean = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return clean.length > 22 ? `${clean.slice(0, 21)}…` : clean;
}

export default function TrendsChart({ data, competitors }: { data: Record<string, string | number>[], competitors: ChartCompetitor[] }) {
  const p = useChartPalette();
  const colors = [p.accent, p.positive, p.warning, p.accentSoft, p.violet, p.neutral, p.danger];

  // ResponsiveContainer measures its parent; rendering before the client lays
  // out this fixed-height wrapper makes it read -1x-1 and log a Recharts
  // warning (with an empty-chart flash). Gate on mount so it only measures the
  // real 220px box.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="h-[220px] w-full group">
      {mounted && (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={p.grid} />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fill: p.tick, fontSize: 10, fontFamily: 'var(--font-mono)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: p.tick, fontSize: 10, fontFamily: 'var(--font-mono)' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: p.tooltipBg, color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', border: `1px solid ${p.tooltipBorder}`, boxShadow: 'var(--shadow-card)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: 'var(--text-primary)', padding: '2px 0' }}
            cursor={{ stroke: p.axis, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }} formatter={(value) => legendLabel(String(value))} />
          {competitors.map((comp, idx) => (
            <Line 
              key={comp.id}
              type="monotone" 
              dataKey={comp.name || comp.url} 
              stroke={colors[idx % colors.length]} 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
