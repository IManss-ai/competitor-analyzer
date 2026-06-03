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
  const api = createApiClient(session.user!.user_id);
  const data = await api.getQueue();

  return (
    <div>
      <Topbar title="Action Queue" subtitle={`${data.actions.length} actions pending review`} />
      <QueueManager initialActions={data.actions} userId={session.user!.user_id} />
    </div>
  );
}
