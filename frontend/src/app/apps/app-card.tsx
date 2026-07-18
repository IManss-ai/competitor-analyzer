import Link from 'next/link';

// Shared card shape for the /apps index — matches /api/v1/apps/search rows.
export interface AppResult {
  slug: string;
  name: string;
  tagline: string | null;
  category: string | null;
  price_from: number | null;
  tech: string[];
  tags: string[];
}

// Presentational card used by the SSR list (and any future client-rendered
// results) so both render pixel-identically. Server-safe: no hooks, no state.
export function AppCard({ app }: { app: AppResult }) {
  return (
    <Link href={`/apps/${app.slug}`} className="rs-card block p-4 space-y-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold min-w-0 break-words" style={{ color: 'var(--foreground)' }}>
          {app.name}
        </h2>
        {app.price_from !== null && (
          <span className="font-mono text-sm whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
            from ${app.price_from}/mo
          </span>
        )}
      </div>
      {app.tagline && (
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{app.tagline}</p>
      )}
      {/* Gate the chip row so hollow rows (no category, no tech) don't render dead spacing. */}
      {(app.category || app.tech.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
          {app.category && <span className="badge">{app.category}</span>}
          {app.tech.map((t) => <span key={t} className="badge">{t}</span>)}
        </div>
      )}
    </Link>
  );
}
