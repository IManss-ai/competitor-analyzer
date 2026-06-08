'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { animate, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'violet' | 'amber' | 'emerald' | 'neutral' | 'blue';
  trend?: 'up' | 'down' | 'flat';
}

const accentConfig: Record<string, { dot: string; bar: string }> = {
  violet:  { dot: '#4f7cb0', bar: 'var(--accent-primary)' },
  blue:    { dot: '#6a96c8', bar: '#4f7cb0' },
  amber:   { dot: '#c79a4e', bar: '#d97706' },
  emerald: { dot: '#5aa07a', bar: '#059669' },
  neutral: { dot: '#4e5a6e', bar: '#374151' },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = 'neutral',
  trend,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const cfg = accentConfig[accent] ?? accentConfig.neutral;

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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rs-card group relative overflow-hidden p-5"
    >
      {/* Accent top border — replaces bottom sweep */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg"
        style={{ background: cfg.bar }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4 pt-1">
        <p className="rs-label">{title}</p>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: cfg.dot }}
        />
      </div>

      {/* Value + trend */}
      <div className="flex items-end justify-between">
        <p
          className="text-[28px] font-semibold leading-none tracking-tight"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}
        >
          {renderedValue}
        </p>

        {trend && (
          <div
            className={clsx(
              'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md border',
            )}
            style={
              trend === 'up'
                ? { color: '#5aa07a', background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.20)' }
                : trend === 'down'
                ? { color: '#f87171', background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.20)' }
                : { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border-default)' }
            }
          >
            {trend === 'up'   && <ArrowUp size={9} />}
            {trend === 'down' && <ArrowDown size={9} />}
            {trend === 'flat' && <Minus size={9} />}
            <span className="uppercase tracking-wider">{trend}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p
          className="text-[11px] mt-2 font-mono"
          style={{ color: 'var(--text-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
