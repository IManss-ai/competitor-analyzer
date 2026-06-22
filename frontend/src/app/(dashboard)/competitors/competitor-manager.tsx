'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, Plus, ExternalLink, ChevronDown, Store } from 'lucide-react';
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
  const [error, setError] = useState('');

  // Local business fields
  const [isLocalBusiness, setIsLocalBusiness] = useState(false);
  const [showLocalFields, setShowLocalFields] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [facebookPage, setFacebookPage] = useState('');

  useEffect(() => {
    const bt = localStorage.getItem('business_type');
    setTimeout(() => {
      setIsLocalBusiness(bt === 'local');
    }, 0);
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      const res = await fetch(`${apiUrl}/api/v1/competitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ url: normalizedUrl, name: name || undefined }),
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
        setError('');
        if (competitors.length + 1 >= 7) setAtLimit(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to add competitor.');
      }
    } catch {
      setError('Connection error. Please try again.');
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
        <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
          Track up to 7 competitor websites. We check for pricing changes, feature launches, and messaging shifts every week.
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit}
          className="rs-btn-primary flex-shrink-0 cursor-pointer"
        >
          <Plus size={16} />
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
            <div className="rs-card p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add new competitor</h3>
              <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:flex-1 space-y-1.5">
                  <label htmlFor="url" className="rs-label block mb-1.5">
                    Website URL
                  </label>
                  <input
                    id="url"
                    type="text"
                    required
                    placeholder="https://competitor.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="rs-input"
                  />
                </div>
                <div className="w-full md:w-64 space-y-1.5">
                  <label htmlFor="name" className="rs-label block mb-1.5">
                    Display name (optional)
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Acme Corp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rs-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding}
                  className="rs-btn-primary w-full md:w-auto cursor-pointer"
                >
                  {adding ? 'Adding…' : 'Add to watchlist'}
                </button>
              </form>

              {error && (
                <p className="text-xs font-medium font-mono mt-3" style={{ color: 'var(--tone-danger)' }}>{error}</p>
              )}

              {/* Local Business Details (collapsible) */}
              {isLocalBusiness && (
                <div className="mt-5 pt-5 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setShowLocalFields(!showLocalFields)}
                    className="flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer mb-4"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Store size={16} />
                    Local Business Details
                    <ChevronDown
                      size={14}
                      className="transition-transform text-[var(--text-muted)]"
                      style={{ transform: showLocalFields ? 'rotate(180deg)' : 'none' }}
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
                            <label htmlFor="google-maps-url" className="rs-label block mb-1.5">
                              Google Maps URL
                            </label>
                            <input
                              id="google-maps-url"
                              type="url"
                              placeholder="https://maps.google.com/..."
                              value={googleMapsUrl}
                              onChange={(e) => setGoogleMapsUrl(e.target.value)}
                              className="rs-input"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="instagram-handle" className="rs-label block mb-1.5">
                              Instagram handle
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">@</span>
                              <input
                                id="instagram-handle"
                                type="text"
                                placeholder="starbucks"
                                value={instagramHandle}
                                onChange={(e) => setInstagramHandle(e.target.value)}
                                className="rs-input pl-7"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="facebook-page" className="rs-label block mb-1.5">
                              Facebook page
                            </label>
                            <input
                              id="facebook-page"
                              type="text"
                              placeholder="starbucks"
                              value={facebookPage}
                              onChange={(e) => setFacebookPage(e.target.value)}
                              className="rs-input"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Limit Indicator (Tactile Progress) */}
      <div className="rs-card mb-8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Tracking limit</span>
          <div className="w-24 h-1.5 bg-[var(--fill-subtle-hover)] rounded-full overflow-hidden">
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${filledRatio}%`, backgroundColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{competitors.length} / 7</span>
          {atLimit && (
            <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider font-mono text-[var(--tone-warning)] bg-[var(--tone-warning)]/10 px-2 py-0.5 rounded border border-[var(--tone-warning)]/20">
              Limit reached
            </span>
          )}
        </div>
      </div>

      {/* Competitor watchlist */}
      {competitors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
          className="rs-card p-6"
        >
          <div className="px-6 py-20 text-center flex flex-col items-center">
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-md bg-[var(--fill-subtle)] opacity-50"
                  style={{ animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-lg font-semibold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              No competitors yet
            </p>
            <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: 'var(--text-secondary)' }}>
              Add a competitor URL to start tracking their pricing, features, and messaging changes.
            </p>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Examples:</span>
              <button onClick={() => { setShowAdd(true); setUrl('https://stripe.com'); }} className="text-xs px-2 py-1 rounded transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--border-default)' }}>stripe.com</button>
              <button onClick={() => { setShowAdd(true); setUrl('https://linear.app'); }} className="text-xs px-2 py-1 rounded transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--border-default)' }}>linear.app</button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="rs-btn-primary cursor-pointer"
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
              <div
                key={comp.id}
                className="group relative"
              >
                <div className="rs-card p-5 relative overflow-hidden flex flex-col justify-between h-full">
                  <div>
                    {/* Top right status */}
                    <div className="absolute top-5 right-5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--tone-positive)' }}></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--tone-positive)' }}></span>
                      </span>
                      <span className="tag-green text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded-sm border">
                        monitoring
                      </span>
                    </div>

                    {/* Top row */}
                    <div className="flex items-start gap-4 mb-5 pr-16">
                      <div className="w-10 h-10 rounded bg-[var(--fill-subtle)] border border-[var(--border-default)] flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
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
                        <h3 className="text-base font-semibold leading-tight mb-1 truncate">
                          <Link
                            href={`/competitors/${comp.id}`}
                            className="transition-colors text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
                          >
                            {comp.name || hostname}
                          </Link>
                        </h3>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono transition-colors truncate max-w-full hover:text-[var(--accent-primary)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {comp.url}
                          <ExternalLink size={12} className="flex-shrink-0" />
                        </a>
                      </div>
                    </div>

                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between gap-4 mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Monitoring since</div>
                      <div className="text-sm font-medium font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {comp.created_at ? new Date(comp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
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
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--tone-danger)] hover:bg-[var(--tone-danger)]/10 rounded transition-colors duration-200 cursor-pointer disabled:opacity-40"
                        title="Remove competitor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
