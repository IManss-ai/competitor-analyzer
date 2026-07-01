'use client';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartPalette } from '@/lib/chart-theme';

export default function MiniActivityChart({ data }: { data: Array<{ value: number; active?: boolean }> }) {
  const p = useChartPalette();
  return (
    <ResponsiveContainer width={120} height={48}>
      <BarChart data={data} barSize={8} barGap={2}>
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.active ? p.accent : p.grid} />
          ))}
        </Bar>
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div className="text-[10px] px-2 py-1 rounded font-mono"
              style={{ background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              {payload[0].value} changes
            </div>
          ) : null}
          cursor={{ fill: p.cursor }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
