'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { ArrowRight, CheckCircle2, TrendingUp, ArrowUpRight, Copy, Check, ChevronDown } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { Github } from '@/components/ui/brand-icons';
import { PricingBasic } from '@/components/ui/pricing-demo';
import { HeroRotatingWord } from '@/components/ui/hero-rotating-word';
import { fadeUpVariants } from '@/lib/animations';
import HowItWorksPanels from '@/components/ui/how-it-works-panels';
import ProductDemo from '@/components/ui/product-demo';
import ThemeToggle from '@/components/theme-toggle';

const MotionLink = motion.create(Link);

// ─── Data ────────────────────────────────────────────────────────────────────

const FEED = [
  { company: 'Stripe', action: 'Removed flat pricing from enterprise pages', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Increased card processing fees to 3.49%', time: '6h ago', type: 'pricing' },
  { company: 'Braintree', action: 'Launched new bio-auth checkouts API v4', time: '1d ago', type: 'feature' },
  { company: 'Square', action: 'Changed POS hero to "Complete retail platform"', time: '2d ago', type: 'messaging' },
  { company: 'Adyen', action: 'Added 3 enterprise retail case studies', time: '3d ago', type: 'content' },
];

const TAG_STYLE: Record<string, string> = {
  pricing:   'tag-amber border',
  feature:   'tag-green border',
  copy:      'tag-blue border',
  messaging: 'tag-violet border',
  content:   'bg-[var(--fill-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]',
};

const BATTLE_CARDS_DATA = {
  stripe: {
    company: 'Stripe',
    logoColor: 'bg-sky-600',
    date: 'Updated today',
    changes: [
      { tag: 'pricing', tc: 'tag-amber', text: 'Removed enterprise flat-rates. Custom contract quote required.' },
      { tag: 'feature', tc: 'tag-green', text: 'Released Stripe Checkout v4.1 with optimized redirect latency.' },
      { tag: 'copy',    tc: 'tag-blue', text: 'Hero updated from "Payments infrastructure" to "Financial operations for global companies".' },
    ],
    complaints: [
      { text: '"Support responses took 4 days. Blocked our payment gateway migration."', source: 'Trustpilot · 1 star · 2 days ago' },
      { text: '"Completely opaque enterprise pricing after their recent site update."', source: 'G2 · 2 stars · 5 days ago' },
    ],
    signals: [
      { bold: '4 Enterprise Sales roles', rest: ' posted in UK & EMEA. Major market expansion incoming.' },
      { bold: 'VP of Payments Partnerships', rest: ' hired. Preparing channel partner sales program.' },
    ],
    moves: [
      'Lead EMEA sales conversations highlighting flat-rate pricing advantage.',
      'Add "24h instant Slack/phone support" to your landing page hero.',
      'Deploy a dedicated "Stripe Comparison & Migration Guide" page to capture enterprise churn.',
    ],
    hiring: { total: 47, new: 6, closed: 2, read: 'Six new Enterprise Sales and Solutions Engineer roles in EMEA. A clear upmarket push.' },
  },
  paypal: {
    company: 'PayPal',
    logoColor: 'bg-blue-600',
    date: 'Updated yesterday',
    changes: [
      { tag: 'pricing', tc: 'tag-amber', text: 'Increased merchant checkout card processing fee from 2.9% to 3.49%.' },
      { tag: 'feature', tc: 'tag-green', text: 'Integrated bio-auth verification directly inside the checkout iframe.' },
      { tag: 'copy',    tc: 'tag-blue', text: 'Hero copy focused on "Instant conversion optimization" rather than "Send money".' },
    ],
    complaints: [
      { text: '"Sandbox environment API endpoints timeout continuously during test mock run."', source: 'Developer Forum · 3 days ago' },
      { text: '"Merchant fees rose unexpectedly without a clear email warning beforehand."', source: 'Reddit · 4 stars · 1 day ago' },
    ],
    signals: [
      { bold: 'Patent filed', rest: ' for mobile device biometric tokenization system. Focus on mobile SDK.' },
      { bold: 'Developer Advocate', rest: ' hired in APAC. Recruiting developer portal testers.' },
    ],
    moves: [
      'Target PayPal developers with ads promoting a 99.9% sandbox uptime guarantee.',
      'Highlight "No hidden percentage increases, simple flat rates" in your checkout flows.',
      'Write blog post "Why developer sandbox speed is critical for product launch".',
    ],
    hiring: { total: 31, new: 3, closed: 4, read: 'Heavy applied-ML and mobile SDK hiring. A biometric-checkout product launch is imminent.' },
  },
  square: {
    company: 'Square',
    logoColor: 'bg-[var(--text-muted)]',
    date: 'Updated 2 days ago',
    changes: [
      { tag: 'pricing',   tc: 'tag-amber', text: 'Flat rate subscription fee changed to dynamic pricing on point-of-sale.' },
      { tag: 'feature',   tc: 'tag-green', text: 'Launched POS v3 firmware with offline sync capabilities for retail terminals.' },
      { tag: 'messaging', tc: 'tag-violet', text: 'Hero changed from "Simple local commerce" to "The complete software & hardware platform".' },
    ],
    complaints: [
      { text: '"Terminals disconnect from local Wi-Fi during peak sales hours."', source: 'App Store · 2 stars · 6 hours ago' },
      { text: '"Contract lock-ins make it impossible to upgrade outdated hardware."', source: 'Capterra · 3 stars · 4 days ago' },
    ],
    signals: [
      { bold: 'UK Retail Director', rest: ' hired. Launching hardware distribution partnerships.' },
      { bold: 'New POS terminal firmware', rest: ' registered in FCC database with 5G fallback.' },
    ],
    moves: [
      'Offer UK local shops zero-contract terminal rentals to target locked-in users.',
      'Advertise "Dual-band Wi-Fi backup POS terminal integration" to counter connection drops.',
      'Target Square merchants with "Contract-free hardware replacement program".',
    ],
    hiring: { total: 22, new: 4, closed: 1, read: 'Four new UK retail partnership and hardware roles in two weeks. European expansion is funded.' },
  },
  adyen: {
    company: 'Adyen',
    logoColor: 'bg-emerald-700',
    date: 'Updated 1 day ago',
    changes: [
      { tag: 'pricing', tc: 'tag-amber', text: 'Changed EMEA support tiers and custom POS redirect APIs' },
      { tag: 'messaging', tc: 'tag-violet', text: 'Focusing on enterprise custom integrations. Small merchant SLA support shifted to ticket system.' },
    ],
    complaints: [],
    signals: [],
    moves: ['Target mid-market merchants looking for dedicated phone support lines.'],
    hiring: null,
  },
};

const COMP_CHANGE_COUNTS: Record<string, number> = { stripe: 3, paypal: 1, square: 2, adyen: 1 };

const navItems = [
  { label: 'How it works', href: '#how-it-works', key: 'how-it-works' },
  { label: 'Command Center', href: '#dashboard-showcase', key: 'dashboard-showcase' },
  { label: 'Battle Cards', href: '#battle-card', key: 'battle-card' },
  { label: 'Pricing', href: '#pricing', key: 'pricing' },
];

const SPRING = { stiffness: 280, damping: 28, mass: 0.8 };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeComp, setActiveComp] = useState<'stripe' | 'paypal' | 'square'>('stripe');
  const [selectedDashboardComp, setSelectedDashboardComp] = useState<'stripe' | 'paypal' | 'square' | 'adyen'>('stripe');
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredDashComp, setHoveredDashComp] = useState<'stripe' | 'paypal' | 'square' | 'adyen' | null>(null);
  const [hoveredBattleTab, setHoveredBattleTab] = useState<'stripe' | 'paypal' | 'square' | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [commandCenterInView, setCommandCenterInView] = useState(false);
  const [metricCounters, setMetricCounters] = useState([0, 0, 0]);

  const commandCenterRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll progress for top bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  // Parallax for hero panel
  const { scrollY } = useScroll();
  const heroPanelY = useTransform(scrollY, [0, 500], [0, -40]);
  const heroTextY = useTransform(scrollY, [0, 500], [0, 20]);

  // Lenis smooth scroll
  useEffect(() => {
    let lenis: any;
    import('@studio-freight/lenis').then(({ default: Lenis }) => {
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
      const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    });
    return () => lenis?.destroy();
  }, []);

  // Competitor auto-rotate
  useEffect(() => {
    const comps = ['stripe', 'paypal', 'square', 'adyen'] as const;
    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      setSelectedDashboardComp((c) => comps[(comps.indexOf(c) + 1) % comps.length]);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Command center counter animation
  useEffect(() => {
    const el = commandCenterRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting && !commandCenterInView) setCommandCenterInView(true); }, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [commandCenterInView]);

  useEffect(() => {
    if (!commandCenterInView) return;
    const targets = [4, 3, 2];
    const duration = 1300;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setMetricCounters(targets.map((v) => Math.round(e * v)));
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [commandCenterInView]);

  const currentCard = BATTLE_CARDS_DATA[activeComp];

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-base)] text-[var(--text-primary)] font-sans overflow-x-hidden antialiased">

      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX, transformOrigin: '0%' }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-sky-500 z-[60] origin-left"
      />

      <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none" />

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-5xl rounded-md border px-5 py-2.5 flex items-center justify-between transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled
              ? 'bg-[var(--surface-base)]/90 border-[var(--border-default)] shadow-[0_1px_0_0_var(--hairline)] backdrop-blur-xl'
              : 'bg-[var(--surface-base)]/60 border-[var(--border-subtle)] backdrop-blur-md'
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-sky-500/15 border border-sky-500/30 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/25 transition-colors">
              <RivalscopeLogo size={13} className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Rivalscope</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[11px] font-medium text-[var(--text-secondary)]">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onMouseEnter={() => setHoveredNav(item.key)}
                onMouseLeave={() => setHoveredNav(null)}
                className="relative py-1 hover:text-[var(--text-primary)] transition-colors duration-200"
              >
                <span>{item.label}</span>
                {hoveredNav === item.key && (
                  <motion.span
                    layoutId="navHover"
                    className="absolute bottom-0 left-0 right-0 h-px bg-sky-400 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth/login" className="hidden sm:block text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 whitespace-nowrap">
              Sign in
            </Link>
            <MotionLink
              href="/auth/login"
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent-primary)] text-white px-4 py-1.5 rounded hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
            >
              Get started <ArrowRight size={10} />
            </MotionLink>
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              whileTap={{ scale: 0.97 }}
              className="md:hidden flex flex-col gap-1 items-center justify-center w-11 h-11 rounded bg-[var(--fill-subtle)] hover:bg-[var(--fill-subtle-hover)] transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`w-3.5 h-0.5 bg-[var(--text-primary)] transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`w-3.5 h-0.5 bg-[var(--text-primary)] transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </motion.button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[var(--surface-base)]/95 backdrop-blur-xl flex flex-col justify-center px-8 md:hidden"
          >
            <div className="flex flex-col gap-5">
              {[...navItems, { label: 'Sign in', href: '/auth/login', key: 'signin' }].map((item, i) => (
                <motion.div key={item.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}>
                  <Link href={item.href} onClick={() => setMenuOpen(false)} className="text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors inline-block">
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-28 pb-24 lg:pt-32 lg:pb-28 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: copy */}
            <motion.div style={{ y: heroTextY }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-sky-500/15 border border-sky-500/40 rounded px-4 py-2 mb-8"
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0"
                />
                <span className="text-xs font-mono text-sky-500 tracking-wide font-semibold">Real-time competitor intelligence</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="text-[52px] sm:text-[72px] lg:text-[88px] font-medium tracking-[-0.02em] leading-[1.0] mb-6 text-[var(--text-primary)]"
              >
                Know every competitor
                <br className="hidden sm:block" />
                <HeroRotatingWord
                  words={['move.', 'price change.', 'launch.', 'pivot.', 'new hire.']}
                  className="text-sky-400"
                  interval={2400}
                />
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-md mb-8"
              >
                Track pricing, features, and reviews in real time. Get AI battle cards to win every deal.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8"
              >
                <MotionLink
                  href="/auth/login"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  transition={SPRING}
                  className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white font-semibold text-sm px-6 py-3 rounded hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Start 2-day free trial <ArrowRight size={12} />
                </MotionLink>
                <a
                  href="#dashboard-showcase"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-3"
                >
                  See a live demo <ArrowRight size={12} className="opacity-50" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="flex items-center gap-5 text-xs text-[var(--text-muted)]"
              >
                {['No card required', 'Cancel anytime', '5 min setup'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-sky-500" /> {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: live intel feed */}
            <motion.div
              style={{ y: heroPanelY }}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md hover:border-[var(--border-strong)] transition-colors duration-300 overflow-hidden shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-sky-400" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Intel Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 border-b border-[var(--border-default)]">
                  {[{ v: '5', l: 'tracked' }, { v: '12', l: 'changes / wk' }, { v: '3', l: 'alerts' }].map((s, i) => (
                    <div key={s.l} className="px-4 py-3" style={i > 0 ? { borderLeft: '1px solid var(--border-subtle)' } : undefined}>
                      <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] leading-none">{s.v}</div>
                      <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] mt-1.5">{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 space-y-1">
                  {FEED.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-3 px-3 py-2.5 rounded hover:bg-[var(--fill-subtle-hover)] transition-colors cursor-default"
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type] || TAG_STYLE.content}`}>
                        {item.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{item.company}</span>
                        <span className="text-xs text-[var(--text-secondary)] ml-1.5 leading-snug">{item.action}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap flex-shrink-0 pt-0.5">{item.time}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center justify-between bg-[var(--fill-subtle-hover)]">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">5 competitors tracked</span>
                  <Link href="/auth/login" className="text-[11px] font-mono text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                    View full feed <ArrowUpRight size={10} />
                  </Link>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── PRODUCT DEMO ─────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 lg:pb-24 -mt-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -80px 0px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">
              See it work
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1]">
              Every competitor move, in one command center.
            </h2>
          </motion.div>
          <ProductDemo />
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="py-20 border-y border-[var(--border-subtle)] bg-[var(--surface-raised)]/25"
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { value: 'Every 4h', label: 'scan frequency' },
            { value: '7', label: 'competitors per plan' },
            { value: '5 min', label: 'setup time' },
            { value: 'Monday', label: 'weekly playbook' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -80px 0px' }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-2"
            >
              <div className="text-[28px] sm:text-[36px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight leading-none whitespace-nowrap">
                {stat.value}
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-[0.1em]">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-raised)] relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={0}
            className="mb-16"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">01 · How it works</p>
            <h2 className="text-[44px] lg:text-[64px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
              From change detection<br className="hidden md:block" /> to sales playbook in hours.
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-lg leading-relaxed">
              No SDKs. No permissions. We crawl public competitor pages and turn them into action.
            </p>
          </motion.div>
          <HowItWorksPanels />
        </div>
      </section>

      {/* ── COMMAND CENTER ───────────────────────────────────────────────────── */}
      <section id="dashboard-showcase" ref={commandCenterRef} className="scroll-mt-24 py-24 px-6 bg-[var(--surface-base)] relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={0}
            className="mb-12"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">02 · Command Center</p>
            <h2 className="text-[44px] lg:text-[64px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
              The Intelligence<br className="hidden md:block" /> Command Center
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-md leading-relaxed">
              Every competitor movement in one view: pricing, reviews, and AI playbooks.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={1}
            className="border border-[var(--border-default)] rounded-md hover:border-sky-500/25 transition-colors duration-300 overflow-hidden shadow-[var(--shadow-card-hover)] bg-[var(--surface-raised)]"
          >
            <div className="grid md:grid-cols-[200px_1fr] min-h-[480px]">

              {/* Sidebar */}
              <div
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => { isPausedRef.current = false; }}
                className="border-r border-[var(--border-default)] p-4 space-y-6"
              >
                <div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-3">Tracked</div>
                  <div className="space-y-1">
                    {(['stripe', 'paypal', 'square', 'adyen'] as const).map((comp) => (
                      <motion.button
                        key={comp}
                        onClick={() => setSelectedDashboardComp(comp)}
                        onMouseEnter={() => setHoveredDashComp(comp)}
                        onMouseLeave={() => setHoveredDashComp(null)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded font-medium flex items-center justify-between transition-colors cursor-pointer relative"
                        style={{ color: selectedDashboardComp === comp ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {selectedDashboardComp === comp && (
                          <motion.div layoutId="activeDashTab" className="absolute inset-0 bg-sky-500/10 border border-sky-500/20 rounded" transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }} />
                        )}
                        <span className="capitalize relative z-10">{comp}</span>
                        {COMP_CHANGE_COUNTS[comp] > 0 ? (
                          <span className={`flex-shrink-0 min-w-[18px] px-1 py-0.5 rounded text-[8px] font-bold font-mono relative z-10 text-center transition-colors ${selectedDashboardComp === comp ? 'bg-sky-500/20 text-sky-300 border border-sky-500/25' : 'bg-[var(--fill-subtle)] text-[var(--text-muted)]'}`}>
                            {COMP_CHANGE_COUNTS[comp]}
                          </span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full relative z-10 transition-colors ${selectedDashboardComp === comp ? 'bg-sky-400' : 'bg-[var(--border-strong)]'}`} />
                        )}
                        <AnimatePresence>
                          {hoveredDashComp === comp && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.95 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] px-3 py-2 rounded-lg shadow-[var(--shadow-elevated)] text-[10px] w-48 pointer-events-none"
                            >
                              <p className="leading-snug font-normal">
                                {comp === 'stripe' && 'Removed flat enterprise pricing'}
                                {comp === 'paypal' && 'Merchant card fee increased to 3.49%'}
                                {comp === 'square' && 'POS dynamic checkout fee update'}
                                {comp === 'adyen' && 'Changed EMEA SLA & redirect APIs'}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--border-default)]">
                  <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">Scan rate</div>
                  <div className="text-[10px] text-sky-300 font-mono bg-sky-500/8 border border-sky-500/15 px-2.5 py-1.5 rounded inline-block">Every 4 hours</div>
                </div>
              </div>

              {/* Main panel */}
              <div className="p-5 flex flex-col justify-between overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedDashboardComp}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
                    exit={{ opacity: 0, x: -8, transition: { duration: 0.15, ease: 'easeIn' } }}
                    className="flex-1 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 mb-5">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <TrendingUp size={14} className="text-sky-400" />
                          Intel Feed
                          <span className="text-[var(--text-muted)] font-normal text-xs">· last scan 8m ago</span>
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">Live</span>
                          </div>
                          <span className="text-[10px] font-mono bg-[var(--fill-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] px-2.5 py-1 rounded">ALL</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Monitored', unit: 'targets', color: 'text-[var(--text-primary)]', trend: null, idx: 0 },
                          { label: 'Changes', unit: 'this week', color: 'text-sky-400', trend: '↑ +2', trendColor: 'text-sky-400', idx: 1 },
                          { label: 'Plays', unit: 'ready', color: 'text-emerald-400', trend: '↑ new', trendColor: 'text-emerald-400', idx: 2 },
                        ].map((s) => (
                          <div key={s.label} className="bg-[var(--fill-subtle-hover)] border border-[var(--border-subtle)] p-3 rounded">
                            <div className="text-[9px] font-mono text-[var(--text-muted)] mb-1">{s.label.toUpperCase()}</div>
                            <div className={`text-sm font-bold font-mono ${s.color} flex items-baseline gap-1`}>
                              <motion.span
                                key={`${selectedDashboardComp}-${s.idx}-${commandCenterInView}`}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: s.idx * 0.05 }}
                              >
                                {metricCounters[s.idx]}
                              </motion.span>
                              <span className="text-[10px] font-normal text-[var(--text-muted)]">{s.unit}</span>
                            </div>
                            {s.trend && <div className={`text-[9px] font-mono mt-1 ${s.trendColor}`}>{s.trend}</div>}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 mb-3">
                        <AnimatePresence mode="popLayout">
                          {BATTLE_CARDS_DATA[selectedDashboardComp].changes.map((change, i) => (
                            <motion.div
                              key={`${selectedDashboardComp}-change-${i}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.22, ease: 'easeOut' } }}
                              exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                              className="bg-[var(--fill-subtle-hover)] border border-[var(--border-subtle)] p-3 rounded"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${change.tc}`}>{change.tag.toUpperCase()}</span>
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">{i === 0 ? 'today' : i === 1 ? '2d ago' : '4d ago'}</span>
                              </div>
                              <p className="text-[11px] text-[var(--text-primary)] leading-snug">{change.text}</p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="border border-sky-500/15 bg-sky-500/[0.03] p-4 rounded flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-mono text-sky-400 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 size={9} /> SUGGESTED PLAYBOOK
                          </div>
                          <p className="text-xs text-[var(--text-primary)] leading-snug">{BATTLE_CARDS_DATA[selectedDashboardComp].moves[0]}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setCopiedPlaybook(true); setTimeout(() => setCopiedPlaybook(false), 2000); }}
                          className="flex-shrink-0 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/18 border border-sky-500/25 text-sky-400 font-mono text-[10px] rounded transition-colors flex items-center gap-1.5 cursor-pointer min-w-[95px] justify-center"
                        >
                          <AnimatePresence mode="wait">
                            {copiedPlaybook ? (
                              <motion.span key="copied" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-1">
                                <Check size={10} className="text-emerald-400" /> Copied
                              </motion.span>
                            ) : (
                              <motion.span key="copy" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-1">
                                <Copy size={10} /> Copy script
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                      <span>4 pages · 2 API routes · 1 docs path monitored</span>
                      <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                        Export Battle Card <ArrowUpRight size={9} />
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── BATTLE CARDS ─────────────────────────────────────────────────────── */}
      <section id="battle-card" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-base)] relative">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <motion.div
              variants={fadeUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '0px 0px -100px 0px' }}
              custom={0}
            >
              <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">03 · Battle Cards</p>
              <h2 className="text-[44px] lg:text-[64px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-[1.1] mb-3 text-balance">
                Explore a live<br className="hidden md:block" /> Battle Card
              </h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm leading-relaxed">Four quadrants, refreshed every Monday.</p>
            </motion.div>

            <div className="flex p-1 bg-[var(--fill-subtle)] border border-[var(--border-default)] rounded-md gap-0.5 flex-shrink-0">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <motion.button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  onMouseEnter={() => setHoveredBattleTab(comp)}
                  onMouseLeave={() => setHoveredBattleTab(null)}
                  className="text-xs font-semibold px-4 py-1.5 rounded-md transition-colors cursor-pointer relative"
                  style={{ color: activeComp === comp ? 'var(--accent-text)' : 'var(--text-muted)' }}
                >
                  {hoveredBattleTab === comp && activeComp !== comp && (
                    <motion.div layoutId="battleTabHover" className="absolute inset-0 bg-[var(--fill-subtle-hover)] rounded-md" transition={{ duration: 0.16 }} />
                  )}
                  {activeComp === comp && (
                    <motion.div layoutId="activeBattleTab" className="absolute inset-0 bg-sky-600 rounded-md" transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }} />
                  )}
                  <span className="relative z-10 capitalize">{comp}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={1}
            className="border border-[var(--border-default)] rounded-md hover:border-[var(--border-strong)] transition-colors duration-300 overflow-hidden bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]"
          >
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded ${currentCard.logoColor} flex items-center justify-center`}>
                  <RivalscopeLogo size={13} className="text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">{currentCard.company} Battle Card</h4>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">Weekly synthesis</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{currentCard.date}</span>
            </div>

            {currentCard.hiring && (
              <div className="px-5 py-4 border-b border-[var(--border-default)] bg-[var(--fill-subtle)]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Hiring</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold font-mono text-[var(--text-primary)]">{currentCard.hiring.total}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">open</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold font-mono text-emerald-400">+{currentCard.hiring.new}</span>
                      <span className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-wider">new</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold font-mono text-[var(--text-secondary)]">−{currentCard.hiring.closed}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">closed</span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-snug text-[var(--text-primary)] italic max-w-md">
                    <span className="text-sky-400 not-italic font-mono uppercase tracking-wider text-[9px] mr-1.5">Pattern</span>
                    {currentCard.hiring.read}
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activeComp} className="grid md:grid-cols-2 divide-x divide-y divide-[var(--border-subtle)]">
                {[
                  { label: 'Detected changes', color: 'text-sky-400', bg: 'bg-sky-500/8', border: 'border-sky-500/15', content: currentCard.changes.map((c, j) => (
                    <div key={j} className="flex gap-2.5 items-start">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0 mt-0.5 border ${c.tc}`}>{c.tag}</span>
                      <span className="text-xs text-[var(--text-primary)] leading-snug">{c.text}</span>
                    </div>
                  )) },
                  { label: 'User complaints', color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15', content: currentCard.complaints.map((c, j) => (
                    <div key={j} className="pl-0 space-y-1">
                      <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed min-h-[32px]">{c.text}</p>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1 block">{c.source}</span>
                    </div>
                  )) },
                  { label: 'Strategic signals', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15', content: currentCard.signals.map((s, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">›</span>
                      <p className="text-xs text-[var(--text-primary)] leading-snug"><strong>{s.bold}</strong>{s.rest}</p>
                    </div>
                  )) },
                  { label: 'Playbook actions', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15', content: currentCard.moves.map((move, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.16, delay: 0.05 + j * 0.05 }} className="text-emerald-400 flex-shrink-0 mt-0.5">
                        <CheckCircle2 size={14} />
                      </motion.div>
                      <span className="text-xs text-[var(--text-primary)] leading-snug">{move}</span>
                    </div>
                  )) },
                ].map((q, qi) => (
                  <motion.div
                    key={qi}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: qi * 0.06 }}
                    className="p-5 hover:bg-[var(--fill-subtle)] transition-colors"
                  >
                    <div className={`text-[10px] font-mono uppercase tracking-widest ${q.color} ${q.bg} border ${q.border} px-2.5 py-1 rounded-md inline-flex mb-4`}>
                      {q.label}
                    </div>
                    <div className="space-y-3">{q.content}</div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-base)] relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={0}
            className="mb-3"
          >
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-md inline-block">
              Pricing
            </span>
          </motion.div>
          <PricingBasic />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[var(--surface-base)] relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={0}
            className="border border-sky-500/25 bg-[var(--surface-raised)] rounded-md px-10 py-16 text-center"
          >
            <h2 className="text-[40px] sm:text-[52px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-4 text-balance">
              Start tracking competitor<br className="hidden sm:block" /> movements today.
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-sm mx-auto leading-relaxed mb-10">
              2-day free trial. Monitor up to 7 competitors. Cancel with one click.
            </p>
            <MotionLink
              href="/auth/login"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              className="inline-flex items-center gap-2.5 bg-[var(--accent-primary)] text-white font-semibold px-8 py-3.5 rounded hover:bg-[var(--accent-hover)] transition-colors text-sm"
            >
              <span>Start free trial</span>
              <ArrowRight size={13} />
            </MotionLink>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-5">No credit card required · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-default)] py-14 px-6 bg-[var(--surface-base)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-10 mb-10 border-b border-[var(--border-default)]">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded">
                  <RivalscopeLogo size={11} className="text-sky-400" />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">Rivalscope</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
                AI-driven competitive intelligence that tracks pricing, reviews, and messaging shifts so you can act before the next sales call.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</h4>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {[{ label: 'How it works', href: '#how-it-works' }, { label: 'Command Center', href: '#dashboard-showcase' }, { label: 'Battle Card', href: '#battle-card' }].map((l) => (
                  <li key={l.label}><a href={l.href} className="hover:text-[var(--text-primary)] transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">Sources</h4>
              <ul className="space-y-2 text-xs text-[var(--text-muted)]">
                {['Google Reviews', 'G2 & Trustpilot', 'Landing pages', 'Public metadata'].map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">Links</h4>
              <ul className="space-y-2 text-xs text-[var(--text-muted)]">
                <li><a href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</a></li>
                <li><a href="mailto:manssjones@gmail.com" className="hover:text-[var(--text-primary)] transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              &copy; {new Date().getFullYear()} Rivalscope. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[var(--text-muted)]">
              <a href="https://github.com/IManss-ai/competitor-analyzer" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-[var(--text-primary)] transition-colors">
                <Github size={14} />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
