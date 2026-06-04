'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { TypeBreakdownPoint } from '@/lib/types';

export default function TrendsTypeBreakdown({ data }: { data: TypeBreakdownPoint[] }) {
  const formattedData = data.map((d) => ({
    ...d,
    week: d.week.replace(/^\d{4}-/, ''),
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f2" />
          <XAxis 
            dataKey="week" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8a8a8a', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8a8a8a', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0a0f', color: '#ffffff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: '#ffffff', padding: '2px 0' }}
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8a8a8a' }} />
          <Bar dataKey="pricing_change" name="Pricing Change" stackId="a" fill="#ef4444" />
          <Bar dataKey="new_feature" name="New Feature" stackId="a" fill="#3b82f6" />
          <Bar dataKey="positioning_shift" name="Positioning Shift" stackId="a" fill="#8b5cf6" />
          <Bar dataKey="minor_copy" name="Minor Copy" stackId="a" fill="#d1d5db" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
