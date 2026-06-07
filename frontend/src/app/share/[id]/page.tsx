import { Metadata } from 'next';
import SharePage from './share-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchBattlecard(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/battlecards/public/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error('Error fetching public battlecard:', err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await fetchBattlecard(id);
  if (!card) {
    return {
      title: 'Battle Card Not Found',
      description: 'The requested competitor battle card could not be found or is inactive.',
    };
  }
  const changesCount = card.what_changed?.length || 0;
  return {
    title: `${card.competitor_name} Battle Card`,
    description: `Competitive intelligence — ${changesCount} changes tracked`,
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { id } = await params;
  const card = await fetchBattlecard(id);

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ background: 'var(--surface-base)' }}>
        <div className="rs-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-lg font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            !
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Battle Card Not Found</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The competitor battle card you are looking for does not exist, has been deleted, or is currently inactive.
          </p>
          <a href="/auth/login" className="rs-btn-primary text-[13px]">
            Go to Rivalscope
          </a>
        </div>
      </div>
    );
  }

  return <SharePage card={card} />;
}
