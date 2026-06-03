import { clsx } from 'clsx';

const badgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  pricing_change: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  feature_add: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  repositioning: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  minor_copy: { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' },
  no_change: { bg: 'bg-zinc-100', text: 'text-zinc-400', border: 'border-zinc-200' },
};

interface ChangeBadgeProps {
  type: string;
}

export default function ChangeBadge({ type }: ChangeBadgeProps) {
  const style = badgeStyles[type] || badgeStyles.minor_copy;
  const label = type.replace(/_/g, ' ');

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider',
        style.bg,
        style.text,
        style.border
      )}
    >
      {label}
    </span>
  );
}
