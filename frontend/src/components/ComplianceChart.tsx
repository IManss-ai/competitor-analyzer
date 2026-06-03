"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  month: string;
  score: number;
  target: number;
}

const mockData: DataPoint[] = [
  { month: "Jan", score: 42, target: 80 },
  { month: "Feb", score: 55, target: 80 },
  { month: "Mar", score: 61, target: 80 },
  { month: "Apr", score: 70, target: 80 },
  { month: "May", score: 74, target: 80 },
  { month: "Jun", score: 82, target: 80 },
];

export default function ComplianceChart({ data = mockData }: { data?: DataPoint[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold">Compliance Score Over Time</h3>
          <p className="text-slate-500 text-sm mt-0.5">Monthly AB 2013 compliance percentage</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
            Actual
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-0.5 bg-slate-600 inline-block border-dashed border-t border-slate-600" />
            Target
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#475569" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#475569" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9" }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Area type="monotone" dataKey="target" stroke="#475569" strokeDasharray="5 5" fill="url(#targetGrad)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
