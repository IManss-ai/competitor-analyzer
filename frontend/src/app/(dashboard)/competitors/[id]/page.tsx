import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { isReadOnly } from '@/lib/access';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import CompetitorDetailClient from './competitor-detail-client';
import DashboardAnimator from '../../dashboard/dashboard-animator';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompetitorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const [detail, settings] = await Promise.all([
    api.getCompetitorDetail(id),
    api.getSettings().catch(() => null),
  ]);
  const readOnly = settings ? isReadOnly(settings.subscription_status, settings.trial_ends_at) : false;

  return (
    <DashboardAnimator>
      <div className="mb-4">
        <Link 
          href="/competitors" 
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft size={14} /> Back to Competitors
        </Link>
      </div>

      <Topbar
        title={detail.competitor.name || 'Competitor Detail'}
        subtitle="Deep dive competitor analytics and timeline"
      />

      <CompetitorDetailClient
        userId={session.user!.user_id}
        initialDetail={detail}
        readOnly={readOnly}
      />
    </DashboardAnimator>
  );
}
