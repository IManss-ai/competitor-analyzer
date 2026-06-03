import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
}

export default function StatsCard({ title, value, icon: Icon, subtitle }: StatsCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1 font-heading">{value}</p>
          {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-50 rounded-lg">
          <Icon className="w-5 h-5 text-zinc-500" />
        </div>
      </div>
    </div>
  );
}
