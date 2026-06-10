import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SITE = 'https://competitor-analyzer-zeta.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/discover`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps-sitemap`, { next: { revalidate: 86400 } });
    if (!res.ok) return staticPages;
    const body = await res.json();
    const appPages = body.apps.map((a: { slug: string; last_scanned_at: string | null }) => ({
      url: `${SITE}/apps/${a.slug}`,
      lastModified: a.last_scanned_at ? new Date(a.last_scanned_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    return [...staticPages, ...appPages];
  } catch {
    return staticPages;
  }
}
