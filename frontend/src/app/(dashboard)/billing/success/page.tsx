import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function BillingSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-heading font-bold text-zinc-900 mb-2">Payment successful!</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Your subscription is now active. You have full access to all features.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
