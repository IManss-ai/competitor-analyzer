'use client';

import { useState } from 'react';
import {
  Globe,
  Trash,
  Plus,
  ArrowSquareOut,
  Warning,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import type { Competitor } from '@/lib/types';
import ChangeBadge from '@/components/change-badge';

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

  const filledRatio = (competitors.length / 7) * 100;

  return (
    <div className="pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <p className="text-sm text-[#525252] leading-relaxed max-w-xl">
          Track up to 7 competitor websites. We check for pricing changes, feature launches, and messaging shifts every week.
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Plus size={16} weight="bold" />
          Add Competitor
        </button>
      </div>

      {/* Add Form Panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#0a0a0a] mb-4">Add new competitor</h3>
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:flex-1 space-y-1.5">
              <label htmlFor="url" className="block text-[11px] font-medium text-[#737373] uppercase tracking-wide">
                Website URL
              </label>
              <input
                id="url"
                type="url"
                required
                placeholder="https://competitor.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#e5e5e5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-[#a3a3a3]"
              />
            </div>
            <div className="w-full md:w-64 space-y-1.5">
              <label htmlFor="name" className="block text-[11px] font-medium text-[#737373] uppercase tracking-wide">
                Display name (optional)
              </label>
              <input
                id="name"
                type="text"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#fafafa] border border-[#e5e5e5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-[#a3a3a3]"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add to watchlist'}
            </button>
          </form>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Limit Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#0a0a0a]">Tracking limit</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#737373]">{competitors.length} / 7</span>
            {atLimit && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Limit reached
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-1 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500" 
            style={{ width: `${filledRatio}%` }}
          />
        </div>
      </div>

      {/* Competitor Cards */}
      {competitors.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="bg-white border border-[#e5e5e5] rounded-xl px-6 py-20 text-center flex flex-col items-center"
        >
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[...Array(9)].map((_, i) => (
              <div 
                key={i} 
                className="w-6 h-6 rounded-md bg-[#f0f0f0] opacity-50"
                style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-lg font-semibold text-[#0a0a0a] mb-2 tracking-tight">
            No competitors yet
          </p>
          <p className="text-sm text-[#525252] max-w-sm mx-auto mb-6">
            Add a competitor URL to start tracking their pricing, features, and messaging changes.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all"
          >
            Add your first competitor
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((comp, index) => {
            let hostname = comp.url;
            try {
              hostname = new URL(comp.url).hostname;
            } catch {
              // keep raw url
            }

            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
                whileTap={{ scale: 0.99 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-[#e5e5e5] rounded-xl p-5 transition-all group relative"
              >
                {/* Top right status */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Monitoring
                  </span>
                </div>

                {/* Top row */}
                <div className="flex items-start justify-between mb-5 pr-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#f0f0f0] flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0a0a0a] leading-tight mb-0.5">
                        {comp.name || hostname}
                      </h3>
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-blue-600 font-mono transition-colors"
                      >
                        {comp.url}
                        <ArrowSquareOut size={12} className="flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(comp.id)}
                    disabled={deleting === comp.id}
                    className="absolute bottom-5 right-5 p-2 text-[#a3a3a3] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    title="Remove competitor"
                  >
                    <Trash size={16} />
                  </button>
                </div>

                {/* Middle row: Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5 py-3 border-y border-[#f5f5f5]">
                  <div>
                    <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide font-semibold mb-1">Changes</div>
                    <div className="text-sm font-semibold text-[#0a0a0a]">—</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide font-semibold mb-1">Last change</div>
                    <div className="text-sm font-medium text-[#525252]">—</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide font-semibold mb-1">Monitoring</div>
                    <div className="text-sm font-medium text-[#525252]">
                      {comp.created_at ? new Date(comp.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Now'}
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="pr-12">
                  <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide font-semibold mb-2">Recent activity</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex items-center gap-2 ${i === 2 ? 'opacity-50' : ''} ${i === 3 ? 'opacity-20' : ''}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4d4d4]" />
                        <span className="text-[11px] text-[#a3a3a3] font-mono">Scan {i}</span>
                        {i !== 3 && <div className="w-4 h-px bg-[#f0f0f0]" />}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
