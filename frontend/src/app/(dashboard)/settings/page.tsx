import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import SettingsClient from './settings-client';

type SettingsTab = 'profile' | 'schedule' | 'notifications' | 'competitors' | 'billing';
const VALID_TABS: SettingsTab[] = ['profile', 'schedule', 'notifications', 'competitors', 'billing'];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : undefined;
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  
  // Fetch settings and competitors (including inactive/paused ones) concurrently
  const [data, competitorsData] = await Promise.all([
    api.getSettings(),
    api.getCompetitors(true)
  ]);

  let checkoutUrl = '';
  let portalUrl = '';
  
  try {
    const res = await api.getPortalUrl();
    portalUrl = res.url;
  } catch (e) {
    unstable_rethrow(e); // never swallow NEXT_REDIRECT (e.g. the 401 → login redirect)
    try {
      const planType = data.business_type === 'local' ? 'local' : 'saas';
      const res = await api.getCheckoutUrl(planType);
      checkoutUrl = res.url;
    } catch (checkoutErr) {
      unstable_rethrow(checkoutErr);
      console.error('Failed to fetch checkout url:', checkoutErr);
    }
  }

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your account preferences" />
      <SettingsClient
        initialSettings={data}
        initialCompetitors={competitorsData.competitors}
        userId={session.user!.user_id}
        checkoutUrl={checkoutUrl}
        portalUrl={portalUrl}
        initialTab={initialTab}
      />
    </div>
  );
}
