'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApiToken } from '@/lib/use-api-token';
import { Button } from '@/components/ui/button';

interface LocalScanButtonProps {
  competitorId: string;
  userId: string;
}

export default function LocalScanButton({ competitorId, userId }: LocalScanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const apiToken = useApiToken();
  const router = useRouter();

  const handleScan = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/local/scan/${competitorId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken ?? userId}`,
        },
      });
      if (res.status === 402) {
        // Free test consumed → re-run the server layout so the paywall surfaces
        // (soft nav won't otherwise re-render the gated server components).
        router.refresh();
        return;
      }
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleScan}
        disabled={loading}
      >
        <Search size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Scanning…' : 'Scan local competitors'}
      </Button>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 text-[13px] font-medium rounded-xl border border-border bg-card text-foreground"
            style={{
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <span className="status-dot-active" />
            Local scan started — results ready in a few minutes
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
