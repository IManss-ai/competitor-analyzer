'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { LayoutDashboard, Building2, FileText, Shield, TrendingUp, CheckSquare, Settings, LogOut, RefreshCw, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  email: string;
  userId: string;
  pendingCount?: number;
}

export default function Sidebar({ email, userId, pendingCount }: SidebarProps) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/settings`, {
      headers: { Authorization: `Bearer ${userId}` }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setSettings(data))
      .catch(() => {
        setSettings({
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
          business_type: 'saas'
        });
      });
  }, [userId, apiUrl]);

  const handleScanAll = async () => {
    if (scanning) return;
    setScanning(true);
    setScanDone(false);
    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`
        }
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

  const getTrialDaysLeft = () => {
    if (!settings?.trial_ends_at) return 0;
    const diff = new Date(settings.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const getPlanBadge = () => {
    if (!settings) return 'Trial';
    if (settings.business_type === 'local') return 'Local';
    if (settings.subscription_status === 'active') return 'Pro';
    return 'Trial';
  };

  const trialDays = getTrialDaysLeft();
  const planBadge = getPlanBadge();
  const isOnTrial = settings?.subscription_status === 'trialing';

  const navItems = [
    { href: '/dashboard',           label: 'Dashboard',    Icon: LayoutDashboard },
    { href: '/competitors',         label: 'Competitors',  Icon: Building2 },
    { href: '/dashboard#feed',      label: 'Intel Feed',   Icon: FileText },
    { href: '/dashboard#battlecards', label: 'Battle Card', Icon: Shield },
    { href: '/trends',              label: 'Trends',       Icon: TrendingUp },
    { href: '/queue',               label: 'Action Queue', Icon: CheckSquare },
    { href: '/settings',            label: 'Settings',     Icon: Settings },
  ];

  return (
    <aside className="fixed top-0 left-0 h-full w-[220px] flex flex-col z-40 bg-[#06030c] border-r border-white/[0.055]">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.055]">
        <div className="flex items-center gap-2.5 mb-4">
          {/* Lettermark */}
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <RivalscopeLogo size={12} className="text-sky-400" />
          </div>
          <div className="leading-none">
            <span className="text-[13px] font-bold text-white tracking-tight">Rival</span><span className="text-[13px] font-bold text-sky-400 tracking-tight">scope</span>
          </div>
        </div>

        {/* User profile */}
        <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 bg-white/[0.025] border border-white/[0.055]">
          <p className="text-[11px] font-medium text-zinc-300 truncate min-w-0" title={email}>
            {email}
          </p>
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wide">
            {planBadge}
          </span>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          const hasBadge = href === '/queue' && pendingCount && pendingCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative',
                isActive
                  ? 'bg-sky-500/8 text-sky-400'
                  : 'text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-200'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sky-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <Icon
                size={15}
                className="flex-shrink-0"
              />
              <span className="flex-1 truncate">{label}</span>
              {hasBadge && (
                <span className="bg-sky-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom ────────────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.055] space-y-2">

        {/* Scan button */}
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className={clsx(
            'w-full py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60',
            scanDone
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-sky-600 hover:bg-sky-500 text-white border border-sky-500/30'
          )}
        >
          {scanning ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Scanning...
            </>
          ) : scanDone ? (
            <>Scan queued!</>
          ) : (
            <>
              <RefreshCw size={13} />
              Scan all now
            </>
          )}
        </button>

        {/* Add competitor */}
        <Link
          href="/competitors"
          className="w-full border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] text-zinc-400 hover:text-zinc-200 py-2 rounded-lg text-[12px] font-medium text-center flex items-center justify-center gap-1.5 transition-all"
        >
          Add competitor
          <ArrowRight size={11} />
        </Link>

        {/* Trial upgrade banner */}
        {isOnTrial && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-medium">{trialDays} days left in trial</span>
              <span className="text-[9px] font-mono text-zinc-600">Trial</span>
            </div>
            <div className="w-full h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500/40 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((14 - trialDays) / 14) * 100)}%` }}
              />
            </div>
            <Link
              href="/settings"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white py-1.5 rounded-md text-[10px] font-semibold text-center block transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[11px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
