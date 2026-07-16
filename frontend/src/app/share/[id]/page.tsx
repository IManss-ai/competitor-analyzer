import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import SharePage from './share-page';
import { stripLlmMetaFromCard } from '@/lib/llm-meta';

interface PageProps {
  params: Promise<{ id: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// react cache() dedupes the generateMetadata + page fetches into one backend
// hit per request; revalidate caches it at the edge so crawler swarms on
// share links don't hammer the API.
const fetchBattlecard = cache(async function fetchBattlecard(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/battlecards/public/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const card = await res.json();
    // Filter LLM meta-filler server-side so it never reaches the serialized
    // RSC payload (this page is public and crawled).
    return card && typeof card === 'object' ? stripLlmMetaFromCard(card) : card;
  } catch (err) {
    console.error('Error fetching public battlecard:', err);
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await fetchBattlecard(id);
  if (!card) {
    const title = 'Battle Card Not Found | Rivalscope';
    const description = 'This competitor battle card could not be found or is inactive.';
    return {
      title,
      description,
      robots: { index: false },
      openGraph: { title, description, siteName: 'Rivalscope', images: ['/og-image.png'] },
    };
  }
  const changesCount = card.what_changed?.length || 0;
  const title = `${card.competitor_name} Battle Card | Rivalscope`;
  const description = `Competitive intelligence on ${card.competitor_name}: ${changesCount} changes tracked, customer complaints, and a ranked sales playbook.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', siteName: 'Rivalscope', images: ['/og-image.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { id } = await params;
  const card = await fetchBattlecard(id);

  // Renders ./not-found.tsx with a real 404 status; the previous inline
  // branch returned the same UI as a 200, so crawlers indexed junk share URLs.
  if (!card) notFound();

  return <SharePage card={card} />;
}
