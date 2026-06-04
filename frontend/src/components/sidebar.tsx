'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import {
  House,
  Buildings,
  Newspaper,
  Shield,
  TrendUp,
  CheckSquare,
  Gear,
  SignOut,
  Plus,
  ArrowsClockwise
} from '@phosphor-icons/react';
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
    try {
      const res = await fetch(`${apiUrl}/api/v1/scan/now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`
        }
      });
      if (res.ok) {
        alert("Full landscape scan triggered in the background!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const getTrialDaysLeft = () => {
    if (!settings || !settings.trial_ends_at) return 0;
    const ends = new Date(settings.trial_ends_at);
    const now = new Date();
    const diff = ends.getTime() - now.getTime();
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

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', Icon: House },
    { href: '/competitors', label: 'Competitors', Icon: Buildings },
    { href: '/dashboard#feed', label: 'Intel Feed', Icon: Newspaper },
    { href: '/dashboard#battlecards', label: 'Battle Cards', Icon: Shield },
    { href: '/trends', label: 'Trends', Icon: TrendUp },
    { href: '/queue', label: 'Action Queue', Icon: CheckSquare },
    { href: '/settings', label: 'Settings', Icon: Gear },
  ];
  return (
    <aside className="fixed top-0 left-0 h-full w-60 flex flex-col z-40 bg-[#090614] border-r border-white/[0.06] font-sans">
      {/* Top section: Wordmark + Profile */}
      <div className="p-5 border-b border-white/[0.06] space-y-3">
        <div>
          <span className="text-base font-bold text-white tracking-tight">Intel</span>
          <span className="text-xs text-purple-400 ml-1.5 font-medium tracking-wide">analyzer</span>
        </div>
        
        <div className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate" title={email}>
              {email}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wide">
            {planBadge}
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          const hasBadge = href === '/queue' && pendingCount && pendingCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative border-l-2',
                isActive
                  ? 'bg-purple-950/20 text-purple-400 border-purple-500 font-semibold'
                  : 'text-zinc-400 border-transparent hover:bg-white/[0.02] hover:text-white'
              )}
            >
              <Icon
                size={16}
                weight={isActive ? 'bold' : 'regular'}
                className="flex-shrink-0"
              />
              <span className="truncate flex-1">{label}</span>
              {hasBadge && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/[0.06] space-y-3 bg-white/[0.01]">
        {/* Scan all now button */}
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
        >
          {scanning ? (
            <>
              <ArrowsClockwise size={14} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <ArrowsClockwise size={14} />
              Scan all now
            </>
          )}
        </button>

        {/* Add competitor link */}
        <Link
          href="/competitors"
          className="w-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 text-zinc-300 py-2 rounded-lg text-xs font-semibold text-center block transition-all"
        >
          Add competitor
        </Link>

        {/* Upgrade prompt if on trial */}
        {settings && settings.subscription_status === 'trialing' && (
          <div className="border border-white/10 rounded-lg p-2.5 bg-white/[0.02] text-center space-y-2 mt-2">
            <p className="text-[10px] text-zinc-400 font-medium leading-normal">
              {trialDays} days left in trial
            </p>
            <Link
              href="/settings"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded-md text-[10px] font-bold text-center block transition-colors"
            >
              Upgrade
            </Link>
          </div>
        )}

        <form action="/api/auth/logout" method="POST" className="pt-1">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <SignOut size={14} />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
