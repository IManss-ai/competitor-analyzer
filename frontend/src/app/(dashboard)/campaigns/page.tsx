import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import CampaignsClient from './campaigns-client';

export default async function CampaignsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);

  return (
    <div>
      <Topbar title="Campaigns" subtitle="Your standing fights — one war room per competitor" />
      <CampaignsClient userId={session.user!.user_id} />
    </div>
  );
}
