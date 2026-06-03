import { clsx } from 'clsx';

const badgeConfig: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  pricing_change: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Pricing',
  },
  feature_add: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Feature',
  },
  repositioning: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Positioning',
  },
  minor_copy: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-500',
    border: 'border-zinc-200',
    label: 'Copy',
  },
  no_change: {
    bg: 'bg-zinc-50',
    text: 'text-zinc-400',
    border: 'border-zinc-200',
    label: 'No change',
  },
};

interface ChangeBadgeProps {
  type: string;
}

export default function ChangeBadge({ type }: ChangeBadgeProps) {
  const config = badgeConfig[type] ?? badgeConfig.minor_copy;

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.label}
    </span>
  );
}
