'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionToken = searchParams.get('session_token');
    
    if (!sessionToken) {
      router.replace('/auth/login?error=missing_token');
      return;
    }

    // Small delay to ensure the spinner is visible to user
    const timer = setTimeout(() => {
      router.replace(`/api/auth/callback?session_token=${encodeURIComponent(sessionToken)}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="bg-white border border-[#e5e5e5] rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        <Loader2 size={32} className="text-[#0a0a0a] animate-spin mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-[#0a0a0a] mb-2 tracking-tight">Verifying your link</h1>
        <p className="text-sm text-[#525252]">Please wait while we securely sign you in.</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
        <div className="bg-white border border-[#e5e5e5] rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <Loader2 size={32} className="text-[#0a0a0a] animate-spin mx-auto mb-4" />
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
