'use client';

import { useState } from 'react';
import { useMounted } from '@/lib/use-mounted';
import { motion } from 'motion/react';
import { Zap, AlertTriangle, MessageSquare, Trophy, Copy, Check } from 'lucide-react';
import { battleCardItemText } from '@/components/battle-card-content';

interface BattleCardData {
  title: string;
  what_changed: (string | { type: string; text: string })[];
  weaknesses: string[];
  talking_points: string[];
  win_conditions: string[];
  share_token: string;
  generated_at: string;
  competitor_name: string;
  competitor_url: string;
  is_baseline?: boolean;
}

export default function SharePage({ card }: { card: BattleCardData }) {
  const [copied, setCopied] = useState(false);
  // Gate the locale-formatted date so SSR matches first client render (#418).
  const mounted = useMounted();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const formattedDate = mounted ? new Date(card.generated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* HEADER */}
      <header
        className="py-4 px-6 sticky top-0 z-10 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--background) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Intel</span>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Battle Card</span>
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {card.competitor_name}
            </h1>
            <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
              Generated {formattedDate}
            </p>
          </div>

          <button onClick={handleCopyLink} className="rs-btn-ghost text-[13px]">
            {copied ? (
              <>
                <Check size={14} style={{ color: 'var(--tone-positive)' }} />
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
        <section className="rs-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--foreground)' }}>
              What Changed
            </h2>
          </div>
          {card.is_baseline ? (
            <p className="text-sm italic" style={{ color: 'var(--muted-foreground)' }}>
              Baseline captured — no changes recorded yet. New changes appear here after the next scan.
            </p>
          ) : card.what_changed.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--muted-foreground)' }}>
              Your competitor has been quiet — no pricing or feature changes detected this week.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.what_changed
                .map((bullet) => battleCardItemText(bullet))
                .filter(Boolean)
                .map((text, i) => (
                  <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {text}
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* THEIR WEAKNESSES */}
        <section className="rs-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: 'var(--tone-danger)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--foreground)' }}>
              Their Weaknesses
            </h2>
          </div>
          {card.weaknesses.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--muted-foreground)' }}>
              No known complaints or weaknesses tracked.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.weaknesses
                .map((bullet) => battleCardItemText(bullet))
                .filter(Boolean)
                .map((text, i) => (
                  <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {text}
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* TALKING POINTS */}
        <section className="rs-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} style={{ color: 'var(--tone-warning)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--foreground)' }}>
              Your Talking Points
            </h2>
          </div>
          {card.talking_points.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--muted-foreground)' }}>
              No talking points generated.
            </p>
          ) : (
            <ol className="space-y-2 list-decimal ml-4">
              {card.talking_points
                .map((point) => battleCardItemText(point))
                .filter(Boolean)
                .map((text, i) => (
                  <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {text}
                  </li>
                ))}
            </ol>
          )}
        </section>

        {/* WIN CONDITIONS */}
        <section className="rs-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} style={{ color: 'var(--tone-positive)' }} />
            <h2 className="text-xs font-semibold uppercase tracking-wide font-mono" style={{ color: 'var(--foreground)' }}>
              Win Conditions
            </h2>
          </div>
          {card.win_conditions.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--muted-foreground)' }}>
              No win conditions generated.
            </p>
          ) : (
            <ul className="list-disc ml-4 space-y-2">
              {card.win_conditions
                .map((bullet) => battleCardItemText(bullet))
                .filter(Boolean)
                .map((text, i) => (
                  <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                    {text}
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* FOOTER */}
        <footer className="text-center pt-8 pb-16 mt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            Powered by Rivalscope
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Track your competitors 24/7.{' '}
            <a href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up free
            </a>
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
