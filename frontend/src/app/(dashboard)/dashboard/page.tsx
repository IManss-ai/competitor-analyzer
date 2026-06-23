import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { isReadOnly } from '@/lib/access';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import ScanNowButton from '@/components/scan-now-button';
import DashboardAnimator, { DashboardSection } from './dashboard-animator';
import DashboardClient from './dashboard-client';
import LocalBusinessSection from '@/components/local-business-section';
import ReviewIntelligence from '@/components/review-intelligence';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  
  const [dashboardData, compData, settings] = await Promise.all([
    api.getDashboard(),
    api.getCompetitors(),
    api.getSettings().catch(() => ({ business_type: 'saas' as const, id: '', email: '', subscription_status: '', trial_ends_at: null }))
  ]);
  
  const isLocalBusiness = settings.business_type === 'local';
  const readOnly = isReadOnly(settings.subscription_status, settings.trial_ends_at);

  const reviewsPromises = compData.competitors.map(c => 
    api.getCompetitorReviews(c.id).catch(() => ({ snapshots: [], recent_complaints: [] }))
  );
  
  const reviewsData = await Promise.all(reviewsPromises);

  return (
    <DashboardAnimator>
      <Topbar
        title="Dashboard"
        subtitle="Your B2B SaaS Intel Headquarters"
        lastScan={dashboardData.last_scan}
        actions={<ScanNowButton userId={session.user!.user_id} readOnly={readOnly} />}
      />

      <DashboardClient
        userId={session.user!.user_id}
        initialData={dashboardData}
        competitors={compData.competitors}
        isLocalBusiness={isLocalBusiness}
        readOnly={readOnly}
      />

      <DashboardSection className="mt-6">
        <ReviewIntelligence
          competitors={compData.competitors}
          reviewsData={reviewsData}
        />
      </DashboardSection>

      {isLocalBusiness && (
        <DashboardSection className="mt-6">
          <LocalBusinessSection
            competitors={compData.competitors}
            isLocalBusiness={isLocalBusiness}
            userId={session.user!.user_id}
          />
        </DashboardSection>
      )}
    </DashboardAnimator>
  );
}
