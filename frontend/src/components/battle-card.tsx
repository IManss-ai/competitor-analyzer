'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, X } from 'lucide-react';
import BattleCardContent, { BattleCardData, normalizeBattleCard } from './battle-card-content';

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
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={generateCard}
        className="px-3 py-2 bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] rounded text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center gap-2 transition-colors cursor-pointer"
      >
        <Zap size={13} className="text-sky-400" />
        <span>Battle Card</span>
      </motion.button>

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
              className="p-1 bg-[var(--fill-subtle-hover)] border border-[var(--border-default)] w-full max-w-2xl shadow-[var(--shadow-modal)] relative my-8"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              {/* Inner Core */}
              <div className="bg-[var(--surface-overlay)] border border-[var(--border-subtle)] overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-default)] bg-[var(--fill-subtle)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Zap className="text-sky-400" size={18} />
                        {competitorName} Battle Card
                        {cardData?.variant === 'local' && (
                          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 border tag-green" style={{ borderRadius: 'var(--radius-sm)' }}>
                            Local intel
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono uppercase tracking-wider">
                        {cardData?.variant === 'local'
                          ? 'Reviews + social + reputation read'
                          : 'Page changes + reviews + hiring read'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  {cardData && (
                    <div className="text-[9px] font-mono text-[var(--text-muted)] mt-3">
                      GENERATED AT: {new Date(cardData.generated_at).toLocaleString().toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-h-[200px] flex flex-col justify-center">
                  <BattleCardContent cardData={cardData} loading={loading} error={error} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
