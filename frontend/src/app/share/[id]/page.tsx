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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl border border-[#e5e5e5] shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
            !
          </div>
          <h1 className="text-lg font-semibold text-[#171717]">Battle Card Not Found</h1>
          <p className="text-sm text-[#737373] leading-relaxed">
            The competitor battle card you are looking for does not exist, has been deleted, or is currently inactive.
          </p>
          <a
            href="/auth/login"
            className="inline-block bg-[#2563eb] text-white hover:bg-[#1d4ed8] px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Go to Rivalscope
          </a>
        </div>
      </div>
    );
  }

  return <SharePage card={card} />;
}
