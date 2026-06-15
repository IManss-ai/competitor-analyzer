'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isAbortError } from '@/lib/fetch-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CATEGORIES = ['productivity', 'devtools', 'marketing', 'finance', 'ecommerce',
                    'analytics', 'ai', 'design', 'hr', 'support', 'education', 'health', 'other'];

interface Result {
  slug: string; name: string; tagline: string | null; category: string | null;
  logo_url: string | null; price_from: number | null; tech: string[]; tags: string[];
}

export default function DiscoverClient() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (p = 1, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (maxPrice) params.set('max_price', maxPrice);
      const res = await fetch(`${API_BASE}/api/v1/apps/search?${params}`, { signal });
      if (res.ok) {
        const body = await res.json();
        setResults(body.results);
        setTotal(body.total);
        setPage(p);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [q, category, maxPrice]);

  useEffect(() => {
    const controller = new AbortController();
    runSearch(1, controller.signal);
    return () => controller.abort();
  }, [category, maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Shell (sidebar, Topbar, page padding) comes from the (dashboard) layout
    <div>
      <div className="max-w-4xl space-y-6">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runSearch(1); }}>
          <input
            className="rs-input flex-1" placeholder="Search apps…"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="rs-btn-primary text-[13px]" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select className="rs-input text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rs-input text-sm" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any price</option>
            <option value="10">Under $10/mo</option>
            <option value="25">Under $25/mo</option>
            <option value="50">Under $50/mo</option>
            <option value="100">Under $100/mo</option>
          </select>
        </div>

        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {total} app{total === 1 ? '' : 's'}
        </p>

        <div className="space-y-2">
          {results.map((r) => (
            <Link key={r.slug} href={`/apps/${r.slug}`} className="rs-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                {r.tagline && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{r.tagline}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {r.category && <span className="badge">{r.category}</span>}
                <span>{r.price_from !== null ? `from $${r.price_from}/mo` : '—'}</span>
              </div>
            </Link>
          ))}
          {!loading && results.length === 0 && (
            <div className="rs-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No apps match. Try a broader search.
            </div>
          )}
        </div>

        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button className="rs-btn-ghost text-[13px]" disabled={page <= 1} onClick={() => runSearch(page - 1)}>← Prev</button>
            <button className="rs-btn-ghost text-[13px]" disabled={page * 20 >= total} onClick={() => runSearch(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
