import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import Sidebar from '@/components/sidebar';
import MainContent from '@/components/main-content';
import OnboardingModal from '@/components/onboarding-modal';

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
  try {
    const api = createApiClient(session.user.user_id);
    const dashboard = await api.getDashboard();
    pendingCount = dashboard.pending_count;
  } catch {
    // Non-fatal
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.user.email} pendingCount={pendingCount} />
      <MainContent>{children}</MainContent>
      <OnboardingModal />
    </div>
  );
}
