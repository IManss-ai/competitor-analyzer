'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Phone } from 'lucide-react';

interface AnimatedHeroProps {
  titles?: string[];
}

function AnimatedHero({ titles }: AnimatedHeroProps) {
  const defaultTitles = useMemo(
    () => ['everything', 'pricing changes', 'new features', 'job postings', 'review trends'],
    []
  );

  const cyclingTitles = titles || defaultTitles;

  const [titleNumber, setTitleNumber] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleNumber((prev) => (prev + 1) % cyclingTitles.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [cyclingTitles]);

  return (
    <div className="w-full">
      <div className="flex gap-8 flex-col items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-colors cursor-pointer">
            We are live
            <Phone size={14} />
          </span>
        </div>
        <div className="flex gap-4 flex-col">
          <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
            <span className="text-white">Your competitors changed</span>
            <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
              &nbsp;
              {cyclingTitles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute font-semibold text-blue-400"
                  initial={{ opacity: 0, y: '-100' }}
                  transition={{ type: 'spring', stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? {
                          y: 0,
                          opacity: 1,
                        }
                      : {
                          y: titleNumber > index ? -150 : 150,
                          opacity: 0,
                        }
                  }
                >
                  {title}
                </motion.span>
              ))}
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed tracking-tight text-white/50 max-w-2xl text-center">
            Stop tracking competitors manually with browser bookmarks and Google Alerts.
            Competitor Analyzer monitors everything automatically and delivers a weekly Battle Card
            with exactly what changed and what to do about it.
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded border border-white/15 text-white/70 text-sm font-medium hover:border-white/30 hover:text-white transition-all">
            See a demo <Phone size={14} />
          </button>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">
            Start free trial <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnimatedHero;
