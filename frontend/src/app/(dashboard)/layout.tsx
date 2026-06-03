import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import { createApiClient } from '@/lib/api';
import Sidebar from '@/components/sidebar';

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

  // Fetch pending count for sidebar badge
  let pendingCount = 0;
  try {
    const api = createApiClient(session.user.user_id);
    const dashboard = await api.getDashboard();
    pendingCount = dashboard.pending_count;
  } catch {
    // Non-fatal — sidebar just won't show badge
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.user.email} pendingCount={pendingCount} />
      <main className="flex-1 ml-60 p-8 max-w-[1120px]">
        {children}
      </main>
    </div>
  );
}
