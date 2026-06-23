import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { isReadOnly } from '@/lib/access';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import CompetitorManager from './competitor-manager';

export default async function CompetitorsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);

  // We need to fetch competitors and their latest events for the richer cards
  const [data, settings] = await Promise.all([
    api.getCompetitors(),
    api.getSettings().catch(() => null),
  ]);
  const readOnly = settings ? isReadOnly(settings.subscription_status, settings.trial_ends_at) : false;

  return (
    <div>
      <Topbar title="Competitors" subtitle="Manage your tracked websites" />
      <CompetitorManager
        initialCompetitors={data.competitors}
        initialAtLimit={data.at_limit}
        userId={session.user!.user_id}
        readOnly={readOnly}
      />
    </div>
  );
}
