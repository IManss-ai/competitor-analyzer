'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import {
  LayoutDashboard,
  Building2,
  Compass,
  FileText,
  Swords,
  Shield,
  TrendingUp,
  CheckSquare,
  Settings,
  LogOut,
  RefreshCw,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { isAbortError } from '@/lib/fetch-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';

interface SidebarProps {
  email: string;
  userId: string;
  pendingCount?: number;
}

const deskItems = [
  { href: '/dashboard',             label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/competitors',           label: 'Competitors',  Icon: Building2 },
  { href: '/campaigns',             label: 'Campaigns',    Icon: Swords },
  { href: '/discover',              label: 'Discover',     Icon: Compass },
];

const signalItems = [
  { href: '/dashboard#feed',        label: 'Intel Feed',   Icon: FileText },
  { href: '/battlecards',           label: 'Battle Cards', Icon: Shield },
  { href: '/trends',                label: 'Trends',       Icon: TrendingUp },
  { href: '/queue',                 label: 'Action Queue', Icon: CheckSquare },
  { href: '/settings',              label: 'Settings',     Icon: Settings },
];

interface SettingsData {
  trial_ends_at?: string;
  business_type?: string;
  subscription_status?: string;
}

function NavItem({
  href,
  label,
  Icon,
  isActive,
  hasBadge,
  pendingCount,
  onHashNav,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  isActive: boolean;
  hasBadge?: boolean;
  pendingCount?: number;
  onHashNav?: (e: React.MouseEvent, href: string) => void;
}) {
  return (
    <Link
      href={href}
      onClick={href.includes('#') && onHashNav ? (e) => onHashNav(e, href) : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors duration-150',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {/* Active left rail */}
      {isActive && (
        <motion.div
          layoutId="activeNavRail"
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full bg-primary"
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      )}

      <Icon
        size={15}
        className="flex-shrink-0"
        strokeWidth={isActive ? 2 : 1.75}
      />
      <span className="flex-1 truncate">{label}</span>

      {hasBadge && pendingCount && pendingCount > 0 && (
        <Badge
          variant="default"
          className="text-[9px] font-bold px-1.5 py-0 h-4 rounded-sm leading-none tabular-nums"
        >
          {pendingCount}
        </Badge>
      )}

      {!isActive && (
        <ChevronRight
          size={11}
          className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0"
        />
      )}
    </Link>
  );
}

function SidebarNav({
  pathname,
  pendingCount,
  onHashNav,
}: {
  pathname: string;
  pendingCount?: number;
  onHashNav: (e: React.MouseEvent, href: string) => void;
}) {
  return (
    <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
      <div>
        <p className="px-3 mb-1.5 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground">
          DESK
        </p>
        <div className="space-y-0.5">
          {deskItems.map(({ href, label, Icon }) => {
            const isActive =
              pathname === href ||
              (href !== '/dashboard' && !href.includes('#') && pathname.startsWith(href));
            const hasBadge = href === '/queue';
            return (
              <NavItem
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                isActive={isActive}
                hasBadge={hasBadge}
                pendingCount={pendingCount}
                onHashNav={onHashNav}
              />
            );
          })}
        </div>
      </div>

      <Separator className="mx-3 w-auto" />

      <div>
        <p className="px-3 mb-1.5 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground">
          SIGNAL
        </p>
        <div className="space-y-0.5">
          {signalItems.map(({ href, label, Icon }) => {
            const isActive =
              pathname === href ||
              (href !== '/dashboard' && !href.includes('#') && pathname.startsWith(href));
            const hasBadge = href === '/queue';
            return (
              <NavItem
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                isActive={isActive}
                hasBadge={hasBadge}
                pendingCount={pendingCount}
                onHashNav={onHashNav}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function Sidebar({ email, userId, pendingCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [trialDays, setTrialDays] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const controller = new AbortController();
    async function fetchSettings() {
      try {
        const res = await fetch(`${apiUrl}/api/v1/settings`, {
          headers: {
            Authorization: `Bearer ${userId}`,
          },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(e);
      }
    }
    fetchSettings();
    return () => controller.abort();
  }, [userId, apiUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      if (settings?.trial_ends_at) {
        const diff = new Date(settings.trial_ends_at).getTime() - Date.now();
        setTrialDays(Math.max(0, Math.ceil(diff / (1000 * 3600 * 24))));
      } else {
        setTrialDays(0);
      }
    });
  }, [settings?.trial_ends_at]);

  // In-page anchor links (e.g. Intel Feed -> /dashboard#feed) don't scroll via
  // Next's <Link> when the pathname already matches and only the hash changes
  // (App Router treats it as a no-op). Scroll the target into view ourselves so
  // the button works every time, including repeat clicks.
  const handleHashNav = (e: React.MouseEvent, href: string) => {
    const [path, hash] = href.split('#');
    if (!hash) return;
    e.preventDefault();
    const scrollToHash = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (pathname === path) {
      scrollToHash();
    } else {
      router.push(path);
      // let the destination page render before scrolling to the section
      setTimeout(scrollToHash, 500);
    }
  };

  const handleScanAll = async () => {
    if (scanning) return;
    setScanning(true);
    setScanDone(false);
    setScanError(false);
    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      });
      if (!res.ok) throw new Error(`Scan request failed (${res.status})`);
      setScanDone(true);
      // The scan runs in the background; give it a moment, then refresh the
      // server components (Topbar "Last scan", dashboard data) so the new run
      // shows without a manual reload.
      setTimeout(() => {
        setScanDone(false);
        router.refresh();
      }, 3000);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      setScanError(true);
      setTimeout(() => setScanError(false), 4000);
    } finally {
      setScanning(false);
    }
  };

  const getPlanBadge = () => {
    if (!settings) return 'Trial';
    if (settings.business_type === 'local') return 'Local';
    if (settings.subscription_status === 'active') return 'Pro';
    return 'Trial';
  };

  const planBadge = getPlanBadge();
  const isOnTrial = settings?.subscription_status === 'trialing';
  const trialProgress = Math.min(100, ((2 - trialDays) / 2) * 100);

  // Close the drawer whenever navigation lands on a new page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const SidebarInner = (
    <div className="flex flex-col h-full bg-sidebar border-sidebar-border">
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md bg-primary">
            <RivalscopeLogo size={14} className="text-primary-foreground" />
          </div>
          <div className="leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              Rivalscope
            </span>
          </div>
        </div>

        {/* User profile pill */}
        <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-muted border border-border">
          <p
            className="text-[12px] font-medium truncate min-w-0 text-muted-foreground"
            title={email}
          >
            {email}
          </p>
          <Badge
            variant={planBadge === 'Pro' ? 'default' : 'secondary'}
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0 h-4 rounded-sm"
          >
            {planBadge}
          </Badge>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <SidebarNav
        pathname={pathname}
        pendingCount={pendingCount}
        onHashNav={handleHashNav}
      />

      {/* ── Bottom actions ──────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 space-y-2 border-t border-sidebar-border">
        {/* Scan all button */}
        <Button
          onClick={handleScanAll}
          disabled={scanning}
          variant="default"
          size="sm"
          className={cn(
            'w-full text-[12px]',
            scanDone && 'bg-emerald-600/10 border border-emerald-600/25 text-emerald-600 hover:bg-emerald-600/15',
            scanError && 'bg-destructive/10 border border-destructive/25 text-destructive hover:bg-destructive/15'
          )}
        >
          <RefreshCw
            size={12}
            className={scanning ? 'animate-spin' : ''}
          />
          {scanning
            ? 'Scanning…'
            : scanError
            ? 'Scan failed — retry'
            : scanDone
            ? 'Queued!'
            : 'Scan all now'}
        </Button>

        {/* Trial upgrade banner */}
        {isOnTrial && (
          <div className="rounded-md p-3 space-y-2 bg-muted border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                {trialDays} days left
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                Trial
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full rounded-full overflow-hidden bg-border" style={{ height: '2px' }}>
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out bg-primary"
                style={{ width: `${trialProgress}%` }}
              />
            </div>
            <Link
              href="/settings"
              className="block w-full py-2 rounded-md text-[11px] font-semibold text-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-[12px] cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-primary">
            <RivalscopeLogo size={12} className="text-primary-foreground" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-foreground">
            Rivalscope
          </span>
        </div>

        {/* Mobile Sheet trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              className="-mr-2"
            >
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton className="p-0 w-[240px] sm:w-[240px] bg-sidebar border-sidebar-border">
            {SidebarInner}
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside
        style={{ width: 'var(--sidebar-width)' }}
        className="hidden md:flex fixed top-0 left-0 h-full flex-col z-40 border-r border-sidebar-border"
      >
        {SidebarInner}
      </aside>
    </>
  );
}
