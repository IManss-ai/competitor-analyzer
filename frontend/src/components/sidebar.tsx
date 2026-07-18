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
import { useState, useEffect, useCallback } from 'react';
import { isAbortError } from '@/lib/fetch-utils';
import { useApiToken } from '@/lib/use-api-token';
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
  accessLevel?: 'full' | 'read_only';
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
  business_type?: string;
  subscription_status?: string;
  access_level?: 'full' | 'read_only';
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
        'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-(--duration-base) ease-(--ease-out)',
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
          className="text-xs font-bold px-2 py-0 h-4 rounded-sm leading-none tabular-nums"
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
    <nav aria-label="Primary" className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
      <div>
        <p className="px-3 mb-2 text-xs font-mono tracking-[0.12em] uppercase text-muted-foreground">
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
        <p className="px-3 mb-2 text-xs font-mono tracking-[0.12em] uppercase text-muted-foreground">
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

export default function Sidebar({ email, userId, pendingCount, accessLevel }: SidebarProps) {
  const apiToken = useApiToken();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/settings`, {
        headers: {
          Authorization: `Bearer ${apiToken ?? userId}`,
        },
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
    }
  }, [userId, apiUrl, apiToken]);

  // Refetch on every route change, not just on mount: the free-test label below
  // ("1 free test available" vs "Free test used") must track the same backend
  // source (settings.access_level) that pages and the paywall gate read fresh.
  // A mount-only fetch goes stale the moment the initial scan consumes the free
  // test, letting the sidebar disagree with the battlecards page (TODOS #48).
  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, [fetchSettings, pathname]);

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
          Authorization: `Bearer ${apiToken ?? userId}`,
        },
      });
      if (res.status === 402) {
        // Free test consumed — scans are paid. Route to the upgrade surface
        // instead of flashing a misleading "Scan failed" state.
        router.push('/settings?tab=billing');
        return;
      }
      if (!res.ok) throw new Error(`Scan request failed (${res.status})`);
      setScanDone(true);
      // The scan runs in the background; give it a moment, then refresh the
      // server components (Topbar "Last scan", dashboard data) so the new run
      // shows without a manual reload.
      setTimeout(() => {
        setScanDone(false);
        router.refresh();
        // A scan can consume the free test; re-read settings so the free-test
        // label below flips in place instead of waiting for a navigation.
        fetchSettings();
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
    if (!settings) return 'Free';
    if (settings.business_type === 'local') return 'Local';
    if (settings.subscription_status === 'active') return 'Pro';
    return 'Free';
  };

  const planBadge = getPlanBadge();
  const isPaid = settings?.subscription_status === 'active';
  // Two sources, freshest wins: the accessLevel prop (server layout, fresh on
  // hard loads / router.refresh) OR the client settings fetch (re-run on every
  // route change + after scans). Either reporting read_only locks the label,
  // so the sidebar can no longer trail the battlecards page after the initial
  // scan consumes the free test.
  const isLocked = accessLevel === 'read_only' || settings?.access_level === 'read_only';
  // Usage-based model: nudge any non-paying user to upgrade. Once their one free
  // test is spent the API reports access_level "read_only" (locked); before that
  // they still have their free test available.
  const showUpgrade = (!!settings && !isPaid) || isLocked;

  // Close the drawer whenever navigation lands on a new page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const SidebarInner = (
    <div className="flex flex-col h-full bg-sidebar border-sidebar-border">
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-sidebar-border">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md [background-image:var(--gradient-primary)] shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
            <RivalscopeLogo size={14} className="text-primary-foreground" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Rivalscope
            </span>
            <span className="mt-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* User profile pill */}
        <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 bg-muted border border-border">
          <p
            className="text-xs font-medium truncate min-w-0 text-muted-foreground"
            title={email}
          >
            {email}
          </p>
          <Badge
            variant={planBadge === 'Pro' ? 'default' : 'secondary'}
            className="flex-shrink-0 text-xs font-bold uppercase tracking-wide px-2 py-0 h-4 rounded-sm"
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
            'w-full text-xs',
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
            ? 'Scan failed · retry'
            : scanDone
            ? 'Queued!'
            : 'Scan all now'}
        </Button>

        {/* Usage-based upgrade banner (free users) */}
        {showUpgrade && (
          <div className="rounded-md p-3 space-y-2 bg-muted border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isLocked ? 'Free test used' : '1 free test available'}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Free
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              {isLocked
                ? 'Upgrade to Pro to keep generating battle cards.'
                : 'Upgrade any time for unlimited battle cards.'}
            </p>
            <Link
              href="/settings?tab=billing"
              className="block w-full py-2 rounded-full text-xs font-semibold text-center [background-image:var(--gradient-primary)] text-primary-foreground shadow-[0_8px_22px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-[filter] hover:brightness-105"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-xs cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
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
          <div className="w-7 h-7 flex items-center justify-center rounded-md [background-image:var(--gradient-primary)]">
            <RivalscopeLogo size={12} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
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
