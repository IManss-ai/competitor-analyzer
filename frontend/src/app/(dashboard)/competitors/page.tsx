"use client";

import { useState } from "react";
import type { Competitor } from "@/lib/types";
import clsx from "clsx";
import { Plus, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

const MOCK_COMPETITORS: Competitor[] = [
  { id: "1", name: "Anthropic",  url: "https://anthropic.com", compliance_score: 91, last_checked: "2026-06-03", datasets_disclosed: 14 },
  { id: "2", name: "Mistral AI", url: "https://mistral.ai",   compliance_score: 78, last_checked: "2026-06-03", datasets_disclosed: 9  },
  { id: "3", name: "Cohere",     url: "https://cohere.com",   compliance_score: 65, last_checked: "2026-06-02", datasets_disclosed: 6  },
  { id: "4", name: "AI21 Labs",  url: "https://ai21.com",     compliance_score: 42, last_checked: "2026-06-01", datasets_disclosed: 3  },
];

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 max-w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full", score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500")}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx("text-sm font-semibold", score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400")}>
        {score}%
      </span>
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState(MOCK_COMPETITORS);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const myScore = 82;

  function addCompetitor() {
    if (!newName || !newUrl) return;
    setCompetitors((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newName, url: newUrl, compliance_score: 0, last_checked: "Never", datasets_disclosed: 0 },
    ]);
    setNewName(""); setNewUrl(""); setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* My score vs industry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-5">
          <p className="text-slate-400 text-sm mb-1">Your Score</p>
          <p className="text-white text-3xl font-bold">{myScore}%</p>
          <p className="text-indigo-400 text-xs mt-1">▲ 8% this month</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-slate-400 text-sm mb-1">Industry Average</p>
          <p className="text-white text-3xl font-bold">69%</p>
          <p className="text-emerald-400 text-xs mt-1">You&apos;re above average</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-slate-400 text-sm mb-1">Competitors Tracked</p>
          <p className="text-white text-3xl font-bold">{competitors.length}</p>
          <p className="text-slate-500 text-xs mt-1">Updated daily</p>
        </div>
      </div>

      {/* Competitors table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Competitor Compliance Tracker</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs transition-all">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-all"
            >
              <Plus className="w-3 h-3" /> Add Competitor
            </button>
          </div>
        </div>

        {showForm && (
          <div className="flex gap-3 px-5 py-3 bg-slate-800/50 border-b border-slate-800">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company name" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            <button onClick={addCompetitor} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-all">Add</button>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="text-left px-5 py-3 font-medium">Company</th>
              <th className="text-left px-5 py-3 font-medium">Compliance Score</th>
              <th className="text-left px-5 py-3 font-medium">vs You</th>
              <th className="text-left px-5 py-3 font-medium">Datasets</th>
              <th className="text-left px-5 py-3 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c, i) => {
              const diff = c.compliance_score - myScore;
              return (
                <tr key={c.id} className={clsx("border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors", i === competitors.length - 1 && "border-b-0")}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">{c.name[0]}</div>
                      <div>
                        <p className="text-white font-medium">{c.name}</p>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 text-xs hover:text-indigo-400 flex items-center gap-1">
                          {c.url.replace("https://", "")} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 w-48"><ScoreBadge score={c.compliance_score} /></td>
                  <td className="px-5 py-3">
                    {diff > 0 ? (
                      <span className="flex items-center gap-1 text-rose-400 text-xs"><TrendingUp className="w-3 h-3" /> +{diff}%</span>
                    ) : diff < 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs"><TrendingDown className="w-3 h-3" /> {diff}%</span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 text-xs"><Minus className="w-3 h-3" /> Tied</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{c.datasets_disclosed}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.last_checked}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
