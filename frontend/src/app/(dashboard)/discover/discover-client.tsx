'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { isAbortError } from '@/lib/fetch-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div>
      <div className="max-w-4xl space-y-6">
        {/* Search bar */}
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); runSearch(1); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search apps…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </form>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-2">
          <Select value={category || '__all__'} onValueChange={(v) => setCategory(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={maxPrice || '__any__'} onValueChange={(v) => setMaxPrice(v === '__any__' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Any price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Any price</SelectItem>
              <SelectItem value="10">Under $10/mo</SelectItem>
              <SelectItem value="25">Under $25/mo</SelectItem>
              <SelectItem value="50">Under $50/mo</SelectItem>
              <SelectItem value="100">Under $100/mo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Result count */}
        <p className="text-xs font-mono text-muted-foreground">
          {total} app{total === 1 ? '' : 's'}
        </p>

        {/* Results list */}
        <div className="space-y-2">
          {results.map((r) => (
            <Link key={r.slug} href={`/apps/${r.slug}`}>
              <Card className="transition-colors hover:border-border/80 hover:bg-muted/30 cursor-pointer">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">{r.name}</span>
                    {r.tagline && (
                      <p className="text-xs truncate text-muted-foreground">{r.tagline}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {r.category && (
                      <Badge variant="secondary" className="capitalize text-[11px] font-mono">
                        {r.category}
                      </Badge>
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.price_from !== null ? `from $${r.price_from}/mo` : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {!loading && results.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No apps match. Try a broader search.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => runSearch(page - 1)}
            >
              ← Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => runSearch(page + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
