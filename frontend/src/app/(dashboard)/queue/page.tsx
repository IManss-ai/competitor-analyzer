"use client";

import { useState } from "react";
import DatasetTable from "@/components/DatasetTable";
import type { Dataset, DatasetCreate } from "@/lib/types";
import { Plus, X, Upload, Link2 } from "lucide-react";

const MOCK_DATASETS: Dataset[] = [
  {
    id: 1, company_slug: "my-company", source_type: "huggingface",
    hf_dataset_id: "EleutherAI/pile", name: "The Pile",
    sources_description: "800GB diverse text dataset",
    contains_personal_data: true, license_type: "MIT", contains_ip: false,
    approximate_size: "800GB", acquisition_method: "Downloaded from HuggingFace",
    collection_period: "2020-2021", modifications_description: null,
    has_missing_fields: false,
    created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: 2, company_slug: "my-company", source_type: "huggingface",
    hf_dataset_id: "cc100", name: "CC-100",
    sources_description: null,
    contains_personal_data: null, license_type: null, contains_ip: null,
    approximate_size: "2.8TB", acquisition_method: null,
    collection_period: null, modifications_description: null,
    has_missing_fields: true,
    created_at: "2026-05-15T00:00:00Z", updated_at: "2026-05-15T00:00:00Z",
  },
];

export default function QueuePage() {
  const [datasets, setDatasets] = useState<Dataset[]>(MOCK_DATASETS);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"huggingface" | "manual">("huggingface");
  const [form, setForm] = useState<Partial<DatasetCreate>>({ source_type: "huggingface" });

  function handleDelete(id: number) {
    setDatasets((ds) => ds.filter((d) => d.id !== id));
  }

  function handleGenerate(id: number) {
    alert(`Generating disclosure for dataset ${id}…`);
  }

  function handleAdd() {
    if (!form.name) return;
    const newDs: Dataset = {
      id: Date.now(),
      company_slug: "my-company",
      source_type: mode,
      hf_dataset_id: form.hf_dataset_id ?? null,
      name: form.name,
      sources_description: form.sources_description ?? null,
      contains_personal_data: null,
      license_type: null,
      contains_ip: null,
      approximate_size: null,
      acquisition_method: null,
      collection_period: null,
      modifications_description: null,
      has_missing_fields: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDatasets((ds) => [...ds, newDs]);
    setShowModal(false);
    setForm({ source_type: "huggingface" });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Dataset Queue</h2>
          <p className="text-slate-500 text-sm">
            {datasets.filter((d) => d.has_missing_fields).length} dataset(s) need attention
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
      </div>

      <DatasetTable datasets={datasets} onDelete={handleDelete} onGenerate={handleGenerate} />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Add Dataset</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg bg-slate-800 border border-slate-700 p-0.5 mb-5">
              <button
                onClick={() => setMode("huggingface")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "huggingface" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <Link2 className="w-3 h-3" /> HuggingFace
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "manual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <Upload className="w-3 h-3" /> Manual Entry
              </button>
            </div>

            <div className="space-y-3">
              {mode === "huggingface" && (
                <div>
                  <label className="text-slate-300 text-xs mb-1 block">HuggingFace Dataset ID</label>
                  <input
                    value={form.hf_dataset_id ?? ""}
                    onChange={(e) => setForm({ ...form, hf_dataset_id: e.target.value, name: e.target.value })}
                    placeholder="e.g. EleutherAI/pile"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="text-slate-300 text-xs mb-1 block">Dataset Name</label>
                <input
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Human-readable name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-300 text-xs mb-1 block">Sources Description</label>
                <textarea
                  value={form.sources_description ?? ""}
                  onChange={(e) => setForm({ ...form, sources_description: e.target.value })}
                  rows={2}
                  placeholder="Describe the data sources…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
                Add Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
