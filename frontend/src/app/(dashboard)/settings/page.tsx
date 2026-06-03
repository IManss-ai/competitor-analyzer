import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import { User, CreditCard, Clock, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getSettings();

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trialing: 'bg-blue-50 text-blue-700 border-blue-200',
    canceled: 'bg-red-50 text-red-700 border-red-200',
    past_due: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your account" />

      <div className="space-y-6">
        {/* Account info */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-50 rounded-lg">
              <User className="w-5 h-5 text-zinc-500" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 font-heading">Account</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
              <p className="text-sm text-zinc-900">{data.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">User ID</label>
              <p className="text-sm text-zinc-900 font-mono truncate">{data.id}</p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-zinc-500" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 font-heading">Subscription</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${statusColors[data.subscription_status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                {data.subscription_status}
              </span>
            </div>
            {data.trial_ends_at && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Trial Ends</label>
                <div className="flex items-center gap-1.5 text-sm text-zinc-900">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  {new Date(data.trial_ends_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manage subscription link */}
        {data.stripe_customer_id && (
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-zinc-50 rounded-lg">
                <Shield className="w-5 h-5 text-zinc-500" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 font-heading">Billing</h2>
            </div>
            <p className="text-sm text-zinc-500 mb-4">Manage your subscription, payment methods, and invoices.</p>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/billing/portal-url`}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-950 text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
