import { Metadata } from 'next';
import Link from 'next/link';
import { AppsNav } from '@/components/apps-nav';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

interface AppResult {
  slug: string;
  name: string;
  tagline: string | null;
  category: string | null;
  price_from: number | null;
  tech: string[];
  tags: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PAGE_SIZE = 20;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  return {
    title: 'SaaS app database — pricing, tech stacks & signals | Rivalscope',
    description:
      'Browse the Rivalscope database of SaaS apps: live pricing, tech stacks, review signals, and shipping velocity for every profile.',
    // Each results page is its own canonical URL — pointing pages 2+ at
    // '/apps' marks them as duplicates of page 1 and deindexes their apps.
    alternates: { canonical: page > 1 ? `/apps?page=${page}` : '/apps' },
  };
}

async function fetchApps(page: number): Promise<{ results: AppResult[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps/search?page=${page}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { results: [], total: 0 };
    const body = await res.json();
    return { results: body.results ?? [], total: body.total ?? 0 };
  } catch {
    return { results: [], total: 0 };
  }
}

export default async function AppsIndexPage({ searchParams }: PageProps) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const { results, total } = await fetchApps(page);

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--background)' }}>
      <AppsNav />
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>SaaS app database</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Pricing, tech stacks, and strategic signals for {total > 0 ? total.toLocaleString('en-US') : 'the'} tracked apps.
          </p>
        </header>

        {results.length === 0 ? (
          <div className="rs-card p-8 text-center space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>No apps to show yet</h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              The database is being populated. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((app) => (
              <Link key={app.slug} href={`/apps/${app.slug}`} className="rs-card block p-5 space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{app.name}</h2>
                  {app.price_from !== null && (
                    <span className="font-mono text-sm whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                      from ${app.price_from}/mo
                    </span>
                  )}
                </div>
                {app.tagline && (
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{app.tagline}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {app.category && <span className="badge">{app.category}</span>}
                  {app.tech.map((t) => <span key={t} className="badge">{t}</span>)}
                </div>
              </Link>
            ))}
          </div>
        )}

        {(page > 1 || page * PAGE_SIZE < total) && (
          <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
            {page > 1 ? (
              <Link href={page === 2 ? '/apps' : `/apps?page=${page - 1}`} className="underline" style={{ color: 'var(--primary)' }}>
                ← Previous
              </Link>
            ) : <span />}
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Page {page}</span>
            {page * PAGE_SIZE < total ? (
              <Link href={`/apps?page=${page + 1}`} className="underline" style={{ color: 'var(--primary)' }}>
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
