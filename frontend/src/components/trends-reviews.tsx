'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { ReviewTrend } from '@/lib/types';

export default function TrendsReviews({ trends }: { trends: ReviewTrend[] }) {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#06b6d4", "#8b5cf6"];

  const allDates = Array.from(
    new Set(
      trends.flatMap((t) => t.history.map((h) => h.date).filter(Boolean) as string[])
    )
  ).sort();

  if (allDates.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center border border-dashed border-zinc-200 rounded-lg text-sm text-[#737373] bg-[#fafafa]">
        No review score trends available yet.
      </div>
    );
  }

  const chartData = allDates.map((date) => {
    const point: Record<string, any> = { date };
    trends.forEach((t) => {
      const hist = t.history.find((h) => h.date === date);
      if (hist && hist.avg_rating !== null) {
        point[t.name] = hist.avg_rating;
      }
    });
    return point;
  });

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f2" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8a8a8a', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
            dy={10}
          />
          <YAxis 
            domain={[1, 5]}
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
          {trends.map((t, idx) => (
            <Line 
              key={t.id}
              type="monotone" 
              dataKey={t.name} 
              stroke={colors[idx % colors.length]} 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
