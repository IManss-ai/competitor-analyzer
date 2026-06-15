'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/lib/use-theme';

/**
 * ProductDemo — a framed "app window" playing a screen recording of the live
 * Command Center, wrapped in an ambient slate-blue glow. Theme-aware: swaps the
 * paper/ink recording to match the current theme. Plays only while in view.
 */
export default function ProductDemo() {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Play only while scrolled into view (perf + intentional "it's alive" moment).
  useEffect(() => {
    const el = wrapRef.current;
    const vid = videoRef.current;
    if (!el || !vid || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) vid.play().catch(() => {});
        else vid.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, theme]);

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -120px 0px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-5xl"
    >
      {/* Ambient accent glow (decorative, behind the frame) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 45%, var(--accent-glow), transparent 72%)',
          filter: 'blur(48px)',
        }}
      />

      {/* App window */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-2.5 bg-[var(--surface-base)]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="mx-auto flex max-w-xs flex-1 items-center justify-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--fill-subtle)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="truncate font-mono text-[10px] tracking-wide text-[var(--text-muted)]">
              app.rivalscope.com/command-center
            </span>
          </div>
          <span className="hidden font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] sm:inline">
            Live
          </span>
        </div>

        {/* Recording (one <video> per theme so sources reload on switch) */}
        <div className="relative aspect-[1280/536] w-full bg-[var(--surface-raised)]">
          <video
            key={theme}
            ref={videoRef}
            className="absolute inset-0 h-full w-full"
            poster={`/demo/command-center-${theme}.jpg`}
            muted
            loop
            playsInline
            autoPlay={!reduced}
            preload="metadata"
          >
            <source src={`/demo/command-center-${theme}.webm`} type="video/webm" />
            <source src={`/demo/command-center-${theme}.mp4`} type="video/mp4" />
          </video>
        </div>
      </div>
    </motion.div>
  );
}
