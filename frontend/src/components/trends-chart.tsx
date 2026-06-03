'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
interface ChartCompetitor {
  id: string;
  name: string;
  url: string;
}

export default function TrendsChart({ data, competitors }: { data: Record<string, string | number>[], competitors: ChartCompetitor[] }) {
  const colors = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];

  return (
    <div className="h-[200px] w-full group">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
          <defs>
            {competitors.map((comp, idx) => (
              <linearGradient key={`color-${comp.id}`} id={`color-${comp.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="week" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a3a3a3', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0a0a', color: '#ffffff', borderRadius: '8px', border: '1px solid #1a1a1a', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            itemStyle={{ color: '#ffffff' }}
            cursor={{ stroke: '#e5e5e5', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
          {competitors.map((comp, idx) => (
            <Area 
              key={comp.id}
              type="monotone" 
              dataKey={comp.name || comp.url} 
              stroke={colors[idx % colors.length]} 
              fillOpacity={1}
              fill={`url(#color-${comp.id})`}
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
