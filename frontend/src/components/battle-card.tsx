'use client';

import { useState } from 'react';
import { useMounted } from '@/lib/use-mounted';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, X } from 'lucide-react';
import BattleCardContent, { BattleCardData, normalizeBattleCard } from './battle-card-content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MotionButton = motion.create(Button);

interface BattleCardProps {
  competitorId: string;
  competitorName: string;
  userId: string;
}

export default function BattleCard({ competitorId, competitorName, userId }: BattleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardData, setCardData] = useState<BattleCardData | null>(null);
  const shouldReduceMotion = useReducedMotion();
  // Gate the locale-formatted timestamp so SSR matches first client render (#418).
  const mounted = useMounted();

  const generateCard = async () => {
    setIsOpen(true);
    if (cardData) return; // Already generated

    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/battlecards/generate/${competitorId}`, {
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate Battle Card');
      }

      const raw = await res.json();
      setCardData(normalizeBattleCard(raw));
    } catch {
      setError('We could not generate this Battle Card right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MotionButton
        variant="outline"
        size="sm"
        onClick={generateCard}
        className="flex items-center gap-2 text-xs font-semibold"
        whileTap={{ scale: 0.99 }}
      >
        <Zap size={13} className="text-primary" />
        <span>Battle Card</span>
      </MotionButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 15 }}
              className="w-full max-w-2xl shadow-xl relative my-8 bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-border bg-muted">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Zap className="text-primary" size={18} />
                      {competitorName} Battle Card
                      {cardData?.variant === 'local' && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 h-auto rounded-sm"
                        >
                          Local intel
                        </Badge>
                      )}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-wider">
                      {cardData?.variant === 'local'
                        ? 'Reviews + social + reputation read'
                        : 'Page changes + reviews + hiring read'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <X size={15} />
                  </Button>
                </div>
                {cardData && (
                  <div className="text-[9px] font-mono text-muted-foreground mt-3">
                    GENERATED AT: {mounted ? new Date(cardData.generated_at).toLocaleString().toUpperCase() : ''}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-h-[200px] flex flex-col justify-center">
                <BattleCardContent cardData={cardData} loading={loading} error={error} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
