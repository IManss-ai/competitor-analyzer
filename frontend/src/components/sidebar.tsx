'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import {
  SquaresFour,
  Users,
  CheckSquare,
  TrendUp,
  GearSix,
  SignOut,
  CaretLeft,
  CaretRight,
  Crosshair,
} from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: SquaresFour },
  { href: '/competitors', label: 'Competitors', Icon: Users },
  { href: '/queue', label: 'Action Queue', Icon: CheckSquare },
  { href: '/trends', label: 'Trends', Icon: TrendUp },
  { href: '/settings', label: 'Settings', Icon: GearSix },
];

interface SidebarProps {
  email: string;
  pendingCount?: number;
}

const MotionLink = motion.create(Link);

export default function Sidebar({ email, pendingCount }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '4rem' : '15rem'
    );
  }, [collapsed]);

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-full flex flex-col z-40 transition-all duration-200 ease-out group',
        'bg-[#0a0a0a] border-r border-white/[0.06]',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Logo */}
      <div
        className={clsx(
          'h-14 flex items-center border-b border-white/[0.06] flex-shrink-0 relative z-10',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Crosshair size={13} weight="bold" className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight truncate">
              Competitor Analyzer
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <Crosshair size={14} weight="bold" className="text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors flex-shrink-0"
            title="Collapse sidebar"
          >
            <CaretLeft size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto relative z-10">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const hasBadge = href === '/queue' && pendingCount && pendingCount > 0;

          return (
            <MotionLink
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-100 relative',
                isActive
                  ? 'text-white'
                  : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-[4px] bottom-[4px] w-0.5 bg-blue-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {isActive && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none" />
              )}
              <Icon
                size={16}
                weight={isActive ? 'bold' : 'regular'}
                className="flex-shrink-0 relative z-10"
              />
              {!collapsed && <span className="truncate relative z-10">{label}</span>}
              {!collapsed && hasBadge && (
                <motion.span 
                  animate={{ scale: [1, 1.15, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none py-[3px] relative z-10"
                >
                  {pendingCount}
                </motion.span>
              )}
            </MotionLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-2 flex-shrink-0 relative z-10">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors mb-1"
            title="Expand sidebar"
          >
            <CaretRight size={14} />
          </button>
        )}
        {!collapsed && (
          <p 
            title={email}
            className="text-[11px] text-white/25 truncate px-2.5 pb-1 pt-0.5 font-mono cursor-default"
          >
            {email.length > 18 ? email.substring(0, 18) + '...' : email}
          </p>
        )}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title="Sign out"
            className={clsx(
              'flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <SignOut size={15} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
