'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

// reducedMotion="user" makes motion/react snap transform-based animations to
// their final state for users with prefers-reduced-motion, while keeping gentle
// opacity fades. Wraps the landing so every reveal respects the OS setting.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
