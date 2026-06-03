import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import CompetitorManager from './competitor-manager';

export default async function CompetitorsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getCompetitors();

  return (
    <div>
      <Topbar title="Competitors" subtitle="Track up to 7 competitor websites" />
      <CompetitorManager
        initialCompetitors={data.competitors}
        initialAtLimit={data.at_limit}
        userId={session.user!.user_id}
      />
    </div>
  );
}
