import { clsx } from 'clsx';

// Human-readable labels per change type. Visual styling (color, radius, mono,
// uppercase) comes from the locked .badge / .badge-{type} classes in globals.css
// so badges are identical everywhere they render (queue, dashboard, battle card).
const LABELS: Record<string, string> = {
  initial_scan: 'New',
  pricing_change: 'Pricing',
  feature_add: 'Feature',
  new_feature: 'Feature',
  repositioning: 'Positioning',
  positioning_shift: 'Positioning',
  review_trend: 'Reviews',
  minor_copy: 'Copy',
  no_change: 'No change',
};

const BADGE_CLASS: Record<string, string> = {
  initial_scan: 'badge-initial_scan',
  pricing_change: 'badge-pricing_change',
  feature_add: 'badge-feature_add',
  new_feature: 'badge-new_feature',
  repositioning: 'badge-repositioning',
  positioning_shift: 'badge-positioning_shift',
  review_trend: 'badge-review_trend',
  minor_copy: 'badge-minor_copy',
  no_change: 'badge-no_change',
};

interface ChangeBadgeProps {
  type: string;
}

export default function ChangeBadge({ type }: ChangeBadgeProps) {
  const label = LABELS[type] ?? LABELS.minor_copy;
  const badgeClass = BADGE_CLASS[type] ?? 'badge-minor_copy';

  return <span className={clsx('badge', badgeClass)}>{label}</span>;
}
