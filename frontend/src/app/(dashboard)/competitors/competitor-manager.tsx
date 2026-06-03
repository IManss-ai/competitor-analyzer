'use client';

import { useState } from 'react';
import { Globe, Trash2, Plus, ExternalLink } from 'lucide-react';
import type { Competitor } from '@/lib/types';

interface CompetitorManagerProps {
  initialCompetitors: Competitor[];
  initialAtLimit: boolean;
  userId: string;
}

export default function CompetitorManager({ initialCompetitors, initialAtLimit, userId }: CompetitorManagerProps) {
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
        setCompetitors((prev) => [...prev, { ...newComp, active: true, created_at: new Date().toISOString() }]);
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
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-950 text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Competitor
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="https://competitor.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:w-48 bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2.5 bg-zinc-950 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* Competitor list */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-zinc-100">
        {competitors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Globe className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No competitors added yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Click &quot;Add Competitor&quot; to start tracking.</p>
          </div>
        ) : (
          competitors.map((comp) => (
            <div key={comp.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {comp.name || new URL(comp.url).hostname}
                  </p>
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1 truncate"
                  >
                    {comp.url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
              <button
                onClick={() => handleDelete(comp.id)}
                disabled={deleting === comp.id}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove competitor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {atLimit && (
        <p className="text-xs text-zinc-400 mt-3 text-center">
          Maximum of 7 competitors reached. Remove one to add another.
        </p>
      )}
    </div>
  );
}
