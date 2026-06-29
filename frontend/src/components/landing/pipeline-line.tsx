'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

// Horizontal Connect -> Detect -> Win flow line. The accent segment draws across
// on view (pathLength). Hidden on mobile (steps stack; never a half-drawn line).
// Theme-aware: track uses --border, progress uses --primary.
export function PipelineLine() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });
  const reduce = useReducedMotion();

  return (
    <svg ref={ref} aria-hidden className="hidden h-1 w-full sm:block" viewBox="0 0 100 1" preserveAspectRatio="none">
      <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="var(--border)" strokeWidth="1" />
      <motion.line
        x1="0"
        y1="0.5"
        x2="100"
        y2="0.5"
        stroke="var(--primary)"
        strokeWidth="1"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: reduce ? 1 : inView ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
