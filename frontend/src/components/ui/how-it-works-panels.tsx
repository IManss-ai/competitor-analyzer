'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Check, CheckCircle2, Zap, Mail, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cardHoverVariants, fadeUpVariants } from '@/lib/animations';

// ─── TYPES & VARIANTS ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 22,
    },
  },
};

// ─── PANEL 1: ADD COMPETITOR URLS ───────────────────────────────────────────

function PanelOneMockup({ isHovered }: { isHovered: boolean }) {
  const [text1, setText1] = useState('');
  const [showCheck1, setShowCheck1] = useState(false);
  const [text2, setText2] = useState('');
  const [showCheck2, setShowCheck2] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      queueMicrotask(() => {
        setText1('');
        setShowCheck1(false);
        setText2('');
        setShowCheck2(false);
        setShowBadge(false);
      });
      return;
    }

    let active = true;
    const runSequence = async () => {
      while (active) {
        setText1('');
        setShowCheck1(false);
        setText2('');
        setShowCheck2(false);
        setShowBadge(false);

        // Type "stripe.com"
        const str1 = 'stripe.com';
        for (let i = 1; i <= str1.length; i++) {
          if (!active) return;
          await new Promise((r) => setTimeout(r, 60));
          setText1(str1.slice(0, i));
        }

        if (!active) return;
        await new Promise((r) => setTimeout(r, 200));
        setShowCheck1(true);

        if (!active) return;
        await new Promise((r) => setTimeout(r, 450));

        // Type "paypal.com"
        const str2 = 'paypal.com';
        for (let i = 1; i <= str2.length; i++) {
          if (!active) return;
          await new Promise((r) => setTimeout(r, 60));
          setText2(str2.slice(0, i));
        }

        if (!active) return;
        await new Promise((r) => setTimeout(r, 200));
        setShowCheck2(true);

        if (!active) return;
        await new Promise((r) => setTimeout(r, 400));
        setShowBadge(true);

        // Loop pause
        await new Promise((r) => setTimeout(r, 3000));
      }
    };

    runSequence();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center p-5 bg-[var(--surface-raised)] border border-white/[0.08] rounded-xl relative overflow-hidden">
      <div className="space-y-3 relative z-10">
        {/* Row 1 */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.12] rounded-lg px-3 py-2.5">
          <span className="text-[10px] text-zinc-400 font-mono">domain:</span>
          <div className="flex-1 flex items-center text-xs text-white font-mono min-h-[16px]">
            {text1}
            {isHovered && !showCheck1 && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-1 h-3.5 bg-sky-400 ml-0.5"
              />
            )}
          </div>
          <AnimatePresence>
            {showCheck1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-emerald-400"
              >
                <CheckCircle2 size={13} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Row 2 */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.12] rounded-lg px-3 py-2.5">
          <span className="text-[10px] text-zinc-400 font-mono">domain:</span>
          <div className="flex-1 flex items-center text-xs text-white font-mono min-h-[16px]">
            {text2}
            {isHovered && showCheck1 && !showCheck2 && (
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-1 h-3.5 bg-sky-400 ml-0.5"
              />
            )}
          </div>
          <AnimatePresence>
            {showCheck2 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-emerald-400"
              >
                <CheckCircle2 size={13} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute bottom-4 right-4 z-20">
        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              className="bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-[9px] px-2 py-1 rounded-md flex items-center gap-1.5 shadow-md"
            >
              <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" />
              2 competitors added
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-sky-950/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// ─── PANEL 2: AI SCANS EVERYTHING ───────────────────────────────────────────

function PanelTwoMockup({ isHovered }: { isHovered: boolean }) {
  const [scanStep, setScanStep] = useState(0);

  const baseUrls = ['pricing_page.html', '/docs/api', '/blog/changelog'];
  const hoverUrls = ['/enterprise-tiers', '/api/v2/checkout', '/news/announcements'];
  const urls = isHovered ? hoverUrls : baseUrls;

  useEffect(() => {
    let active = true;
    const intervalTime = isHovered ? 700 : 1400;

    const runScan = async () => {
      while (active) {
        setScanStep(0);
        await new Promise((r) => setTimeout(r, intervalTime));
        if (!active) return;
        setScanStep(1);
        await new Promise((r) => setTimeout(r, intervalTime));
        if (!active) return;
        setScanStep(2);
        await new Promise((r) => setTimeout(r, intervalTime));
        if (!active) return;
        setScanStep(3);
        await new Promise((r) => setTimeout(r, intervalTime * 2));
      }
    };

    runScan();
    return () => {
      active = false;
    };
  }, [isHovered]);

  return (
    <div className="w-full h-full flex items-center gap-5 p-5 bg-[var(--surface-raised)] border border-white/[0.08] rounded-xl relative overflow-hidden">
      {/* Radar Section */}
      <div className="w-16 h-16 rounded-full border border-white/[0.08] relative flex items-center justify-center flex-shrink-0 bg-white/[0.01]">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            stroke="#3f6a9c"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="176"
            animate={{ strokeDashoffset: [176, 0] }}
            transition={{
              duration: isHovered ? 1.5 : 3.0,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </svg>

        {/* Radar Rotating Line */}
        <motion.div
          style={{ originX: '50%', originY: '50%' }}
          animate={{ rotate: 360 }}
          transition={{
            duration: isHovered ? 1.2 : 2.4,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute w-14 h-14 rounded-full flex items-center justify-start pointer-events-none"
        >
          <div className="w-1/2 h-[1px] bg-gradient-to-r from-sky-400 via-sky-500/20 to-transparent" />
        </motion.div>

        <Zap size={14} className="text-sky-400 animate-pulse relative z-10" />
      </div>

      {/* URL Stream Section */}
      <div className="flex-1 space-y-1.5 font-mono text-[9px] min-w-0">
        {urls.map((url, i) => {
          const isScanned = scanStep > i;
          return (
            <div
              key={url}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-all duration-200 ${
                isScanned
                  ? 'bg-sky-950/20 border-sky-500/25 text-sky-300'
                  : 'bg-white/[0.04] border-white/[0.10] text-zinc-400'
              }`}
            >
              <motion.span
                animate={{
                  backgroundColor: isScanned ? '#6a96c8' : '#3f3f46',
                }}
                className="w-1.5 h-1.5 rounded-full"
              />
              <span className="truncate flex-1">{url}</span>
              {isScanned && (
                <span className="text-[8px] text-sky-400/80 font-semibold flex-shrink-0">
                  SCANNED
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-tr from-sky-950/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// ─── PANEL 3: PLAYBOOK DELIVERED ────────────────────────────────────────────

function PanelThreeMockup({ isHovered }: { isHovered: boolean }) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isHovered) {
      queueMicrotask(() => {
        setAnimKey((prev) => prev + 1);
      });
    }
  }, [isHovered]);

  return (
    <div className="w-full h-full flex flex-col justify-center p-5 bg-[var(--surface-raised)] border border-white/[0.08] rounded-xl relative overflow-hidden">
      <motion.div
        key={animKey}
        animate={isHovered ? { y: -4 } : { y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-[var(--surface-base)] border border-white/[0.10] rounded-xl p-4 shadow-xl relative"
      >
        {/* Folded corner effect mock */}
        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-sky-950 border-l border-b border-white/[0.12] rounded-bl-sm pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Zap size={11} />
          </div>
          <span className="text-[10px] font-bold text-white font-mono">Stripe Weekly Intel</span>
        </div>

        {/* Bullet rows */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {[
            { tag: 'pricing', text: 'Pricing changed · +14%', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
            { tag: 'support', text: '3 new complaints · support', color: 'text-red-400 border-red-500/20 bg-red-500/5' },
            { tag: 'play', text: 'Action: run EMEA email campaign', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
          ].map((row, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="flex items-center gap-2 text-[9px]"
            >
              <span className={`px-1.5 py-0.5 rounded border text-[8px] font-mono font-medium ${row.color}`}>
                {row.tag}
              </span>
              <span className="text-zinc-300 truncate">{row.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Envelope stamp icon */}
        <div className="absolute bottom-2.5 right-2.5 text-sky-500/40">
          <Mail size={12} className="animate-pulse" />
        </div>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-tr from-sky-950/5 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function HowItWorksPanels() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const steps = [
    {
      n: '01',
      title: 'Add competitor URLs',
      body: 'Paste domains of up to 7 competitors. We automatically map their full digital footprint with no scripts, API keys, or access privileges required.',
      renderMockup: (hovered: boolean) => <PanelOneMockup isHovered={hovered} />,
    },
    {
      n: '02',
      title: 'AI scans everything',
      body: 'Our crawlers review landing code, pricing plans, documentation repositories, social profiles, and review sites every 4 hours to index mutations.',
      renderMockup: (hovered: boolean) => <PanelTwoMockup isHovered={hovered} />,
    },
    {
      n: '03',
      title: 'Playbook delivered every Monday',
      body: 'Synthesized summaries map exactly what changed. Receive customized sales playbooks, competitor comparison grids, and script guides.',
      renderMockup: (hovered: boolean) => <PanelThreeMockup isHovered={hovered} />,
    },
  ];

  return (
    <div ref={containerRef} className="relative max-w-4xl mx-auto pl-8 md:pl-16 pr-2">
      {/* Scroll-animated vertical gradient line */}
      <div className="absolute left-4 md:left-8 top-6 bottom-6 w-[2px] bg-white/[0.04] rounded-full pointer-events-none">
        <motion.div
          style={{ scaleY, transformOrigin: 'top' }}
          className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 rounded-full"
        />
      </div>

      <div className="space-y-10">
        {steps.map((step, idx) => {
          const isHovered = hoveredIndex === idx;

          return (
            <motion.div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              variants={fadeUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0 }}
              custom={idx}
              className="relative flex flex-col md:flex-row gap-6 md:gap-10 items-stretch"
            >
              {/* Left Side: Node Circle (floating offset to vertical line) */}
              <div className="absolute left-[-15px] md:left-[-31px] -translate-x-1/2 top-4 z-20 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: isHovered ? 1.15 : 1,
                    borderColor: isHovered ? '#6a96c8' : 'rgba(79, 124, 176, 0.2)',
                    backgroundColor: isHovered ? '#040a18' : 'rgba(79, 124, 176, 0.05)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full border bg-[#040812] flex items-center justify-center text-xs md:text-sm font-mono font-bold text-sky-400"
                >
                  {step.n}
                </motion.div>
              </div>

              {/* Panel Horizontal Card */}
              <motion.div
                variants={cardHoverVariants}
                whileHover="hover"
                initial="rest"
                className="flex-1 grid md:grid-cols-[1.2fr_1fr] bg-[var(--surface-raised)] border border-white/[0.18] rounded-xl p-6 md:p-8 gap-6 md:gap-8 hover:border-sky-500/30 shadow-xl transition-all duration-300 cursor-pointer"
              >
                {/* Left card content */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-zinc-300 text-sm leading-relaxed md:max-w-sm">
                      {step.body}
                    </p>
                  </div>

                  <div className="mt-6 md:mt-8">
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Learn details <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>

                {/* Right card mockup */}
                <div className="h-[150px] md:h-[170px] w-full relative">
                  {step.renderMockup(isHovered)}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
