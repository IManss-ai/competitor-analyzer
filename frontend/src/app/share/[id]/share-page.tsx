'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lightning,
  Warning,
  ChatText,
  Trophy,
  Copy,
  Check
} from '@phosphor-icons/react';

interface BattleCardData {
  title: string;
  what_changed: string[];
  weaknesses: string[];
  talking_points: string[];
  win_conditions: string[];
  share_token: string;
  generated_at: string;
  competitor_name: string;
  competitor_url: string;
}

export default function SharePage({ card }: { card: BattleCardData }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const formattedDate = new Date(card.generated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-[#171717]">
      {/* HEADER */}
      <header className="bg-white border-b border-[#e5e5e5] py-4 px-6 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-bold text-[#171717]">Intel</span>
              <span className="text-sm text-[#737373]">Battle Card</span>
            </div>
            <h1 className="text-xl font-semibold text-[#171717]">
              {card.competitor_name}
            </h1>
            <p className="text-xs text-[#737373]">
              Generated {formattedDate}
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            className="border border-[#e5e5e5] rounded-lg px-3 py-1.5 text-sm text-[#737373] hover:text-[#171717] hover:border-[#171717] transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy link
              </>
            )}
          </button>
        </div>
      </header>

      {/* BODY */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-2xl mx-auto py-8 px-4"
      >
        {/* WHAT CHANGED */}
        <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lightning size={16} className="text-[#2563eb]" weight="bold" />
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wide">
              What Changed
            </h2>
          </div>
          {card.what_changed.length === 0 ? (
            <p className="text-sm text-[#737373] italic">
              Your competitor has been quiet — no pricing or feature changes detected this week.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.what_changed.map((bullet, i) => (
                <li key={i} className="text-sm text-[#171717] leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* THEIR WEAKNESSES */}
        <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Warning size={16} className="text-[#2563eb]" weight="bold" />
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wide">
              Their Weaknesses
            </h2>
          </div>
          {card.weaknesses.length === 0 ? (
            <p className="text-sm text-[#737373] italic">
              No known complaints or weaknesses tracked.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.weaknesses.map((bullet, i) => (
                <li key={i} className="text-sm text-[#171717] leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* TALKING POINTS */}
        <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ChatText size={16} className="text-[#2563eb]" weight="bold" />
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wide">
              Your Talking Points
            </h2>
          </div>
          {card.talking_points.length === 0 ? (
            <p className="text-sm text-[#737373] italic">
              No talking points generated.
            </p>
          ) : (
            <ol className="space-y-2 list-decimal ml-4">
              {card.talking_points.map((point, i) => (
                <li key={i} className="text-sm text-[#171717] leading-relaxed">
                  {point}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* WIN CONDITIONS */}
        <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-[#2563eb]" weight="bold" />
            <h2 className="text-xs font-semibold text-[#171717] uppercase tracking-wide">
              Win Conditions
            </h2>
          </div>
          {card.win_conditions.length === 0 ? (
            <p className="text-sm text-[#737373] italic">
              No win conditions generated.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.win_conditions.map((bullet, i) => (
                <li key={i} className="text-sm text-[#171717] leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FOOTER */}
        <footer className="text-center pt-8 pb-16 border-t border-[#e5e5e5] mt-8">
          <p className="text-xs text-[#a3a3a3]">
            Powered by Competitor Analyzer
          </p>
          <p className="text-sm text-[#737373] mt-2">
            Track your competitors 24/7.{' '}
            <a
              href="/auth/login"
              className="text-[#2563eb] hover:underline font-medium"
            >
              Sign up free
            </a>
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
