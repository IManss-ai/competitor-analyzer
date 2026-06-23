'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-8 pb-8">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <h1 className="text-lg font-semibold mb-2 tracking-tight text-foreground">Verifying your link</h1>
          <p className="text-sm text-muted-foreground">Please wait while we securely sign you in.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8">
            <Loader2 size={32} className="animate-spin mx-auto mb-4 text-primary" />
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
