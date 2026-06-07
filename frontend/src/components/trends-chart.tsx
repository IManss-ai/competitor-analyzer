'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartCompetitor {
  id: string;
  name: string;
  url: string;
}

export default function TrendsChart({ data, competitors }: { data: Record<string, string | number>[], competitors: ChartCompetitor[] }) {
  const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#38bdf8", "#ec4899", "#a78bfa", "#f43f5e"];

  return (
    <div className="h-[220px] w-full group">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis 
            dataKey="week" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0c1120', color: '#e8eaf0', borderRadius: '12px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: '#e8eaf0', padding: '2px 0' }}
            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }} />
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
    </div>
  );
}
