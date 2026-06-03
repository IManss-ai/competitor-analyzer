'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { animate, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'blue' | 'amber' | 'emerald' | 'neutral';
  trend?: 'up' | 'down' | 'flat';
}

const accentMap = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-500',
  neutral: 'bg-zinc-300',
};

const borderAccentMap = {
  blue: 'border-b-blue-600',
  amber: 'border-b-amber-500',
  emerald: 'border-b-emerald-600',
  neutral: 'border-b-zinc-400',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = 'neutral',
  trend,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(
    typeof value === 'number' ? 0 : value
  );

  useEffect(() => {
    if (typeof value === 'number') {
      const controls = animate(0, value, {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (val) => setDisplayValue(Math.round(val)),
      });
      return controls.stop;
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <motion.div
      whileHover={{ y: -1, boxShadow: 'var(--shadow-card-hover)' }}
      className="bg-white rounded-xl border border-[#e5e5e5] p-5 transition-all duration-150 relative overflow-hidden group"
    >
      <div
        className={clsx(
          'absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 ease-out group-hover:w-full',
          borderAccentMap[accent]
        )}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#737373] uppercase tracking-wide">
          {title}
        </p>
        <span
          className={clsx('w-1.5 h-1.5 rounded-full mt-1', accentMap[accent])}
        />
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold text-[#0a0a0a] leading-none tracking-tight">
          {displayValue}
        </p>
        {trend && (
          <div
            className={clsx(
              'flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border',
              trend === 'up' && 'text-emerald-700 bg-emerald-50 border-emerald-200',
              trend === 'down' && 'text-red-700 bg-red-50 border-red-200',
              trend === 'flat' && 'text-zinc-600 bg-zinc-100 border-zinc-200'
            )}
          >
            {trend === 'up' && <ArrowUp size={10} weight="bold" />}
            {trend === 'down' && <ArrowDown size={10} weight="bold" />}
            {trend === 'flat' && <Minus size={10} weight="bold" />}
            <span className="uppercase tracking-wide">{trend}</span>
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-[#a3a3a3] mt-2 font-mono">{subtitle}</p>
      )}
    </motion.div>
  );
}
