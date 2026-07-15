'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { TypeBreakdownPoint } from '@/lib/types';
import { useChartPalette } from '@/lib/chart-theme';

export default function TrendsTypeBreakdown({ data }: { data: TypeBreakdownPoint[] }) {
  const p = useChartPalette();
  const formattedData = data.map((d) => ({
    ...d,
    week: d.week.replace(/^\d{4}-/, ''),
  }));

  // ResponsiveContainer measures its parent; rendering before the client lays
  // out this fixed-height wrapper makes it read -1x-1 and log a Recharts
  // warning (with an empty-chart flash). Gate on mount so it only measures the
  // real 220px box.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasAnyChanges = data.some(
    (d) => (d.pricing_change || 0) + (d.new_feature || 0) + (d.positioning_shift || 0) + (d.minor_copy || 0) > 0
  );

  if (!hasAnyChanges) {
    return (
      <div className="h-[220px] w-full flex items-center justify-center">
        <p className="text-[12px] font-mono text-muted-foreground">
          No changes classified yet. The breakdown fills in as scans detect them.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      {mounted && (
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 220 }}>
        <BarChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
            contentStyle={{ backgroundColor: p.tooltipBg, color: 'var(--foreground)', borderRadius: 'var(--radius-md)', border: `1px solid ${p.tooltipBorder}`, fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: 'var(--foreground)', padding: '2px 0' }}
            cursor={{ fill: p.cursor }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)' }} />
          <Bar dataKey="pricing_change" name="Pricing Change" stackId="a" fill={p.warning} />
          <Bar dataKey="new_feature" name="New Feature" stackId="a" fill={p.positive} />
          <Bar dataKey="positioning_shift" name="Positioning Shift" stackId="a" fill={p.violet} />
          <Bar dataKey="minor_copy" name="Minor Copy" stackId="a" fill={p.neutral} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
