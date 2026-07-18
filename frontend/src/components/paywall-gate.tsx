'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, X } from 'lucide-react';
import PaywallOverlay from '@/components/paywall-overlay';

const DISMISS_KEY = 'rs-upsell-dismissed';

// Routes a locked (read_only) user may still read: their dashboard (the data
// they already earned), cached battle cards, and settings (billing/account
// management must stay reachable). Everything else hard-locks to checkout.
// The backend still 402s every write and every fresh generation regardless of
// what this client gate shows.
const READABLE_PREFIXES = ['/dashboard', '/battlecards', '/settings'];

export default function PaywallGate({ userId }: { userId: string }) {
  const pathname = usePathname();
  // Read sessionStorage in an effect, never during render: this component is
  // SSR'd from the dashboard layout and a render-time read would reintroduce
  // the React #418 hydration mismatch (see useMounted gate pattern, 75a7755).
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
  }, []);

  const readable = READABLE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // The hard lock on non-readable routes is NEVER dismissible — only the slim
  // upsell banner below is.
  if (!readable) return <PaywallOverlay userId={userId} />;

  // Settings needs no reminder — the billing tab IS the upgrade surface.
  if (pathname.startsWith('/settings')) return null;

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-(--shadow-elevated)">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Lock size={14} />
        </span>
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
          Free test used. Your report is saved. Upgrade to keep tracking rivals.
        </p>
        <Link
          href="/settings?tab=billing"
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold [background-image:var(--gradient-primary)] text-primary-foreground shadow-[0_8px_22px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-[filter] hover:brightness-105"
        >
          Upgrade <ArrowRight size={11} />
        </Link>
        <button
          type="button"
          aria-label="Dismiss upgrade reminder"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className="-m-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
