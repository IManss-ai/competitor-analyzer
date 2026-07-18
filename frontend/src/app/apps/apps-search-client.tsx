'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FacetOption {
  value: string;
  count: number;
}

export interface AppFacets {
  categories: FacetOption[];
  tech: FacetOption[];
}

const ALL_CATEGORIES = 'all';
const DEBOUNCE_MS = 300;

// URL-state search/filter toolbar for the /apps index. The server component
// re-renders with filtered results on every router.replace — there is no
// client fetch layer. NEVER sends `sort` (401s unauthenticated).
export function AppsSearchToolbar({
  facets,
  total,
  grandTotal,
}: {
  facets: AppFacets | null;
  total: number;
  grandTotal: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const tech = searchParams.get('tech') ?? '';
  const hasFilters = !!(q || category || tech);

  const [query, setQuery] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last q value THIS component pushed to the URL, so we can tell
  // an external change (e.g. the empty state's "Clear filters" link) from our
  // own debounced replace catching up, and only then reset the input.
  const lastAppliedQ = useRef(q);

  useEffect(() => {
    if (q !== lastAppliedQ.current) {
      lastAppliedQ.current = q;
      setQuery(q);
    }
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const apply = useCallback(
    (overrides: { q?: string; category?: string; tech?: string }) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete('page'); // facet change always resets pagination
      if (typeof overrides.q === 'string') lastAppliedQ.current = overrides.q;
      const qs = next.toString();
      router.replace(qs ? `/apps?${qs}` : '/apps', { scroll: false });
    },
    [router, searchParams],
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value.trim() }), DEBOUNCE_MS);
  };

  const clearAll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    lastAppliedQ.current = '';
    setQuery('');
    router.replace('/apps', { scroll: false });
  };

  const categories = facets?.categories ?? [];
  const techOptions = facets?.tech ?? [];

  return (
    <div className="space-y-3" role="search" aria-label="Filter apps">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search apps"
          aria-label="Search apps"
          className="w-full sm:w-64"
        />
        {categories.length > 0 && (
          <Select
            value={category || ALL_CATEGORIES}
            onValueChange={(v) => apply({ category: v === ALL_CATEGORIES ? '' : v })}
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.value} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs underline cursor-pointer"
            style={{
              color: 'var(--muted-foreground)',
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {techOptions.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by technology">
          {techOptions.map((t) => {
            const active = tech === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => apply({ tech: active ? '' : t.value })}
                aria-pressed={active}
                className="badge cursor-pointer"
                style={{
                  background: active
                    ? 'color-mix(in oklch, var(--primary) 10%, transparent)'
                    : 'transparent',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  color: active ? 'var(--primary)' : 'var(--muted-foreground)',
                  transition:
                    'background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
                }}
              >
                {t.value}
              </button>
            );
          })}
        </div>
      )}

      {hasFilters && (
        <p className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }} aria-live="polite">
          {total.toLocaleString('en-US')} of {grandTotal.toLocaleString('en-US')} apps
        </p>
      )}
    </div>
  );
}
