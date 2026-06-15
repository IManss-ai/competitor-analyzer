'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * Animates a number from its previous value up to `value` on mount and on
 * change. Crisp, on-brand easing (no bounce). Collapses to the final value
 * under prefers-reduced-motion.
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 0.8,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce, duration]);

  return <>{display.toFixed(decimals)}</>;
}
