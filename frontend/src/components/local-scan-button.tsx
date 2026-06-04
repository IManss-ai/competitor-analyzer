'use client';

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';

interface LocalScanButtonProps {
  competitorId: string;
  userId: string;
}

export default function LocalScanButton({ competitorId, userId }: LocalScanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/local/scan/${competitorId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });
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
      <button
        onClick={handleScan}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-[#0a0a0a] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1a1a1a] transition-all disabled:opacity-50 cursor-pointer"
      >
        <MagnifyingGlass size={16} className={loading ? 'animate-spin' : ''} />
        Scan local competitors
      </button>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-[#0a0a0a] text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Local scan started — results ready in a few minutes
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
