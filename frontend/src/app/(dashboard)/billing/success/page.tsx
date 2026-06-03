import Link from 'next/link';
import { CheckCircle, ArrowRight } from '@phosphor-icons/react/dist/ssr';

export default function BillingSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white border border-[#e5e5e5] rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="mx-auto w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={36} weight="fill" className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight mb-3">You're all set!</h1>
        <p className="text-sm text-[#525252] mb-8 leading-relaxed">
          Your 14-day trial has started. You'll receive your first intelligence digest next Monday. Welcome to Competitor Analyzer Pro.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] active:scale-[0.98] transition-all"
        >
          Go to dashboard
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
