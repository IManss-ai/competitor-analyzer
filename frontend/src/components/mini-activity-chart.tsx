'use client';

import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function MiniActivityChart({ data }: { data: { value: number, active?: boolean }[] }) {
  return (
    <div className="h-12 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <Bar dataKey="value" radius={[2, 2, 2, 2]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.active ? '#2563eb' : '#e4e4e7'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
