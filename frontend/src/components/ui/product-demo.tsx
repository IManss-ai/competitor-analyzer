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
  // Demo recordings are named by the legacy theme (paper/ink) and show the
  // pre-shadcn UI; they need re-recording. Until then, map the new light/dark
  // value to the existing asset names.
  const demoVariant = theme === 'light' ? 'paper' : 'ink';
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
      {/* Ambient accent glow (decorative, behind the frame). Two stacked
          radial layers so the halo actually reads on the light paper theme,
          not just ink. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -inset-y-14 -z-10"
        style={{
          background:
            'radial-gradient(62% 58% at 50% 46%, color-mix(in oklch, var(--primary) 28%, transparent), transparent 70%), radial-gradient(42% 44% at 50% 44%, color-mix(in oklch, var(--primary) 28%, transparent), transparent 76%)',
          filter: 'blur(56px)',
        }}
      />

      {/* App window — soft lift so the frame has presence on paper-light
          (where the accent glow alone barely reads); glow carries it on ink. */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-background">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <div className="mx-auto flex max-w-xs flex-1 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="truncate font-mono text-[10px] tracking-wide text-muted-foreground">
              app.rivalscope.dev/command-center
            </span>
          </div>
          <span className="hidden font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline">
            Live
          </span>
        </div>

        {/* Recording (one <video> per theme so sources reload on switch).
            Source is 2× the display size, so the slow Ken Burns zoom stays crisp. */}
        <div className="relative aspect-[2600/1072] w-full overflow-hidden bg-muted">
          <motion.video
            key={demoVariant}
            ref={videoRef}
            className="absolute inset-0 h-full w-full"
            style={{ transformOrigin: '50% 45%' }}
            animate={reduced ? undefined : { scale: [1, 1.06, 1.06, 1] }}
            transition={reduced ? undefined : { duration: 30, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.55, 1] }}
            poster={`/demo/command-center-${demoVariant}.jpg`}
            muted
            loop
            playsInline
            autoPlay={!reduced}
            preload="metadata"
          >
            <source src={`/demo/command-center-${demoVariant}.webm`} type="video/webm" />
            <source src={`/demo/command-center-${demoVariant}.mp4`} type="video/mp4" />
          </motion.video>
        </div>
      </div>
    </motion.div>
  );
}
