'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUpVariants, staggerContainerVariants } from '@/lib/animations';

// Thin scroll-reveal wrappers for the server-component landing. Reuses the
// shared variants in lib/animations.ts so timing/easing stay consistent
// (fade + rise, --ease-smooth, no bounce — DESIGN.md compliant). Reduced
// motion is handled globally in globals.css (forces inline opacity:0 visible),
// so no per-instance guard is needed here.

const VIEWPORT = { once: true, margin: '0px 0px -80px 0px' } as const;

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  viewport,
}: {
  children: ReactNode;
  className?: string;
  // Above-the-fold groups (hero intel feed) must fire as soon as any pixel is
  // visible; the default -80px band leaves them hidden on small viewports.
  viewport?: { once?: boolean; margin?: string; amount?: 'some' | 'all' | number };
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport ?? VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  // No initial/whileInView: inherits the parent RevealGroup's state and staggers.
  return (
    <motion.div className={className} variants={fadeUpVariants}>
      {children}
    </motion.div>
  );
}
