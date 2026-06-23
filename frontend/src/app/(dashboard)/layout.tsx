import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import { ApiTokenProvider } from '@/lib/use-api-token';
import Sidebar from '@/components/sidebar';
import MainContent from '@/components/main-content';

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

  // Sessions created before the auth-hardening upgrade have no signed api_token.
  // Force one re-login to mint one rather than send the now-rejected raw user_id.
  if (!session.user.api_token) {
    redirect('/auth/login?reauth=1');
  }

  let pendingCount = 0;
  try {
    const api = createApiClient(session.user.user_id, session.user.api_token);
    const dashboard = await api.getDashboard();
    pendingCount = dashboard.pending_count;
  } catch {
    // Non-fatal
  }

  return (
    <ApiTokenProvider token={session.user.api_token}>
      <div className="flex min-h-screen">
        <Sidebar email={session.user.email} userId={session.user.user_id} pendingCount={pendingCount} />
        <MainContent>{children}</MainContent>
      </div>
    </ApiTokenProvider>
  );
}
