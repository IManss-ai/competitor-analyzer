'use client';

import { useState, useEffect } from 'react';
import {
  Trash,
  Plus,
  ArrowSquareOut,
  CaretDown,
  Storefront,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import type { Competitor } from '@/lib/types';
import BattleCard from '@/components/battle-card';

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

  // Local business fields
  const [isLocalBusiness, setIsLocalBusiness] = useState(false);
  const [showLocalFields, setShowLocalFields] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [facebookPage, setFacebookPage] = useState('');

  useEffect(() => {
    const bt = localStorage.getItem('business_type');
    setIsLocalBusiness(bt === 'local');
  }, []);

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

        // If local business fields are filled, PATCH them
        if (isLocalBusiness && (googleMapsUrl || instagramHandle || facebookPage)) {
          try {
            await fetch(`${apiUrl}/api/v1/local/competitors/${newComp.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userId}`,
              },
              body: JSON.stringify({
                ...(googleMapsUrl && { google_maps_url: googleMapsUrl }),
                ...(instagramHandle && { instagram_handle: instagramHandle }),
                ...(facebookPage && { facebook_page: facebookPage }),
              }),
            });
          } catch {
            // Non-fatal
          }
        }

        setCompetitors((prev) => [
          ...prev,
          { ...newComp, active: true, created_at: new Date().toISOString() },
        ]);
        setUrl('');
        setName('');
        setGoogleMapsUrl('');
        setInstagramHandle('');
        setFacebookPage('');
        setShowLocalFields(false);
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
        <motion.button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit}
          whileHover={{ scale: 1.03, y: -1, boxShadow: '0 8px 25px rgba(0,0,0,0.05)' }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
        >
          <Plus size={16} weight="bold" />
          Add Competitor
        </motion.button>
      </div>

      {/* Add Form Panel (Double-Bezel Design) */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl shadow-sm">
              <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] p-6">
                <h3 className="text-sm font-semibold text-[#0a0a0a] mb-4">Add new competitor</h3>
                <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:flex-1 space-y-1.5">
                    <label htmlFor="url" className="block text-[10px] font-mono text-[#737373] uppercase tracking-wider">
                      Website URL
                    </label>
                    <input
                      id="url"
                      type="url"
                      required
                      placeholder="https://competitor.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200/60 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#a3a3a3]"
                    />
                  </div>
                  <div className="w-full md:w-64 space-y-1.5">
                    <label htmlFor="name" className="block text-[10px] font-mono text-[#737373] uppercase tracking-wider">
                      Display name (optional)
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Acme Corp"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#fafafa] border border-zinc-200/60 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#a3a3a3]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adding}
                    className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {adding ? 'Adding...' : 'Add to watchlist'}
                  </button>
                </form>

                {/* Local Business Details (collapsible) */}
                {isLocalBusiness && (
                  <div className="mt-5 pt-5 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowLocalFields(!showLocalFields)}
                      className="flex items-center gap-2 text-sm font-medium text-[#0a0a0a] hover:text-blue-600 transition-colors cursor-pointer mb-4"
                    >
                      <Storefront size={16} weight="duotone" />
                      Local Business Details
                      <CaretDown
                        size={14}
                        className={`text-[#a3a3a3] transition-transform ${showLocalFields ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showLocalFields && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label htmlFor="google-maps-url" className="block text-[10px] font-mono text-[#737373] uppercase tracking-wider">
                                Google Maps URL
                              </label>
                              <input
                                id="google-maps-url"
                                type="url"
                                placeholder="https://maps.google.com/..."
                                value={googleMapsUrl}
                                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                                className="w-full bg-[#fafafa] border border-zinc-200/60 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#a3a3a3]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="instagram-handle" className="block text-[10px] font-mono text-[#737373] uppercase tracking-wider">
                                Instagram handle
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a3a3a3]">@</span>
                                <input
                                  id="instagram-handle"
                                  type="text"
                                  placeholder="starbucks"
                                  value={instagramHandle}
                                  onChange={(e) => setInstagramHandle(e.target.value)}
                                  className="w-full bg-[#fafafa] border border-zinc-200/60 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#a3a3a3]"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="facebook-page" className="block text-[10px] font-mono text-[#737373] uppercase tracking-wider">
                                Facebook page
                              </label>
                              <input
                                id="facebook-page"
                                type="text"
                                placeholder="starbucks"
                                value={facebookPage}
                                onChange={(e) => setFacebookPage(e.target.value)}
                                className="w-full bg-[#fafafa] border border-zinc-200/60 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-[#a3a3a3]"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit Indicator (Tactile Progress) */}
      <div className="mb-8 p-1 bg-zinc-50 border border-zinc-200/40 rounded-xl">
        <div className="bg-white border border-zinc-100 rounded-[calc(0.75rem-0.125rem)] px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#0a0a0a]">Tracking limit</span>
            <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${filledRatio}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#737373]">{competitors.length} / 7</span>
            {atLimit && (
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                Limit reached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Competitor Cards */}
      {competitors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl shadow-sm"
        >
          <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] px-6 py-20 text-center flex flex-col items-center">
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
            <p className="text-sm text-[#525252] max-w-sm mx-auto mb-4">
              Add a competitor URL to start tracking their pricing, features, and messaging changes.
            </p>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs text-[#a3a3a3]">Examples:</span>
              <button onClick={() => { setShowAdd(true); setUrl('https://stripe.com'); }} className="text-xs text-[#737373] hover:text-[#0a0a0a] bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors cursor-pointer">stripe.com</button>
              <button onClick={() => { setShowAdd(true); setUrl('https://linear.app'); }} className="text-xs text-[#737373] hover:text-[#0a0a0a] bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors cursor-pointer">linear.app</button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-all cursor-pointer"
            >
              Add your first competitor
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl transition-all group relative"
              >
                <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] p-5 relative overflow-hidden shadow-sm h-full flex flex-col justify-between">
                  <div>
                    {/* Top right status */}
                    <div className="absolute top-5 right-5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        monitoring
                      </span>
                    </div>

                    {/* Top row */}
                    <div className="flex items-start gap-4 mb-5 pr-16">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
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
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[#0a0a0a] leading-tight mb-1 truncate">
                          {comp.name || hostname}
                        </h3>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-blue-600 font-mono transition-colors truncate max-w-full"
                        >
                          {comp.url}
                          <ArrowSquareOut size={12} className="flex-shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Middle row: Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5 py-3.5 border-y border-zinc-100">
                      <div>
                        <div className="text-[9px] text-[#a3a3a3] uppercase tracking-wider font-mono mb-1">Changes</div>
                        <div className="text-sm font-semibold text-[#0a0a0a] font-mono">—</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#a3a3a3] uppercase tracking-wider font-mono mb-1">Last change</div>
                        <div className="text-sm font-medium text-[#525252] font-mono">—</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#a3a3a3] uppercase tracking-wider font-mono mb-1">Created</div>
                        <div className="text-sm font-medium text-[#525252] font-mono">
                          {comp.created_at ? new Date(comp.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'Now'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between gap-4 mt-2">
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#a3a3a3] uppercase tracking-wider font-mono mb-2">Activity timeline</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`flex items-center gap-1.5 ${i === 2 ? 'opacity-50' : ''} ${i === 3 ? 'opacity-20' : ''}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#d4d4d4]" />
                            <span className="text-[10px] text-[#a3a3a3] font-mono whitespace-nowrap">Scan {i}</span>
                            {i !== 3 && <div className="w-3 h-px bg-zinc-100" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <BattleCard
                        competitorId={comp.id}
                        competitorName={comp.name || hostname}
                        userId={userId}
                      />
                      <button
                        onClick={() => handleDelete(comp.id)}
                        disabled={deleting === comp.id}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40"
                        title="Remove competitor"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
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
