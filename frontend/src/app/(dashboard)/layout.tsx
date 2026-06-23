import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { isReadOnly } from '@/lib/access';
import Sidebar from '@/components/sidebar';
import MainContent from '@/components/main-content';
import ReadOnlyBanner from '@/components/read-only-banner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);

  if (!session.user) {
    redirect('/auth/login');
  }

  let pendingCount = 0;
  let readOnly = false;
  let plan: 'saas' | 'local' = 'saas';
  try {
    const api = createApiClient(session.user.user_id);
    const [dashboard, settings] = await Promise.all([
      api.getDashboard(),
      api.getSettings(),
    ]);
    pendingCount = dashboard.pending_count;
    readOnly = isReadOnly(settings.subscription_status, settings.trial_ends_at);
    plan = settings.business_type === 'local' ? 'local' : 'saas';
  } catch {
    // Non-fatal — default to full access if we can't determine status.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.user.email} userId={session.user.user_id} pendingCount={pendingCount} />
      <MainContent>
        {readOnly && <ReadOnlyBanner plan={plan} />}
        {children}
      </MainContent>
    </div>
  );
}
