
interface TopbarProps {
  title: string;
  subtitle?: string;
  lastScan?: string | null;
  actions?: React.ReactNode;
}

function getRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days === 1)  return 'yesterday';
  return `${days}d ago`;
}

export default function Topbar({ title, subtitle, lastScan, actions }: TopbarProps) {
  return (
    <header
      className="flex items-start justify-between mb-8 pb-6"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {/* Left — page title */}
      <div>
        <h1
          className="text-[24px] font-semibold leading-tight tracking-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[13px] mt-1 font-normal"
            style={{ color: 'var(--text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right — meta + actions */}
      <div className="flex items-center gap-4 pt-0.5 flex-shrink-0">
        {/* Monitoring status */}
        <div className="flex items-center gap-2">
          <span className="status-dot-active" />
          <span
            className="text-[12px] font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Monitoring active
          </span>
        </div>

        {/* Divider */}
        <div
          style={{ width: '1px', height: '16px', background: 'var(--border-default)' }}
        />

        {/* Last scan */}
        {lastScan ? (
          <time
            className="text-[11px] font-mono"
            style={{ color: 'var(--text-muted)' }}
            dateTime={lastScan}
          >
            Last scan: {getRelativeTime(lastScan)}
          </time>
        ) : (
          <span
            className="text-[11px] font-mono"
            style={{ color: 'var(--text-muted)' }}
          >
            No scans yet
          </span>
        )}

        {/* Actions slot */}
        {actions && (
          <>
            <div
              style={{ width: '1px', height: '16px', background: 'var(--border-default)' }}
            />
            <div>{actions}</div>
          </>
        )}
      </div>
    </header>
  );
}
