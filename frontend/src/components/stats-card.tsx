'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { animate, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useChartPalette } from '@/lib/chart-theme';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'violet' | 'amber' | 'emerald' | 'neutral' | 'blue';
  trend?: 'up' | 'down' | 'flat';
}

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = 'neutral',
  trend,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const p = useChartPalette();
  const accentConfig: Record<string, { dot: string; bar: string }> = {
    violet:  { dot: p.accent, bar: 'var(--primary)' },
    blue:    { dot: p.accentSoft, bar: p.accent },
    amber:   { dot: p.warning, bar: p.warning },
    emerald: { dot: p.positive, bar: p.positive },
    neutral: { dot: p.neutral, bar: p.neutral },
  };
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
      className="group relative overflow-hidden p-5 rounded-xl border border-border bg-card transition-colors hover:border-input"
    >
      {/* Accent top border — replaces bottom sweep */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: cfg.bar, borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)' }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4 pt-1">
        <p className="text-xs font-medium uppercase tracking-[0.08em] font-mono text-muted-foreground">{title}</p>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: cfg.dot }}
        />
      </div>

      {/* Value + trend */}
      <div className="flex items-end justify-between">
        <p
          className="text-[28px] font-semibold leading-none tracking-tight text-foreground"
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.03em',
          }}
        >
          {renderedValue}
        </p>

        {trend && (
          <div
            className={clsx(
              'flex items-center gap-1 text-[10px] font-mono px-2 py-1 border',
            )}
            style={{
              borderRadius: 'var(--radius-sm)',
              ...(trend === 'up'
                ? { color: p.positive, background: 'color-mix(in oklch, var(--tone-positive) 8%, transparent)', borderColor: 'color-mix(in oklch, var(--tone-positive) 20%, transparent)' }
                : trend === 'down'
                ? { color: p.danger, background: 'color-mix(in oklch, var(--tone-danger) 8%, transparent)', borderColor: 'color-mix(in oklch, var(--tone-danger) 20%, transparent)' }
                : { color: 'var(--muted-foreground)', background: 'var(--muted)', borderColor: 'var(--border)' })
            }}
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
          className="text-[11px] mt-2 font-mono text-muted-foreground"
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
