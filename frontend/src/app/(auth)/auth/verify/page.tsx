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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
      <div className="rounded-md p-8 max-w-sm w-full text-center" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
        <h1 className="text-lg font-semibold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>Verifying your link</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Please wait while we securely sign you in.</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
        <div className="rounded-md p-8 max-w-sm w-full text-center" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
