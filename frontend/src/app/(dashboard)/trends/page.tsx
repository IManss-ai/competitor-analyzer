"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const complianceTrend = [
  { month: "Jan", you: 42, industry: 55 },
  { month: "Feb", you: 55, industry: 57 },
  { month: "Mar", you: 61, industry: 60 },
  { month: "Apr", you: 70, industry: 62 },
  { month: "May", you: 74, industry: 65 },
  { month: "Jun", you: 82, industry: 69 },
];

const datasetGrowth = [
  { month: "Jan", datasets: 2 },
  { month: "Feb", datasets: 3 },
  { month: "Mar", datasets: 5 },
  { month: "Apr", datasets: 5 },
  { month: "May", datasets: 7 },
  { month: "Jun", datasets: 9 },
];

const benchmarks = [
  { name: "OpenAI",    score: 95, datasets: 32 },
  { name: "Anthropic", score: 91, datasets: 14 },
  { name: "Google",    score: 88, datasets: 41 },
  { name: "Mistral",   score: 78, datasets: 9  },
  { name: "You",       score: 82, datasets: 9, highlight: true },
  { name: "Cohere",    score: 65, datasets: 6  },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9" },
  labelStyle: { color: "#94a3b8" },
};

export default function TrendsPage() {
  return (
    <div className="space-y-5">
      {/* Compliance score vs industry */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-white font-semibold mb-1">Compliance Score vs Industry</h3>
        <p className="text-slate-500 text-sm mb-5">Your score vs industry average over 6 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={complianceTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="youGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="industryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Area type="monotone" dataKey="industry" name="Industry Avg" stroke="#10b981" fill="url(#industryGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="you" name="Your Score" stroke="#6366f1" fill="url(#youGrad)" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Dataset growth */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-white font-semibold mb-1">Dataset Growth</h3>
          <p className="text-slate-500 text-sm mb-5">Cumulative datasets documented</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={datasetGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="datasets" name="Datasets" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry benchmark */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-white font-semibold mb-1">Industry Benchmarks</h3>
          <p className="text-slate-500 text-sm mb-4">AB 2013 compliance ranking</p>
          <div className="space-y-3">
            {benchmarks
              .sort((a, b) => b.score - a.score)
              .map((b) => (
                <div key={b.name} className={`flex items-center gap-3 ${b.highlight ? "bg-indigo-500/10 -mx-2 px-2 py-1 rounded-lg border border-indigo-500/20" : ""}`}>
                  <span className={`w-20 text-sm font-medium flex-shrink-0 ${b.highlight ? "text-indigo-300" : "text-slate-400"}`}>{b.name}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.highlight ? "bg-indigo-500" : b.score >= 80 ? "bg-emerald-500" : b.score >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-300 w-10 text-right font-mono">{b.score}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
