import ThemeToggle from '@/components/theme-toggle';

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

function getFormattedDateline(lastScan?: string | null) {
  const date = new Date();
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  
  const dateStr = `${dayName} ${day} ${monthName} ${year}`;
  
  if (lastScan) {
    const relative = getRelativeTime(lastScan);
    return `${dateStr} · LAST SCAN: ${relative.toUpperCase()} · LIVE`;
  }
  return `${dateStr} · SYSTEM ONLINE · LIVE`;
}

export default function Topbar({ title, subtitle, lastScan, actions }: TopbarProps) {
  return (
    <header
      className="flex items-end justify-between flex-wrap gap-3 mb-8 pb-4"
      style={{ borderBottom: '2px solid var(--text-primary)' }}
    >
      {/* Left — page title + broadsheet dateline */}
      <div>
        <h1
          className="text-[28px] font-extrabold leading-tight tracking-tight uppercase"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        <div
          className="text-[11px] font-mono uppercase tracking-[0.1em] mt-2 flex flex-wrap items-center gap-x-2"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          <span>{getFormattedDateline(lastScan)}</span>
          {subtitle && (
            <>
              <span>·</span>
              <span className="normal-case tracking-normal" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right — theme toggle + actions */}
      <div className="flex items-center gap-4 pb-0.5 flex-shrink-0">
        <ThemeToggle />

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
