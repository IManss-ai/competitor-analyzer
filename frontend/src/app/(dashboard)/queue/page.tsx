import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import QueueManager from './queue-manager';

export default async function QueuePage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id, session.user!.api_token);
  const data = await api.getQueue();

  return (
    <div>
      <Topbar title="Action Queue" subtitle="Review AI-generated counter actions" />

      {/* Page summary bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6 pb-4 border-b border-border">
        <div className="text-sm font-semibold text-foreground">
          {data.actions.length} {data.actions.length === 1 ? 'action' : 'actions'} pending review
        </div>
        <div className="text-xs text-muted-foreground">
          Approving an action marks it complete and removes it from the queue
        </div>
      </div>

      <QueueManager initialActions={data.actions} userId={session.user!.user_id} />
    </div>
  );
}
