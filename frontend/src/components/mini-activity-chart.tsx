'use client';

import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function MiniActivityChart({ data }: { data: Array<{ value: number; active?: boolean }> }) {
  return (
    <ResponsiveContainer width={120} height={48}>
      <BarChart data={data} barSize={8} barGap={2}>
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.active ? '#0ea5e9' : 'rgba(255,255,255,0.08)'} />
          ))}
        </Bar>
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div
              className="text-[10px] px-2 py-1 rounded font-mono"
              style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {payload[0].value} changes
            </div>
          ) : null}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
