'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { animate, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

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
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number') {
      const controls = animate(0, value, {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (val) => setDisplayValue(Math.round(val)),
      });
      return controls.stop;
    }
  }, [value]);

  const renderedValue = typeof value === 'number' ? displayValue : value;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-1 bg-zinc-100/50 border border-zinc-200/60 rounded-2xl transition-all duration-150 group"
    >
      <div className="bg-white border border-zinc-100 rounded-[calc(1rem-0.125rem)] p-4.5 relative overflow-hidden shadow-sm">
        <div
          className={clsx(
            'absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 ease-out group-hover:w-full',
            borderAccentMap[accent]
          )}
        />
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-mono text-[#737373] uppercase tracking-wider">
            {title}
          </p>
          <span
            className={clsx('w-1.5 h-1.5 rounded-full mt-1', accentMap[accent])}
          />
        </div>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold text-[#0a0a0a] leading-none tracking-tight font-mono">
            {renderedValue}
          </p>
          {trend && (
            <div
              className={clsx(
                'flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md border',
                trend === 'up' && 'text-emerald-700 bg-emerald-50 border-emerald-200',
                trend === 'down' && 'text-red-700 bg-red-50 border-red-200',
                trend === 'flat' && 'text-zinc-600 bg-zinc-100 border-zinc-200'
              )}
            >
              {trend === 'up' && <ArrowUp size={9}  />}
              {trend === 'down' && <ArrowDown size={9}  />}
              {trend === 'flat' && <Minus size={9}  />}
              <span className="uppercase tracking-wider">{trend}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-[10.5px] text-[#a3a3a3] mt-2 font-mono">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
