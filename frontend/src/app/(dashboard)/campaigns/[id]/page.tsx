import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionUser } from '@/lib/types';
import WarRoomClient from './war-room-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WarRoomPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);

  return <WarRoomClient campaignId={id} userId={session.user!.user_id} />;
}
