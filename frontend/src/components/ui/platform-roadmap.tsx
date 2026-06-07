'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Globe, Search, Zap, FileText, Check, Loader2 } from 'lucide-react';

const PATHS = ['/pricing', '/docs/api', '/changelog'];
const BULLETS = [
  'Pricing changed · +14%',
  '3 new complaints · support',
  'Recommended: run campaign',
];

// ─── STEP 1 PREVIEW ──────────────────────────────────────────────────────────
function Step1Preview({ isHovered }: { isHovered: boolean }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isHovered) {
      queueMicrotask(() => setText(''));
      return;
    }

    let active = true;
    const run = async () => {
      while (active) {
        setText('');
        await new Promise((r) => setTimeout(r, 400));
        const target = 'stripe.com';
        for (let i = 1; i <= target.length; i++) {
          if (!active) return;
          setText(target.slice(0, i));
          await new Promise((r) => setTimeout(r, 120));
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center px-4 font-mono text-[11px]">
      <div className="bg-[var(--surface-base)] border border-white/[0.08] rounded-md p-2.5 flex items-center gap-1.5 shadow-inner">
        <span className="text-zinc-500 select-none">https://</span>
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-sky-400 font-medium truncate">{text}</span>
          <span className="w-[1.5px] h-3 bg-sky-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2 PREVIEW ──────────────────────────────────────────────────────────
function Step2Preview({ isHovered }: { isHovered: boolean }) {
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  useEffect(() => {
    if (!isHovered) {
      queueMicrotask(() => setActiveIndices([]));
      return;
    }
    let active = true;
    const run = async () => {
      while (active) {
        setActiveIndices([]);
        for (let i = 0; i < PATHS.length; i++) {
          if (!active) return;
          await new Promise((r) => setTimeout(r, 800));
          if (!active) return;
          setActiveIndices((prev) => [...prev, i]);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center px-4 gap-2 font-mono text-[10px]">
      {PATHS.map((path, idx) => {
        const isDone = activeIndices.includes(idx);
        const isCurrent = activeIndices.length === idx;
        return (
          <div
            key={path}
            className="flex items-center justify-between border-b border-white/[0.02] pb-1.5 last:border-0 last:pb-0"
          >
            <span
              className={
                isDone ? 'text-zinc-300' : isCurrent ? 'text-sky-400' : 'text-zinc-600'
              }
            >
              {path}
            </span>
            <div className="flex items-center gap-1.5">
              {isDone ? (
                <Check size={12} className="text-emerald-400" strokeWidth={3} />
              ) : isCurrent ? (
                <Loader2 size={12} className="text-sky-400 animate-spin" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 3 PREVIEW ──────────────────────────────────────────────────────────
function Step3Preview({ isHovered }: { isHovered: boolean }) {
  const [phase, setPhase] = useState(0); // 0: initial, 1: strike, 2: green appear

  useEffect(() => {
    if (!isHovered) {
      queueMicrotask(() => setPhase(0));
      return;
    }
    let active = true;
    const run = async () => {
      while (active) {
        setPhase(0);
        await new Promise((r) => setTimeout(r, 500));
        if (!active) return;
        setPhase(1); // draw red line
        await new Promise((r) => setTimeout(r, 800));
        if (!active) return;
        setPhase(2); // fade in green
        await new Promise((r) => setTimeout(r, 2500));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center px-4 gap-2.5 font-mono text-[10px]">
      <div className="relative inline-block self-start">
        <span
          className={`transition-colors duration-300 ${
            phase >= 1 ? 'text-red-500/50' : 'text-zinc-400'
          }`}
        >
          Pro plan: $100/mo
        </span>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1.5px] bg-red-500 origin-left"
        />
      </div>

      <div className="min-h-[20px]">
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-emerald-400 font-semibold flex items-center gap-1.5"
            >
              <span>+ Pro plan: $130/mo</span>
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded text-emerald-400 font-normal">
                +30%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── STEP 4 PREVIEW ──────────────────────────────────────────────────────────
function Step4Preview({ isHovered }: { isHovered: boolean }) {
  const [rows, setRows] = useState<number>(0);

  useEffect(() => {
    if (!isHovered) {
      queueMicrotask(() => setRows(0));
      return;
    }
    let active = true;
    const run = async () => {
      while (active) {
        setRows(0);
        for (let i = 1; i <= 3; i++) {
          if (!active) return;
          await new Promise((r) => setTimeout(r, 600));
          if (!active) return;
          setRows(i);
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center px-3 font-mono text-[9px]">
      <div className="bg-[var(--surface-base)] border border-white/[0.08] rounded-md p-2 shadow-lg">
        <div className="text-[9px] font-semibold text-white mb-1.5 flex items-center gap-1">
          <span className="text-sky-400">⚡</span> Weekly Intel
        </div>
        <div className="space-y-1">
          {BULLETS.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: rows > i ? 1 : 0, x: rows > i ? 0 : -4 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5 text-zinc-400"
            >
              <div className="w-1 h-1 rounded-full bg-sky-500/60" />
              <span className="truncate">{b}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function PlatformRoadmap() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'center center'],
  });

  const scaleX1 = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
  const scaleX2 = useTransform(scrollYProgress, [0.4, 0.7], [0, 1]);
  const scaleX3 = useTransform(scrollYProgress, [0.7, 1.0], [0, 1]);

  const scaleYMobile = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);

  const steps = [
    {
      title: 'Add competitor URLs',
      icon: Globe,
      description: 'Paste up to 7 competitor domains. We handle the rest — no credentials, no SDK, no setup.',
      renderPreview: (hovered: boolean) => <Step1Preview isHovered={hovered} />,
    },
    {
      title: 'We crawl their full surface',
      icon: Search,
      description: 'We scan pricing pages, landing copy, docs, job boards, and G2/Trustpilot reviews every 4 hours.',
      renderPreview: (hovered: boolean) => <Step2Preview isHovered={hovered} />,
    },
    {
      title: 'AI detects what changed',
      icon: Zap,
      description: 'Diffs are analyzed by AI. Only meaningful changes — pricing tier edits, new complaints, messaging shifts.',
      renderPreview: (hovered: boolean) => <Step3Preview isHovered={hovered} />,
    },
    {
      title: 'Playbook in your inbox Monday',
      icon: FileText,
      description: 'Every Monday morning, a brief with competitor intel and your exact response scripts.',
      renderPreview: (hovered: boolean) => <Step4Preview isHovered={hovered} />,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="roadmap"
      className="py-24 px-6 bg-[var(--surface-base)] relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-[40px] lg:text-[54px] font-bold tracking-tight text-white leading-[1.1] mb-5"
          >
            How the platform works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-zinc-400 text-sm max-w-lg mx-auto"
          >
            From the moment you add a competitor URL to your Monday morning playbook.
          </motion.p>
        </div>

        {/* Steps container */}
        <div className="relative">
          {/* Connecting lines for Desktop */}
          <div className="absolute top-[41px] left-0 w-full h-[2px] hidden md:block z-0 pointer-events-none">
            {/* Segment 1 */}
            <div className="absolute left-[calc(12.5%-12px)] right-[calc(62.5%+4px)] h-full bg-white/[0.04]">
              <motion.div
                style={{ scaleX: scaleX1 }}
                className="h-full bg-gradient-to-r from-sky-500/20 to-sky-500/40 origin-left"
              />
              {hoveredIdx === 0 && (
                <motion.div
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                />
              )}
            </div>

            {/* Segment 2 */}
            <div className="absolute left-[calc(37.5%-4px)] right-[calc(37.5%-4px)] h-full bg-white/[0.04]">
              <motion.div
                style={{ scaleX: scaleX2 }}
                className="h-full bg-gradient-to-r from-sky-500/30 to-sky-500/40 origin-left"
              />
              {hoveredIdx === 1 && (
                <motion.div
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                />
              )}
            </div>

            {/* Segment 3 */}
            <div className="absolute left-[calc(62.5%+4px)] right-[calc(12.5%-12px)] h-full bg-white/[0.04]">
              <motion.div
                style={{ scaleX: scaleX3 }}
                className="h-full bg-gradient-to-r from-sky-500/40 to-sky-500/50 origin-left"
              />
              {hoveredIdx === 2 && (
                <motion.div
                  initial={{ left: '0%', opacity: 0 }}
                  animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                />
              )}
            </div>
          </div>

          {/* Connecting line for Mobile */}
          <div className="absolute left-[37px] top-10 bottom-10 w-[2px] bg-white/[0.04] md:hidden z-0 pointer-events-none">
            <motion.div
              style={{ scaleY: scaleYMobile }}
              className="w-full h-full bg-gradient-to-b from-sky-500/20 via-sky-500/40 to-sky-500/50 origin-top"
            />
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-4 gap-8 relative z-10 justify-items-center">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isHovered = hoveredIdx === idx;
              return (
                <motion.div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 24 }}
                  viewport={{ once: true, amount: 0.08 }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  animate={isHovered ? { y: -3 } : { y: 0 }}
                  className={`bg-[var(--surface-raised)] border rounded-xl p-5 pl-16 md:pl-5 flex flex-col gap-4 transition-colors duration-300 cursor-pointer select-none relative w-full md:max-w-[280px] ${
                    isHovered ? 'border-[var(--border-strong)]' : 'border-[var(--border-default)]'
                  }`}
                >
                  {/* Circle Node Container */}
                  <div className="absolute left-4 top-5 md:relative md:left-auto md:top-auto md:flex md:justify-center">
                    <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 relative z-10">
                      <Icon size={16} />
                      <span className="absolute -top-1 -right-1 bg-sky-400 text-[#040812] font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center select-none shadow-[0_2px_4px_rgba(56,189,248,0.25)]">
                        {idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div className="flex flex-col gap-1.5 text-left md:text-center">
                    <h3 className="text-sm font-semibold text-white leading-tight">
                      {step.title}
                    </h3>
                    <p className="text-zinc-400 text-[12px] leading-relaxed line-clamp-3">
                      {step.description}
                    </p>
                  </div>

                  {/* Mini-Preview Panel */}
                  <div className="h-[120px] bg-[var(--surface-base)] border border-white/[0.06] rounded-xl overflow-hidden relative mt-auto">
                    {step.renderPreview(isHovered)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
