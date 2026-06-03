'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartCompetitor {
  id: string;
  name: string;
  url: string;
}

export default function TrendsChart({ data, competitors }: { data: Record<string, string | number>[], competitors: ChartCompetitor[] }) {
  // Awwwards-tier curated accent colors (electric blue, deep emerald, rich amber, rose red, indigo, soft cyan, warm violet)
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#06b6d4", "#8b5cf6"];

  return (
    <div className="h-[220px] w-full group">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <defs>
            {competitors.map((comp, idx) => (
              <linearGradient key={`color-${comp.id}`} id={`color-${comp.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.16}/>
                <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
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
            cursor={{ stroke: '#e5e5e7', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8a8a8a' }} />
          {competitors.map((comp, idx) => (
            <Area 
              key={comp.id}
              type="monotone" 
              dataKey={comp.name || comp.url} 
              stroke={colors[idx % colors.length]} 
              fillOpacity={1}
              fill={`url(#color-${comp.id})`}
              strokeWidth={1.5}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
