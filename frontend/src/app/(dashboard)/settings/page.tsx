import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { createApiClient } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import Topbar from '@/components/topbar';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';

const statusConfig: Record<
  string,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  trialing: {
    label: 'Trial',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  canceled: {
    label: 'Canceled',
    dot: 'bg-red-400',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  past_due: {
    label: 'Past due',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<{ user?: SessionUser }>(cookieStore, sessionOptions);
  const api = createApiClient(session.user!.user_id);
  const data = await api.getSettings();

  const statusCfg = statusConfig[data.subscription_status] ?? {
    label: data.subscription_status,
    dot: 'bg-zinc-400',
    text: 'text-zinc-600',
    bg: 'bg-zinc-100',
    border: 'border-zinc-200',
  };

  return (
    <div>
      <Topbar title="Settings" subtitle="Account and subscription" />

      <div className="max-w-[600px] space-y-4">
        {/* Account */}
        <section className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0f0f0]">
            <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
              Account
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide mb-1">
                Email
              </p>
              <p className="text-sm text-[#0a0a0a]">{data.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide mb-1">
                User ID
              </p>
              <p className="text-sm text-[#525252] font-mono truncate">{data.id}</p>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0f0f0]">
            <h2 className="text-sm font-semibold text-[#0a0a0a] tracking-tight">
              Subscription
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide mb-1.5">
                  Status
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              </div>
              {data.trial_ends_at && (
                <div className="text-right">
                  <p className="text-[11px] font-medium text-[#a3a3a3] uppercase tracking-wide mb-1.5">
                    Trial ends
                  </p>
                  <p className="text-sm font-mono text-[#0a0a0a]">
                    {new Date(data.trial_ends_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {data.stripe_customer_id && (
              <div className="pt-2 border-t border-[#f0f0f0]">
                <p className="text-xs text-[#737373] mb-3">
                  Manage your plan, payment methods, and view invoices.
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/billing/portal-url`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all"
                >
                  Manage billing
                  <ArrowSquareOut size={13} />
                </a>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
