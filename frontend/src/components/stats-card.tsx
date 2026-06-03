import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'blue' | 'amber' | 'emerald' | 'neutral';
}

const accentMap = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-500',
  neutral: 'bg-zinc-300',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = 'neutral',
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 hover:border-[#d4d4d4] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#737373] uppercase tracking-wide">
          {title}
        </p>
        <span
          className={clsx('w-1.5 h-1.5 rounded-full mt-1', accentMap[accent])}
        />
      </div>
      <p className="text-3xl font-semibold text-[#0a0a0a] leading-none tracking-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[#a3a3a3] mt-2 font-mono">{subtitle}</p>
      )}
    </div>
  );
}
