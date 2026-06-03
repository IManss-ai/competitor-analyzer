"use client";

import { Dataset } from "@/lib/types";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Clock, Trash2, FileText } from "lucide-react";

interface DatasetTableProps {
  datasets: Dataset[];
  onDelete?: (id: number) => void;
  onGenerate?: (id: number) => void;
}

function StatusBadge({ missing }: { missing: boolean }) {
  return missing ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
      <AlertTriangle className="w-3 h-3" /> Missing fields
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
      <CheckCircle2 className="w-3 h-3" /> Compliant
    </span>
  );
}

export default function DatasetTable({ datasets, onDelete, onGenerate }: DatasetTableProps) {
  if (datasets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">No datasets yet</p>
        <p className="text-slate-600 text-sm mt-1">Add your first dataset to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium">Source</th>
            <th className="text-left px-4 py-3 font-medium">License</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((ds, i) => (
            <tr
              key={ds.id}
              className={clsx(
                "border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors",
                i === datasets.length - 1 && "border-b-0"
              )}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-white font-medium">{ds.name}</p>
                  {ds.hf_dataset_id && (
                    <p className="text-slate-500 text-xs">{ds.hf_dataset_id}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-slate-400 capitalize">{ds.source_type}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-slate-400">{ds.license_type ?? "—"}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge missing={ds.has_missing_fields} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onGenerate?.(ds.id)}
                    title="Generate disclosure"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete?.(ds.id)}
                    title="Delete dataset"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
