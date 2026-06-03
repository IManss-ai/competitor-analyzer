'use client';

import { useState } from 'react';
import {
  Globe,
  Trash,
  Plus,
  ArrowSquareOut,
  Warning,
} from '@phosphor-icons/react';
import type { Competitor } from '@/lib/types';

interface CompetitorManagerProps {
  initialCompetitors: Competitor[];
  initialAtLimit: boolean;
  userId: string;
}

export default function CompetitorManager({
  initialCompetitors,
  initialAtLimit,
  userId,
}: CompetitorManagerProps) {
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [atLimit, setAtLimit] = useState(initialAtLimit);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ url, name: name || undefined }),
      });
      if (res.ok) {
        const newComp = await res.json();
        setCompetitors((prev) => [
          ...prev,
          { ...newComp, active: true, created_at: new Date().toISOString() },
        ]);
        setUrl('');
        setName('');
        setShowAdd(false);
        if (competitors.length + 1 >= 7) setAtLimit(true);
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userId}` },
      });
      if (res.ok) {
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
        setAtLimit(false);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#a3a3a3]">
            {competitors.length} / 7
          </span>
          {atLimit && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <Warning size={11} weight="fill" />
              Limit reached
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} weight="bold" />
          Add Competitor
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 mb-4">
          <p className="text-xs font-medium text-[#737373] uppercase tracking-wide mb-3">
            New competitor
          </p>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="https://competitor.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-[#fafafa] border border-[#e5e5e5] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-[#a3a3a3]"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:w-44 bg-[#fafafa] border border-[#e5e5e5] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-[#a3a3a3]"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2.5 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* Competitor list */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
        {competitors.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
              <Globe size={18} className="text-[#a3a3a3]" />
            </div>
            <p className="text-sm font-medium text-[#525252] mb-1">
              No competitors yet
            </p>
            <p className="text-xs text-[#a3a3a3]">
              Add a competitor URL to start tracking changes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {competitors.map((comp) => {
              let hostname = comp.url;
              try {
                hostname = new URL(comp.url).hostname;
              } catch {
                // keep raw url
              }

              return (
                <div
                  key={comp.id}
                  className="px-5 py-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                      {/* favicon attempt */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                        alt=""
                        width={16}
                        height={16}
                        className="rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0a0a0a] truncate">
                        {comp.name || hostname}
                      </p>
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#a3a3a3] hover:text-blue-600 font-mono transition-colors truncate max-w-[260px]"
                      >
                        {comp.url}
                        <ArrowSquareOut size={10} className="flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    disabled={deleting === comp.id}
                    className="p-2 text-[#d4d4d4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    title="Remove"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
