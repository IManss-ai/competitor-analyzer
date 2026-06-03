"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import ComplianceChart from "@/components/ComplianceChart";
import { Database, ShieldCheck, FileCheck, AlertTriangle, Plus, FilePlus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .stats("my-company") // TODO: get from user profile
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const compliancePct = stats
    ? Math.round(stats.compliance_score * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Datasets"
          value={loading ? "—" : stats?.total_datasets ?? 0}
          icon={Database}
          subtitle="Tracked training datasets"
          variant="default"
        />
        <StatsCard
          title="Compliance Score"
          value={loading ? "—" : `${compliancePct}%`}
          icon={ShieldCheck}
          trend={{ value: 8, label: "vs last month" }}
          variant={compliancePct >= 80 ? "success" : compliancePct >= 50 ? "warning" : "danger"}
        />
        <StatsCard
          title="Disclosures Published"
          value={loading ? "—" : stats?.published_disclosures ?? 0}
          icon={FileCheck}
          subtitle={`of ${stats?.total_disclosures ?? 0} generated`}
          variant="success"
        />
        <StatsCard
          title="Missing Fields"
          value={loading ? "—" : stats?.non_compliant_datasets ?? 0}
          icon={AlertTriangle}
          subtitle="Datasets needing attention"
          variant={stats?.non_compliant_datasets ? "warning" : "success"}
        />
      </div>

      {/* Chart + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ComplianceChart />
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href="/queue"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Dataset
            </Link>
            <Link
              href="/queue"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium"
            >
              <FilePlus className="w-4 h-4" />
              Generate Disclosure
            </Link>
          </div>

          <div className="mt-6">
            <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-3">Recent Activity</h4>
            <div className="space-y-3">
              {[
                { action: "Dataset added", detail: "pile-v2", time: "2h ago" },
                { action: "Disclosure published", detail: "v1.2.0", time: "1d ago" },
                { action: "Fields updated", detail: "cc-100", time: "3d ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-300">{item.action}</p>
                    <p className="text-slate-600 text-xs">{item.detail}</p>
                  </div>
                  <span className="text-slate-600 text-xs">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
