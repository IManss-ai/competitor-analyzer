'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, ChevronDown } from 'lucide-react';
import { useApiToken } from '@/lib/use-api-token';
import { isAbortError } from '@/lib/fetch-utils';
import HeadToHead from '@/components/head-to-head';
import BattleCardContent, { BattleCardData, normalizeBattleCard } from '@/components/battle-card-content';

// The report the user already earned, shown at the top of the returning-user
// dashboard so it never "evaporates" after onboarding. Reads /battlecards/latest
// — a pure cache read that never triggers a paid generation — so it's safe to
// mount on every dashboard load for both full and read_only users. Renders
// nothing when the user has no cached AI card yet (fresh account, pre-scan).
export default function LatestReport({ userId }: { userId: string }) {
  const apiToken = useApiToken();
  const [card, setCard] = useState<BattleCardData | null>(null);
  const [headToHead, setHeadToHead] = useState<any>(null);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/battlecards/latest`, {
          headers: { Authorization: `Bearer ${apiToken ?? userId}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { card: raw } = await res.json();
        if (!raw) return;
        setCard(normalizeBattleCard(raw));
        setHeadToHead(raw.head_to_head ?? null);
        setName(raw.competitor_name ?? '');
      } catch (e) {
        if (!isAbortError(e)) console.error(e);
      }
    })();
    return () => controller.abort();
  }, [userId, apiUrl, apiToken]);

  if (!card) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-border bg-muted px-6 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
            <FileText size={15} />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-foreground">
              Your latest report{name ? ` on ${name}` : ''}
            </span>
            <span className="block text-[11px] text-muted-foreground">Saved from your battle card, re-checked weekly.</span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {headToHead && (
            <div className="p-6 pb-0">
              <HeadToHead data={headToHead} competitorName={name} />
            </div>
          )}
          <BattleCardContent cardData={card} loading={false} error="" />
        </>
      )}
    </motion.section>
  );
}
