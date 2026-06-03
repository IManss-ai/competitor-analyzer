"use client";

import { useState } from "react";
import { CreditCard, Zap, CheckCircle2, Download, ExternalLink } from "lucide-react";
import clsx from "clsx";

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
}

const INVOICES: Invoice[] = [
  { id: "inv_001", date: "Jun 1, 2026",  amount: 99,  status: "paid"    },
  { id: "inv_002", date: "May 1, 2026",  amount: 99,  status: "paid"    },
  { id: "inv_003", date: "Apr 1, 2026",  amount: 99,  status: "paid"    },
  { id: "inv_004", date: "Mar 1, 2026",  amount: 299, status: "paid"    },
];

const statusStyles = {
  paid:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  failed:  "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 99,
    features: ["Up to 10 datasets", "Automated disclosure generation", "Public disclosure page", "Email support"],
    limit: 10,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: 299,
    features: ["Unlimited datasets", "Priority disclosure generation", "Custom domain for disclosures", "Dedicated support", "Audit trail export", "Team seats (up to 10)"],
    limit: Infinity,
    popular: true,
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<"basic" | "unlimited">("basic");
  const datasetsUsed = 9;
  const plan = PLANS.find((p) => p.id === currentPlan)!;
  const usagePct = plan.limit === Infinity ? 45 : Math.round((datasetsUsed / plan.limit) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Current plan + usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-slate-400 text-sm mb-1">Current Plan</p>
          <p className="text-white text-2xl font-bold">{plan.name}</p>
          <p className="text-slate-500 text-sm">${plan.price}/month</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-indigo-400">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Next billing Jun 1, 2026</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-slate-400 text-sm mb-1">Usage</p>
          <p className="text-white text-2xl font-bold">
            {datasetsUsed}
            <span className="text-slate-500 font-normal text-base"> / {plan.limit === Infinity ? "∞" : plan.limit} datasets</span>
          </p>
          <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all", usagePct >= 90 ? "bg-rose-500" : usagePct >= 70 ? "bg-amber-500" : "bg-indigo-500")}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs mt-1.5">{usagePct}% of limit used</p>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h3 className="text-white font-semibold mb-4">Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={clsx(
                "rounded-xl border p-5 relative transition-all",
                currentPlan === p.id
                  ? "border-indigo-500/50 bg-indigo-600/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              )}
            >
              {p.popular && (
                <span className="absolute top-3 right-3 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">Popular</span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Zap className={clsx("w-4 h-4", p.popular ? "text-indigo-400" : "text-slate-500")} />
                <h4 className="text-white font-semibold">{p.name}</h4>
              </div>
              <p className="text-slate-300 text-xl font-bold mb-4">${p.price}<span className="text-slate-500 font-normal text-sm">/mo</span></p>

              <ul className="space-y-2 mb-5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan === p.id ? (
                <div className="w-full py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm text-center font-medium">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => setCurrentPlan(p.id as "basic" | "unlimited")}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
                >
                  {p.price > plan.price ? "Upgrade" : "Downgrade"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div>
        <h3 className="text-white font-semibold mb-4">Invoice History</h3>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Invoice</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv, i) => (
                <tr key={inv.id} className={clsx("border-b border-slate-800/50 hover:bg-slate-800/20", i === INVOICES.length - 1 && "border-b-0")}>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{inv.id}</td>
                  <td className="px-5 py-3 text-slate-400">{inv.date}</td>
                  <td className="px-5 py-3 text-white font-medium">${inv.amount}</td>
                  <td className="px-5 py-3">
                    <span className={clsx("inline-flex items-center text-xs font-medium border rounded-full px-2 py-0.5", statusStyles[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-slate-500 hover:text-indigo-400 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
