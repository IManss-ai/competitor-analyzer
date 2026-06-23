import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { isReadOnly } from '@/lib/access';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import BattlecardsClient from './battlecards-client';

export default async function BattleCardsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);

  const [data, settings] = await Promise.all([
    api.getCompetitors(),
    api.getSettings().catch(() => null),
  ]);
  const readOnly = settings ? isReadOnly(settings.subscription_status, settings.trial_ends_at) : false;

  return (
    <div>
      <Topbar
        title="Battle Cards"
        subtitle="On-demand AI battle card for every tracked competitor"
      />
      <BattlecardsClient
        competitors={data.competitors}
        userId={session.user!.user_id}
        readOnly={readOnly}
      />
    </div>
  );
}
