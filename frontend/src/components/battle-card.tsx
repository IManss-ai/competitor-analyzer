'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightning, Spinner, X, CheckCircle } from '@phosphor-icons/react';

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
    } catch (err) {
      setError('Could not generate Battle Card. Make sure Anthropic API Key is set.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={generateCard}
        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
      >
        <Lightning weight="bold" />
        Battle Card
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111] border border-blue-500/30 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(37,99,235,0.15)] overflow-hidden relative"
            >
              {/* Header */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-50" />
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lightning className="text-blue-400" weight="fill" />
                    {competitorName} Battle Card
                  </h3>
                  <p className="text-xs text-white/40 mt-1 font-mono">Generated weekly via Claude AI</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 min-h-[200px] flex flex-col">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/50 space-y-4">
                    <Spinner size={32} className="animate-spin text-blue-500" />
                    <p className="text-sm font-medium animate-pulse">Analyzing competitor changes...</p>
                  </div>
                ) : error ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-red-400/80 space-y-2">
                    <X size={32} />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-4">
                      Your Action Plan
                    </h4>
                    <ul className="space-y-4">
                      {actions.map((action, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10"
                        >
                          <CheckCircle size={18} weight="fill" className="text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-white/90 leading-snug">{action}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
