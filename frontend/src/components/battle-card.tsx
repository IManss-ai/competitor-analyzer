'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Loader2, X, CheckCircle2 } from 'lucide-react';

interface BattleCardProps {
  competitorId: string;
  competitorName: string;
  userId: string;
}

export default function BattleCard({ competitorId, competitorName, userId }: BattleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actions, setActions] = useState<string[]>([]);

  const generateCard = async () => {
    setIsOpen(true);
    if (actions.length > 0) return; // Already generated

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

      const data = await res.json();
      setActions(data.actions || []);
    } catch {
      setError('Could not generate Battle Card. Make sure Anthropic API Key is set.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.03, y: -0.5 }}
        whileTap={{ scale: 0.97 }}
        onClick={generateCard}
        className="px-3.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200/60 cursor-pointer"
      >
        <Zap  size={13} className="text-blue-500" />
        <span>Battle Card</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              className="p-1 bg-white/[0.04] border border-white/10 rounded-[2rem] w-full max-w-lg shadow-2xl relative"
            >
              {/* Inner Core */}
              <div className="bg-[#08080c] border border-white/5 rounded-[calc(2rem-0.25rem)] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/[0.06] bg-black/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="text-blue-400"  size={18} />
                      {competitorName} Battle Card
                    </h3>
                    <p className="text-[10px] text-white/30 mt-1 font-mono uppercase tracking-wider">generated via Claude AI</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[200px] flex flex-col justify-center">
                  {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/50 space-y-4 py-8">
                      <Loader2 size={28} className="animate-spin text-blue-500" />
                      <p className="text-xs font-mono uppercase tracking-wider animate-pulse">Analyzing competitor moves...</p>
                    </div>
                  ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-400/80 space-y-2 py-8 text-center">
                      <X size={28} className="text-red-500" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-5">
                        Your Action Plan
                      </h4>
                      <ul className="space-y-4">
                        {actions.map((action, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-start gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10"
                          >
                            <CheckCircle2 size={16}  className="text-blue-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-white/80 leading-relaxed">{action}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
