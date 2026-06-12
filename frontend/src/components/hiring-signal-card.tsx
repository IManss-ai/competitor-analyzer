'use client';

import { Briefcase, TrendingUp, MinusCircle, AlertCircle } from 'lucide-react';

interface HiringSignal {
  snapshot_at: string | null;
  total_jobs: number;
  new_postings: number;
  closed_postings: number;
  strategic_signal: string | null;
}

interface HiringSignalCardProps {
  signal: HiringSignal | null;
  careersUrl: string | null;
}

const formatTimeAgo = (dateStr: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default function HiringSignalCard({ signal, careersUrl }: HiringSignalCardProps) {
  if (!careersUrl && !signal) {
    return (
      <div className="rs-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={16} style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hiring Signals
          </h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Add a Careers URL in Data Sources to track hiring patterns and surface strategic moves.
        </p>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="rs-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hiring Signals
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border tag-amber">
            Pending first scan
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Careers URL is set. The next weekly scan will collect hiring data for this competitor.
        </p>
      </div>
    );
  }

  const lastUpdated = formatTimeAgo(signal.snapshot_at);

  return (
    <div className="rs-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hiring Signals
          </h3>
        </div>
        {lastUpdated && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Updated {lastUpdated}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded border border-[var(--border-default)] bg-[var(--fill-subtle)] px-3 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Open roles
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            {signal.total_jobs}
          </div>
        </div>
        <div className="rounded border border-[var(--tone-positive)]/20 bg-[var(--tone-positive)]/5 px-3 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--tone-positive)] mb-1 flex items-center gap-1">
            <TrendingUp size={9} /> New
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--tone-positive)]">
            {signal.new_postings}
          </div>
        </div>
        <div className="rounded border border-[var(--border-default)] bg-[var(--fill-subtle)] px-3 py-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1 flex items-center gap-1">
            <MinusCircle size={9} /> Closed
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {signal.closed_postings}
          </div>
        </div>
      </div>

      {signal.strategic_signal ? (
        <div className="rounded border border-sky-500/20 bg-sky-500/[0.04] p-4">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
            <AlertCircle size={11} />
            Pattern read
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {signal.strategic_signal}
          </p>
        </div>
      ) : (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          No strategic pattern detected this week — hiring is flat or stable.
        </p>
      )}
    </div>
  );
}
