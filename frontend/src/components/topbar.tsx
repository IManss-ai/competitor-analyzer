
interface TopbarProps {
  title: string;
  subtitle?: string;
  lastScan?: string | null;
  actions?: React.ReactNode;
}

function getRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function Topbar({ title, subtitle, lastScan, actions }: TopbarProps) {
  return (
    <header className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-[22px] font-semibold text-[#0a0a0a] tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#737373] mt-1.5 font-normal">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-6 pt-0.5">
        {actions && (
          <div className="flex items-center">
            {actions}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-[#525252]">Monitoring active</span>
        </div>
        <div className="h-4 w-px bg-[#e5e5e5]"></div>
        {lastScan ? (
          <time className="text-xs text-[#a3a3a3] font-mono" dateTime={lastScan}>
            Last scan: {getRelativeTime(lastScan)}
          </time>
        ) : (
          <span className="text-xs text-[#a3a3a3] font-mono">No scans yet</span>
        )}
      </div>
    </header>
  );
}
