'use client';

import { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiToken } from '@/lib/use-api-token';

/**
 * Hard-lock paywall shown over the app shell when the user's access_level is
 * "read_only" (their one free test is used and they aren't paying). Reads
 * behind it stay rendered; every action routes to Polar checkout.
 */
export default function PaywallOverlay({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiToken = useApiToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const upgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/v1/billing/checkout-url?plan=saas`, {
        headers: { Authorization: `Bearer ${apiToken ?? userId}` },
      });
      if (!res.ok) throw new Error('checkout unavailable');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-(--shadow-modal)">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Lock size={22} />
        </div>
        <h2 className="font-display text-[26px] leading-[1.1] tracking-[-0.01em] text-foreground">
          Your free test is done
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Upgrade to Pro for full, ongoing competitive intelligence. Billed today, full access instantly.
        </p>
        {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
        <Button onClick={upgrade} disabled={loading} size="lg" variant="cta" className="mt-6 w-full">
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Starting checkout…</>
          ) : (
            <>Upgrade to Pro · billed today <ArrowRight size={14} /></>
          )}
        </Button>
      </div>
    </div>
  );
}
