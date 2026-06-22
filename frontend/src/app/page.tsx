'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, MotionConfig } from 'motion/react';
import { ArrowRight, CheckCircle2, TrendingUp, ArrowUpRight, Copy, Check, ChevronDown } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { Github } from '@/components/ui/brand-icons';
import { PricingBasic } from '@/components/ui/pricing-demo';
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
  { label: 'Product', href: '#product', key: 'product' },
  { label: 'Pricing', href: '#pricing', key: 'pricing' },
];

const SPRING = { stiffness: 280, damping: 28, mass: 0.8 };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeComp, setActiveComp] = useState<'stripe' | 'paypal' | 'square'>('stripe');
  const [productTab, setProductTab] = useState<'dashboard' | 'card'>('dashboard');
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredBattleTab, setHoveredBattleTab] = useState<'stripe' | 'paypal' | 'square' | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
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

  // Scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentCard = BATTLE_CARDS_DATA[activeComp];

  return (
    <MotionConfig reducedMotion="user">
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
          className={`w-full max-w-5xl rounded-md border px-5 py-3 flex items-center justify-between transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled
              ? 'bg-[var(--surface-base)]/90 border-[var(--border-default)] shadow-[0_1px_0_0_var(--hairline)] backdrop-blur-xl'
              : 'bg-[var(--surface-base)]/60 border-[var(--border-subtle)] backdrop-blur-md'
          }`}
        >
          <Link href="/" className="flex items-center min-h-[44px] gap-3 group">
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
                className="relative py-2 hover:text-[var(--text-primary)] transition-colors duration-200"
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
            <Link href="/auth/login" className="hidden sm:inline-flex items-center min-h-[44px] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 whitespace-nowrap">
              Sign in
            </Link>
            <MotionLink
              href="/auth/login"
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center min-h-[44px] gap-2 text-xs font-semibold bg-[var(--accent-cta)] text-[var(--accent-text)] px-4 rounded hover:bg-[var(--accent-cta-hover)] transition-colors whitespace-nowrap"
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
                  <Link href={item.href} onClick={() => setMenuOpen(false)} className="text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors inline-flex items-center min-h-[44px] py-1">
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-36 lg:pb-24 px-6 overflow-hidden">
        {/* Signature gradient — the one glow moment per view */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-16 w-[860px] max-w-[130vw] h-[480px] z-0"
          style={{ background: 'radial-gradient(ellipse at center, var(--accent-glow), transparent 60%)' }}
        />

        {/* Centered hero copy */}
        <motion.div style={{ y: heroTextY }} className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded px-4 py-2 mb-8"
          >
            <span className="sr-pulse" />
            <span className="text-[11px] font-mono text-sky-500 tracking-[0.14em] uppercase font-semibold">Live competitor intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="text-[40px] sm:text-[64px] lg:text-[84px] font-medium tracking-[-0.045em] leading-[0.98] text-[var(--text-primary)] text-balance max-w-[16ch]"
          >
            Know what your rivals change. <span className="text-sky-500">Win the deal anyway.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.13, ease: [0.16, 1, 0.3, 1] }}
            className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-2xl mt-6"
          >
            Rivalscope watches your competitors' pricing, features, messaging, reviews and hiring around the clock — then hands your sales team the exact play to win the next deal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-2xl text-left mt-10"
          >
            {[
              'Track pricing, feature & messaging changes, 24/7',
              'See what their customers complain about on G2 & Trustpilot',
              'Catch hiring & strategy signals before they go public',
              'Get a ready-to-send sales play for every move',
            ].map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-primary)] leading-snug">{b}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.27, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center gap-3 mt-10"
          >
            <MotionLink
              href="/auth/login"
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              transition={SPRING}
              className="inline-flex items-center gap-2 bg-[var(--accent-cta)] text-[var(--accent-text)] font-semibold text-sm px-6 py-3 rounded hover:bg-[var(--accent-cta-hover)] transition-colors"
            >
              Start free trial <ArrowRight size={13} />
            </MotionLink>
            <a
              href="#product"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-3"
            >
              See a live battle card <ArrowRight size={12} className="opacity-50" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.34 }}
            className="flex items-center gap-5 text-xs text-[var(--text-muted)] mt-6 font-mono"
          >
            {['No card required', 'Cancel anytime', '5-min setup'].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-sky-500" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Product protagonist — the real live Intel Feed, framed */}
        <motion.div
          style={{ y: heroPanelY }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto mt-16 relative z-10"
        >
          <div className="relative bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-lg overflow-hidden">
            {/* blue top-edge accent line */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)' }} />
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-sky-400" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Intel Feed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="sr-pulse" />
                <span className="text-[10px] font-mono text-sky-500 uppercase tracking-wider">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-[var(--border-default)]">
              {[{ v: '5', l: 'tracked' }, { v: '12', l: 'changes / wk' }, { v: '3', l: 'alerts' }].map((s, i) => (
                <div key={s.l} className="px-4 py-3" style={i > 0 ? { borderLeft: '1px solid var(--border-subtle)' } : undefined}>
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)] leading-none">{s.v}</div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] mt-2">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="p-3 space-y-1">
              {FEED.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 px-3 py-3 rounded hover:bg-[var(--fill-subtle-hover)] transition-colors cursor-default"
                >
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono font-medium flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type] || TAG_STYLE.content}`}>
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{item.company}</span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2 leading-snug">{item.action}</span>
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

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-14 flex flex-col items-center gap-2 relative z-10"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          </motion.div>
        </motion.div>
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
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">How it works</p>
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

      {/* ── THE PRODUCT ──────────────────────────────────────────────────────── */}
      <section id="product" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-base)] relative">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={0}
            className="mb-10"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">See it in action</p>
            <h2 className="text-[44px] lg:text-[64px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
              One product.<br className="hidden md:block" /> Two ways to win.
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-lg leading-relaxed">
              Competitor moves land in your live dashboard the moment they happen — then we synthesize them into the weekly Battle Card your reps actually use on the call.
            </p>
          </motion.div>

          {/* Top-level view switcher */}
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            custom={1}
            role="tablist"
            aria-label="Product views"
            className="flex flex-col sm:flex-row gap-2 mb-8"
          >
            {([
              { key: 'dashboard', label: 'Live Dashboard', sub: 'Real-time monitoring' },
              { key: 'card', label: 'Weekly Battle Card', sub: 'The sales deliverable' },
            ] as const).map((t) => {
              const active = productTab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setProductTab(t.key)}
                  className={`relative flex-1 text-left px-5 py-4 rounded-md border transition-colors cursor-pointer ${
                    active
                      ? 'border-sky-500/40 bg-sky-500/[0.06]'
                      : 'border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-sky-400' : 'bg-[var(--border-strong)]'}`} />
                    <span className={`text-sm font-semibold ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{t.label}</span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1 ml-4">{t.sub}</p>
                </button>
              );
            })}
          </motion.div>

          {productTab === 'dashboard' ? (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductDemo />
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -120px 0px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center text-[var(--text-muted)] text-xs font-mono mt-6 max-w-md mx-auto leading-relaxed"
              >
                Every pricing, feature, and messaging change across all tracked competitors — refreshed every 4 hours.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="tab-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Four quadrants, refreshed every Monday. Pick a competitor:</p>
                <div className="flex p-1 bg-[var(--fill-subtle)] border border-[var(--border-default)] rounded-md gap-0.5 flex-shrink-0">
                  {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                    <motion.button
                      key={comp}
                      onClick={() => setActiveComp(comp)}
                      onMouseEnter={() => setHoveredBattleTab(comp)}
                      onMouseLeave={() => setHoveredBattleTab(null)}
                      className="text-xs font-semibold px-4 py-2 rounded-md transition-colors cursor-pointer relative"
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
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-[var(--text-primary)]">{currentCard.hiring.total}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">open</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono" style={{ color: 'var(--tone-positive)' }}>+{currentCard.hiring.new}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--tone-positive) 70%, transparent)' }}>new</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-[var(--text-secondary)]">−{currentCard.hiring.closed}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">closed</span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-snug text-[var(--text-primary)] italic max-w-md">
                    <span className="text-sky-400 not-italic font-mono uppercase tracking-wider text-[9px] mr-2">Pattern</span>
                    {currentCard.hiring.read}
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activeComp} className="grid md:grid-cols-2 divide-x divide-y divide-[var(--border-subtle)]">
                {[
                  { label: 'Detected changes', color: 'text-sky-400', bg: 'bg-sky-500/8', border: 'border-sky-500/15', content: currentCard.changes.map((c, j) => (
                    <div key={j} className="flex gap-3 items-start">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm uppercase tracking-wide flex-shrink-0 mt-0.5 border ${c.tc}`}>{c.tag}</span>
                      <span className="text-xs text-[var(--text-primary)] leading-snug">{c.text}</span>
                    </div>
                  )) },
                  { label: 'User complaints', color: 'text-[var(--tone-danger)]', bg: 'bg-[var(--tone-danger)]/8', border: 'border-[var(--tone-danger)]/15', content: currentCard.complaints.map((c, j) => (
                    <div key={j} className="pl-0 space-y-1">
                      <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed min-h-[32px]">{c.text}</p>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1 block">{c.source}</span>
                    </div>
                  )) },
                  { label: 'Strategic signals', color: 'text-[var(--tone-warning)]', bg: 'bg-[var(--tone-warning)]/8', border: 'border-[var(--tone-warning)]/15', content: currentCard.signals.map((s, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <span className="text-sm mt-0.5 flex-shrink-0" style={{ color: 'var(--tone-warning)' }}>›</span>
                      <p className="text-xs text-[var(--text-primary)] leading-snug"><strong>{s.bold}</strong>{s.rest}</p>
                    </div>
                  )) },
                  { label: 'Playbook actions', color: 'text-[var(--tone-positive)]', bg: 'bg-[var(--tone-positive)]/8', border: 'border-[var(--tone-positive)]/15', content: currentCard.moves.map((move, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.16, delay: 0.05 + j * 0.05 }} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--tone-positive)' }}>
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
                    <div className={`text-[10px] font-mono uppercase tracking-widest ${q.color} ${q.bg} border ${q.border} px-3 py-1 rounded-md inline-flex mb-4`}>
                      {q.label}
                    </div>
                    <div className="space-y-3">{q.content}</div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
            </motion.div>
          )}
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
            <h2 className="text-[40px] sm:text-[52px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-[1.1] mb-4 text-balance">
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
              className="inline-flex items-center gap-3 bg-[var(--accent-cta)] text-[var(--accent-text)] font-semibold px-8 py-4 rounded hover:bg-[var(--accent-cta-hover)] transition-colors text-sm"
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
              <ul className="text-xs text-[var(--text-secondary)]">
                {[{ label: 'How it works', href: '#how-it-works' }, { label: 'Live Dashboard', href: '#product' }, { label: 'Battle Card', href: '#product' }].map((l) => (
                  <li key={l.label}><a href={l.href} className="inline-flex items-center min-h-[44px] hover:text-[var(--text-primary)] transition-colors">{l.label}</a></li>
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
              <ul className="text-xs text-[var(--text-muted)]">
                <li><a href="/privacy" className="inline-flex items-center min-h-[44px] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="inline-flex items-center min-h-[44px] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a></li>
                <li><a href="mailto:manssjones@gmail.com" className="inline-flex items-center min-h-[44px] hover:text-[var(--text-primary)] transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              &copy; {new Date().getFullYear()} Rivalscope. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[var(--text-muted)]">
              <a href="https://github.com/IManss-ai/competitor-analyzer" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] hover:text-[var(--text-primary)] transition-colors">
                <Github size={14} />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
    </MotionConfig>
  );
}
