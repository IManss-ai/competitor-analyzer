import clsx from "clsx";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "from-indigo-600/20 to-indigo-600/5 border-indigo-500/20",
  success: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20",
  warning: "from-amber-600/20 to-amber-600/5 border-amber-500/20",
  danger:  "from-rose-600/20 to-rose-600/5 border-rose-500/20",
};

const iconStyles = {
  default: "bg-indigo-500/20 text-indigo-400",
  success: "bg-emerald-500/20 text-emerald-400",
  warning: "bg-amber-500/20 text-amber-400",
  danger:  "bg-rose-500/20 text-rose-400",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  return (
    <div
      className={clsx(
        "relative rounded-xl border bg-gradient-to-br p-5 overflow-hidden",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <p
              className={clsx(
                "text-xs font-medium mt-2",
                trend.value >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
