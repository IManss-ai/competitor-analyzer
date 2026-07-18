import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AppsNav } from '@/components/apps-nav';
import { AppCard, type AppResult } from './app-card';
import { AppsSearchToolbar, type AppFacets } from './apps-search-client';

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; category?: string; tech?: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZE = 20;

interface Filters {
  q?: string;
  category?: string;
  tech?: string;
}

function hasAnyFilter(f: Filters): boolean {
  return !!(f.q || f.category || f.tech);
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: rawPage, q, category, tech } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const filtered = hasAnyFilter({ q: q?.trim(), category: category?.trim(), tech: tech?.trim() });
  return {
    title: 'SaaS app database: pricing, tech stacks & signals | Rivalscope',
    description:
      'Browse the Rivalscope database of SaaS apps: live pricing, tech stacks, review signals, and shipping velocity for every profile.',
    // Each results page is its own canonical URL — pointing pages 2+ at
    // '/apps' marks them as duplicates of page 1 and deindexes their apps.
    // Filtered permutations (?q/?category/?tech) are noindexed so they never
    // compete with the deliberate per-?page canonical scheme or the sitemap.
    alternates: { canonical: filtered ? '/apps' : page > 1 ? `/apps?page=${page}` : '/apps' },
    ...(filtered ? { robots: { index: false } } : {}),
  };
}

async function fetchApps(
  page: number,
  filters: Filters = {},
): Promise<{ results: AppResult[]; total: number }> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.tech) params.set('tech', filters.tech);
  // NEVER send `sort` — it 401s without a signed bearer (discovery.py).
  const filtered = hasAnyFilter(filters);
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/apps/search?${params.toString()}`,
      // ISR only for the canonical paginated pages; filtered permutations are
      // no-store so junk queries never accumulate ISR cache entries.
      filtered ? { cache: 'no-store' } : { next: { revalidate: 3600 } },
    );
    if (!res.ok) return { results: [], total: 0 };
    const body = await res.json();
    return { results: body.results ?? [], total: body.total ?? 0 };
  } catch {
    return { results: [], total: 0 };
  }
}

// Facet options for the filter toolbar. Defensive by design: the endpoint may
// not exist yet — any error/404/shape mismatch degrades to null, which hides
// the category/tech filters and keeps the toolbar search-only.
async function fetchFacets(): Promise<AppFacets | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps/facets`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const body = await res.json();
    const clean = (arr: unknown) =>
      Array.isArray(arr)
        ? arr.filter(
            (o): o is { value: string; count: number } =>
              !!o && typeof o === 'object' &&
              typeof (o as { value?: unknown }).value === 'string' &&
              typeof (o as { count?: unknown }).count === 'number',
          )
        : [];
    const categories = clean(body?.categories);
    const tech = clean(body?.tech);
    if (categories.length === 0 && tech.length === 0) return null;
    return { categories, tech };
  } catch {
    return null;
  }
}

function pageHref(page: number, filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.tech) params.set('tech', filters.tech);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/apps?${qs}` : '/apps';
}

export default async function AppsIndexPage({ searchParams }: PageProps) {
  const { page: rawPage, q, category, tech } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const filters: Filters = {
    q: q?.trim() || undefined,
    category: category?.trim() || undefined,
    tech: tech?.trim() || undefined,
  };
  const filtered = hasAnyFilter(filters);

  const [{ results, total }, facets, unfiltered] = await Promise.all([
    fetchApps(page, filters),
    fetchFacets(),
    // Grand total for "N of M apps" — the unfiltered page-1 fetch is the same
    // ISR-cached request the canonical page makes, so this is effectively free.
    filtered ? fetchApps(1) : Promise.resolve(null),
  ]);
  const grandTotal = unfiltered ? unfiltered.total : total;

  return (
    <div className="min-h-screen px-4 py-12" style={{ background: 'var(--background)' }}>
      <AppsNav />
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>SaaS app database</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Pricing, tech stacks, and strategic signals for {grandTotal > 0 ? grandTotal.toLocaleString('en-US') : 'the'} tracked apps.
          </p>
        </header>

        <Suspense fallback={null}>
          <AppsSearchToolbar facets={facets} total={total} grandTotal={grandTotal} />
        </Suspense>

        {results.length === 0 ? (
          filtered ? (
            <div className="rs-card p-8 text-center space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                No apps match {filters.q ? `"${filters.q}"` : 'these filters'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Try a different search or clear the filters to browse the full database.
              </p>
              <Link href="/apps" className="rs-btn-primary text-sm inline-flex">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="rs-card p-8 text-center space-y-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>No apps to show yet</h2>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                The database is being populated. Check back soon.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {results.map((app) => (
              <AppCard key={app.slug} app={app} />
            ))}
          </div>
        )}

        {(page > 1 || page * PAGE_SIZE < total) && (
          <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
            {page > 1 ? (
              <Link href={pageHref(page - 1, filters)} className="underline" style={{ color: 'var(--primary)' }}>
                ← Previous
              </Link>
            ) : <span />}
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Page {page}</span>
            {page * PAGE_SIZE < total ? (
              <Link href={pageHref(page + 1, filters)} className="underline" style={{ color: 'var(--primary)' }}>
                Next →
              </Link>
            ) : <span />}
          </nav>
        )}

        <footer className="text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <p>Powered by <Link href="/" className="underline">Rivalscope</Link></p>
        </footer>
      </div>
    </div>
  );
}
