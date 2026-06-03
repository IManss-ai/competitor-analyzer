'use client';

import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function MiniActivityChart({ data }: { data: Array<{ value: number; active?: boolean }> }) {
  return (
    <ResponsiveContainer width={120} height={48}>
      <BarChart data={data} barSize={8} barGap={2}>
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.active ? '#2563eb' : '#e5e5e5'} />
          ))}
        </Bar>
        <Tooltip
          content={({ active, payload }) => active && payload?.length ? (
            <div className="bg-[#0a0a0a] text-white text-[10px] px-2 py-1 rounded font-mono">
              {payload[0].value} changes
            </div>
          ) : null}
          cursor={{ fill: '#fafafa' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
