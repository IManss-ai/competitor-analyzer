'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  TrendingUp,
  Settings,
  CreditCard,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/competitors', label: 'Competitors', icon: Users },
  { href: '/queue', label: 'Action Queue', icon: ListChecks },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  email: string;
  pendingCount?: number;
}

export default function Sidebar({ email, pendingCount }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-full bg-white border-r border-zinc-200 flex flex-col z-40 transition-all duration-150 ease-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo block */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-900" />
            <span className="font-heading font-bold text-zinc-900 text-sm tracking-tight">
              Competitor Analyzer
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.href === '/queue' && pendingCount && pendingCount > 0 ? (
                <span className="ml-auto bg-blue-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Account footer */}
      <div className="border-t border-zinc-200 p-3">
        {!collapsed && (
          <p className="text-xs text-zinc-400 truncate mb-2 px-1">{email}</p>
        )}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className={clsx(
              'flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors',
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
