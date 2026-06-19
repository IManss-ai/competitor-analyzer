import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function BillingSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="rs-card p-10 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-[var(--tone-positive)]/10 border border-[var(--tone-positive)]/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={36} style={{ color: 'var(--tone-positive)' }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>You&apos;re all set!</h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Your 2-day trial has started. You&apos;ll receive your first intelligence digest next Monday. Welcome to Rivalscope Pro.
        </p>
        <Link
          href="/dashboard"
          className="rs-btn-primary w-full cursor-pointer"
        >
          Go to dashboard
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
