import { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fetchApp = cache(async function fetchApp(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const app = await fetchApp(slug);
  if (!app) return { title: 'App Not Found — Rivalscope' };
  const title = `${app.name} — pricing, tech stack & signals | Rivalscope`;
  const description = app.tagline || app.description || `Intelligence profile for ${app.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'Rivalscope', images: ['/og-image.png'] },
  };
}

function PricingTable({ pricing }: { pricing: { tier_name: string; price: number | null; period: string }[] }) {
  if (!pricing.length) return null;
  return (
    <section className="rs-card p-6">
      <h2 className="rs-label mb-4">Pricing</h2>
      <div className="space-y-2">
        {pricing.map((p) => (
          <div key={p.tier_name} className="flex items-baseline justify-between border-b pb-2"
               style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--foreground)' }}>{p.tier_name}</span>
            <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {p.price === null ? 'Custom' : `$${p.price}/${p.period === 'yearly' ? 'yr' : 'mo'}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AppProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const app = await fetchApp(slug);

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="rs-card p-8 max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>App not found</h1>
          <Link href="/discover" className="rs-btn-primary text-[13px]">Browse the database</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="rs-card p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>{app.name}</h1>
              {app.tagline && <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{app.tagline}</p>}
            </div>
            <Link href={`/auth/login?track=${app.slug}`} className="rs-btn-primary text-[13px] whitespace-nowrap">
              Track this app
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            {app.category && <span className="badge">{app.category}</span>}
            {app.tags.map((t: string) => <span key={t} className="badge">{t}</span>)}
          </div>
          {app.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{app.description}</p>
          )}
          <a href={`https://${app.url}`} target="_blank" rel="noopener noreferrer"
             className="text-xs font-mono underline" style={{ color: 'var(--primary)' }}>
            {app.url} ↗
          </a>
        </header>

        <PricingTable pricing={app.pricing} />

        {app.tech.length > 0 && (
          <section className="rs-card p-6">
            <h2 className="rs-label mb-4">Tech stack</h2>
            <div className="flex flex-wrap gap-2">
              {app.tech.map((t: { technology: string }) => (
                <span key={t.technology} className="badge">{t.technology}</span>
              ))}
            </div>
          </section>
        )}

        <section className="rs-card p-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="rs-label mb-2">Reviews</h2>
            <p className="font-mono text-xl" style={{ color: 'var(--foreground)' }}>
              {app.review_summary ? `${app.review_summary.avg_rating}/5` : '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {app.review_summary ? `${app.review_summary.total_reviews} reviews (${app.review_summary.platform})` : 'No review data yet'}
            </p>
          </div>
          <div>
            <h2 className="rs-label mb-2">Shipping velocity</h2>
            <p className="font-mono text-xl" style={{ color: 'var(--foreground)' }}>{app.change_velocity_90d}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>page changes in the last 90 days</p>
          </div>
        </section>

        <footer className="text-center text-xs space-y-2" style={{ color: 'var(--muted-foreground)' }}>
          <p>
            Is this your app?{' '}
            <a href="mailto:claim@rivalscope.app?subject=Claim my app" className="underline">
              Claim this profile
            </a>
          </p>
          <p>Powered by <Link href="/" className="underline">Rivalscope</Link></p>
        </footer>
      </div>
    </div>
  );
}
