import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

interface ReadOnlyBannerProps {
  // 'saas' | 'local' — routes the upgrade to the right Polar plan.
  plan?: 'saas' | 'local';
}

// Shown across every authed page when the user is read-only (trial ended,
// no active subscription). Uses the canonical danger container from DESIGN.md
// (tone-danger text + color-mixed tint), so it stays theme-aware on paper + ink.
// The Upgrade action reuses the existing /billing/checkout route, which mints
// the Polar checkout URL and redirects (with a graceful fallback screen).
export default function ReadOnlyBanner({ plan = 'saas' }: ReadOnlyBannerProps) {
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: 'color-mix(in srgb, var(--tone-danger) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--tone-danger) 28%, transparent)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center"
          style={{
            color: 'var(--tone-danger)',
            background: 'color-mix(in srgb, var(--tone-danger) 14%, transparent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Lock size={14} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[13px] font-semibold leading-tight"
            style={{ color: 'var(--tone-danger)' }}
          >
            Your trial has ended
          </p>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            Scans are paused and actions are read-only. Upgrade to resume scans and actions.
          </p>
        </div>
      </div>

      <Link
        href={`/billing/checkout?plan=${plan}`}
        className="rs-btn-primary flex-shrink-0 self-start sm:self-auto"
      >
        Upgrade
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
