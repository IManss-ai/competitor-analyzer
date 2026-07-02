import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import Sidebar from '@/components/sidebar';
import MainContent from '@/components/main-content';
import PaywallOverlay from '@/components/paywall-overlay';

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
  let accessLevel = 'full';
  try {
    const api = createApiClient(session.user.user_id);
    const [dashboard, settings] = await Promise.all([api.getDashboard(), api.getSettings()]);
    pendingCount = dashboard.pending_count;
    accessLevel = settings.access_level ?? 'full';
  } catch (e) {
    unstable_rethrow(e); // never swallow NEXT_REDIRECT (e.g. the 401 → login redirect)
    // Non-fatal: default to full so a settings hiccup never locks a user out.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.user.email} userId={session.user.user_id} pendingCount={pendingCount} />
      <MainContent>{children}</MainContent>
      {accessLevel === 'read_only' && <PaywallOverlay userId={session.user.user_id} />}
    </div>
  );
}
