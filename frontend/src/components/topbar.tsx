import ThemeToggle from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';

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
    <header className="flex items-end justify-between flex-wrap gap-3 mb-8 pb-4 border-b border-border">
      {/* Left — page title + broadsheet dateline */}
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <div className="text-[11px] font-mono uppercase tracking-[0.08em] mt-1.5 flex flex-wrap items-center gap-x-2 text-muted-foreground">
          <span>{getFormattedDateline(lastScan)}</span>
          {subtitle && (
            <>
              <span>·</span>
              <span className="normal-case tracking-normal text-muted-foreground">
                {subtitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right — theme toggle + actions */}
      <div className="flex items-center gap-3 pb-0.5 flex-shrink-0">
        <ThemeToggle />

        {/* Actions slot */}
        {actions && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div>{actions}</div>
          </>
        )}
      </div>
    </header>
  );
}
