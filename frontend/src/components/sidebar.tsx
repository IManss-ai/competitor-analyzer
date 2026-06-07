'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Shield,
  TrendingUp,
  CheckSquare,
  Settings,
  LogOut,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  email: string;
  userId: string;
  pendingCount?: number;
}

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/competitors',           label: 'Competitors',  Icon: Building2 },
  { href: '/dashboard#feed',        label: 'Intel Feed',   Icon: FileText },
  { href: '/dashboard#battlecards', label: 'Battle Cards', Icon: Shield },
  { href: '/trends',                label: 'Trends',       Icon: TrendingUp },
  { href: '/queue',                 label: 'Action Queue', Icon: CheckSquare },
  { href: '/settings',              label: 'Settings',     Icon: Settings },
];

interface SettingsData {
  trial_ends_at?: string;
  business_type?: string;
  subscription_status?: string;
}

export default function Sidebar({ email, userId, pendingCount }: SidebarProps) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [trialDays, setTrialDays] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${apiUrl}/api/v1/settings`, {
          headers: {
            Authorization: `Bearer ${userId}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSettings();
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

  const handleScanAll = async () => {
    if (scanning) return;
    setScanning(true);
    setScanDone(false);
    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      });
      if (res.ok) {
        setScanDone(true);
        setTimeout(() => setScanDone(false), 3000);
      }
    } catch (e) {
      console.error(e);
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
  const trialProgress = Math.min(100, ((14 - trialDays) / 14) * 100);

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--surface-base)',
        borderRight: '1px solid var(--border-default)',
      }}
      className="fixed top-0 left-0 h-full flex flex-col z-40"
    >
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
            }}
          >
            <RivalscopeLogo size={14} className="text-sky-400" />
          </div>
          <div className="leading-none">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Rival
            </span>
            <span className="text-[15px] font-bold tracking-tight text-sky-400">scope</span>
          </div>
        </div>

        {/* User profile pill */}
        <div
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-default)',
          }}
        >
          <p
            className="text-[12px] font-medium truncate min-w-0"
            style={{ color: 'var(--text-secondary)' }}
            title={email}
          >
            {email}
          </p>
          <span
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: planBadge === 'Pro'
                ? 'rgba(14,165,233,0.15)'
                : 'rgba(255,255,255,0.06)',
              color: planBadge === 'Pro' ? '#38bdf8' : 'var(--text-muted)',
              border: planBadge === 'Pro'
                ? '1px solid rgba(14,165,233,0.28)'
                : '1px solid var(--border-default)',
            }}
          >
            {planBadge}
          </span>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && !href.includes('#') && pathname.startsWith(href));
          const hasBadge = href === '/queue' && pendingCount && pendingCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'text-sky-300'
                  : 'hover:text-[var(--text-primary)]'
              )}
              style={
                isActive
                  ? { background: 'rgba(14,165,233,0.10)', color: '#7dd3fc' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {/* Active left rail */}
              {isActive && (
                <motion.div
                  layoutId="activeNavRail"
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: '3px',
                    height: '18px',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 8px var(--accent-primary)',
                  }}
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}

              <Icon
                size={15}
                className="flex-shrink-0"
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className="flex-1 truncate">{label}</span>

              {hasBadge && (
                <span
                  className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  {pendingCount}
                </span>
              )}

              {/* Subtle hover arrow for non-active */}
              {!isActive && (
                <ChevronRight
                  size={11}
                  className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom actions ──────────────────────────────────────────── */}
      <div
        className="px-3 pb-4 pt-3 space-y-2"
        style={{ borderTop: '1px solid var(--border-default)' }}
      >
        {/* Scan all button */}
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="rs-btn-primary w-full text-[12px]"
          style={
            scanDone
              ? {
                  background: 'rgba(16,185,129,0.10)',
                  border: '1px solid rgba(16,185,129,0.22)',
                  color: '#34d399',
                }
              : undefined
          }
        >
          <RefreshCw
            size={12}
            className={scanning ? 'animate-spin' : ''}
          />
          {scanning ? 'Scanning…' : scanDone ? 'Queued!' : 'Scan all now'}
        </button>

        {/* Trial upgrade banner */}
        {isOnTrial && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {trialDays} days left
              </span>
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Trial
              </span>
            </div>
            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${trialProgress}%`,
                  background: 'var(--accent-primary)',
                }}
              />
            </div>
            <Link
              href="/settings"
              className="block w-full py-1.5 rounded-md text-[11px] font-semibold text-center text-white transition-colors"
              style={{ background: 'var(--accent-primary)' }}
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
