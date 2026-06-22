import Link from 'next/link';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] flex items-center px-6 font-sans">
      <div className="max-w-md mx-auto w-full">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded">
            <RivalscopeLogo size={13} className="text-sky-400" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)] font-mono tracking-tight">RIVALSCOPE</span>
        </div>

        {/* 404 */}
        <p className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-3">Error 404</p>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight mb-3">
          This page slipped off the radar.
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-10">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. Head back to a known signal.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-md bg-[var(--accent-cta)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] transition-colors"
          >
            <LayoutDashboard size={15} /> Back to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            <ArrowLeft size={15} /> Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
