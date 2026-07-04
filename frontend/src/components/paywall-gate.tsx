'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import PaywallOverlay from '@/components/paywall-overlay';

// Routes a locked (read_only) user may still read: their dashboard (the data
// they already earned), cached battle cards, and settings (billing/account
// management must stay reachable). Everything else hard-locks to checkout.
// The backend still 402s every write and every fresh generation regardless of
// what this client gate shows.
const READABLE_PREFIXES = ['/dashboard', '/battlecards', '/settings'];

export default function PaywallGate({ userId }: { userId: string }) {
  const pathname = usePathname();
  const readable = READABLE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!readable) return <PaywallOverlay userId={userId} />;

  // Settings needs no reminder — the billing tab IS the upgrade surface.
  if (pathname.startsWith('/settings')) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-(--shadow-elevated)">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Lock size={14} />
        </span>
        <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
          Free test used — your report is saved. Upgrade to keep tracking rivals.
        </p>
        <Link
          href="/settings?tab=billing"
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold [background-image:var(--gradient-primary)] text-primary-foreground shadow-[0_8px_22px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-[filter] hover:brightness-105"
        >
          Upgrade <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
