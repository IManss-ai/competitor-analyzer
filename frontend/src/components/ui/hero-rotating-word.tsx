'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroRotatingWordProps {
  words: string[];
  interval?: number;
  className?: string;
}

export function HeroRotatingWord({
  words,
  interval = 2400,
  className = '',
}: HeroRotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  const chars = useMemo(() => {
    return Array.from(words[index] ?? '');
  }, [words, index]);

  return (
    <span className="inline-flex items-baseline overflow-hidden" aria-live="polite" aria-label={words[index]}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className={`inline-flex ${className}`}
          aria-hidden="true"
        >
          {chars.map((char, i) => (
            <motion.span
              key={`${index}-${i}`}
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{
                duration: 0.35,
                delay: i * 0.022,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block will-change-transform"
            >
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
