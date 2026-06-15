'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, Zap, TrendingUp, ShieldCheck, MessageSquare, Calendar, ArrowUpRight, Copy, Star, CreditCard, Check } from 'lucide-react';
import { RivalscopeLogo } from '@/components/ui/rivalscope-logo';
import { Github, Instagram } from '@/components/ui/brand-icons';
import { PricingBasic } from '@/components/ui/pricing-demo';
import { HeroRotatingWord } from '@/components/ui/hero-rotating-word';
import { fadeUpVariants } from '@/lib/animations';
import HowItWorksPanels from '@/components/ui/how-it-works-panels';
import { useChartPalette } from '@/lib/chart-theme';
import ThemeToggle from '@/components/theme-toggle';

const MotionLink = motion.create(Link);

// ─── Data ────────────────────────────────────────────────────────────────────

const FEED = [
  { company: 'Stripe', action: 'Removed flat pricing from enterprise pages', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Increased card processing fees to 3.49%', time: '6h ago', type: 'pricing' },
  { company: 'Braintree', action: 'Launched new bio-auth checkouts API v4', time: '1d ago', type: 'feature' },
  { company: 'Square', action: 'Changed POS hero to “Complete retail platform”', time: '2d ago', type: 'messaging' },
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
      { tag: 'copy',    tc: 'tag-blue', text: 'Hero updated from “Payments infrastructure” to “Financial operations for global companies”.' },
    ],
    complaints: [
      { text: '“Support responses took 4 days. Blocked our payment gateway migration.”', source: 'Trustpilot · 1 star · 2 days ago' },
      { text: '“Completely opaque enterprise pricing after their recent site update.”', source: 'G2 · 2 stars · 5 days ago' },
    ],
    signals: [
      { bold: '4 Enterprise Sales roles', rest: ' posted in UK & EMEA. Major market expansion incoming.' },
      { bold: 'VP of Payments Partnerships', rest: ' hired. Preparing channel partner sales program.' },
    ],
    moves: [
      'Lead EMEA sales conversations highlighting flat-rate pricing advantage.',
      'Add “24h instant Slack/phone support” to your landing page hero.',
      'Deploy a dedicated “Stripe Comparison & Migration Guide” page to capture enterprise churn.',
    ],
    hiring: {
      total: 47,
      new: 6,
      closed: 2,
      read: 'Six new Enterprise Sales and Solutions Engineer roles in EMEA — a clear upmarket push.',
    },
  },
  paypal: {
    company: 'PayPal',
    logoColor: 'bg-blue-600',
    date: 'Updated yesterday',
    changes: [
      { tag: 'pricing', tc: 'tag-amber', text: 'Increased merchant checkout card processing fee from 2.9% to 3.49%.' },
      { tag: 'feature', tc: 'tag-green', text: 'Integrated bio-auth verification directly inside the checkout iframe.' },
      { tag: 'copy',    tc: 'tag-blue', text: 'Hero copy focused on “Instant conversion optimization” rather than “Send money”.' },
    ],
    complaints: [
      { text: '“Sandbox environment API endpoints timeout continuously during test mock run.”', source: 'Developer Forum · 3 days ago' },
      { text: '“Merchant fees rose unexpectedly without a clear email warning beforehand.”', source: 'Reddit · 4 stars · 1 day ago' },
    ],
    signals: [
      { bold: 'Patent filed', rest: ' for mobile device biometric tokenization system. Focus on mobile SDK.' },
      { bold: 'Developer Advocate', rest: ' hired in APAC. Recruiting developer portal testers.' },
    ],
    moves: [
      'Target PayPal developers with ads promoting a 99.9% sandbox uptime guarantee.',
      'Highlight “No hidden percentage increases, simple flat rates” in your checkout flows.',
      'Write blog post “Why developer sandbox speed is critical for product launch”.',
    ],
    hiring: {
      total: 31,
      new: 3,
      closed: 4,
      read: 'Heavy applied-ML and mobile SDK hiring — a biometric-checkout product launch is imminent.',
    },
  },
  square: {
    company: 'Square',
    logoColor: 'bg-[var(--text-muted)]',
    date: 'Updated 2 days ago',
    changes: [
      { tag: 'pricing',   tc: 'tag-amber', text: 'Flat rate subscription fee changed to dynamic pricing on point-of-sale.' },
      { tag: 'feature',   tc: 'tag-green', text: 'Launched POS v3 firmware with offline sync capabilities for retail terminals.' },
      { tag: 'messaging', tc: 'tag-violet', text: 'Hero changed from “Simple local commerce” to “The complete software & hardware platform”.' },
    ],
    complaints: [
      { text: '“Terminals disconnect from local Wi-Fi during peak sales hours.”', source: 'App Store · 2 stars · 6 hours ago' },
      { text: '“Contract lock-ins make it impossible to upgrade outdated hardware.”', source: 'Capterra · 3 stars · 4 days ago' },
    ],
    signals: [
      { bold: 'UK Retail Director', rest: ' hired. Launching hardware distribution partnerships.' },
      { bold: 'New POS terminal firmware', rest: ' registered in FCC database with 5G fallback.' },
    ],
    moves: [
      'Offer UK local shops zero-contract terminal rentals to target locked-in users.',
      'Advertise “Dual-band Wi-Fi backup POS terminal integration” to counter connection drops.',
      'Target Square merchants with “Contract-free hardware replacement program”.',
    ],
    hiring: {
      total: 22,
      new: 4,
      closed: 1,
      read: 'Four new UK retail partnership and hardware roles in two weeks — European expansion is funded.',
    },
  },
  adyen: {
    company: 'Adyen',
    logoColor: 'bg-emerald-700',
    date: 'Updated 1 day ago',
    changes: [
      { tag: 'pricing', tc: 'tag-amber', text: 'Changed EMEA support tiers and custom POS redirect APIs' },
      { tag: 'messaging', tc: 'tag-violet', text: 'Focusing on enterprise custom integrations. Small merchant SLA support shifted to ticket system.' }
    ],
    complaints: [],
    signals: [],
    moves: [
      'Target mid-market merchants looking for dedicated phone support lines.'
    ]
  }
};
const COMP_CHANGE_COUNTS: Record<string, number> = {
  stripe: 3,
  paypal: 1,
  square: 2,
  adyen: 1,
};



// ─── Animation helpers ───────────────────────────────────────────────────────

const navItems = [
  { label: 'How it works', href: '#how-it-works', key: 'how-it-works' },
  { label: 'Command Center', href: '#dashboard-showcase', key: 'dashboard-showcase' },
  { label: 'Features', href: '#features', key: 'features' },
  { label: 'Battle Cards', href: '#battle-card', key: 'battle-card' },
  { label: 'Pricing', href: '#pricing', key: 'pricing' },
];

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
  const [scanSweeping, setScanSweeping] = useState(false);
  const commandCenterRef = useRef<HTMLElement>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const p = useChartPalette();

  useEffect(() => {
    const comps = ['stripe', 'paypal', 'square', 'adyen'] as const;
    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      setSelectedDashboardComp((current) => {
        const idx = comps.indexOf(current);
        const nextIdx = (idx + 1) % comps.length;
        return comps[nextIdx];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const [card3Hovered, setCard3Hovered] = useState(false);

  const [typewriterText, setTypewriterText] = useState("");

  useEffect(() => {
    if (!card3Hovered) {
      queueMicrotask(() => setTypewriterText(""));
      return;
    }
    const fullText = "› Email: ‘We heard Stripe raised rates...’";
    let i = 0;
    const interval = setInterval(() => {
      setTypewriterText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [card3Hovered]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate metric counters when Command Center enters view
  useEffect(() => {
    const el = commandCenterRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !commandCenterInView) {
          setCommandCenterInView(true);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [commandCenterInView]);

  useEffect(() => {
    if (!commandCenterInView) return;
    const targets = [4, 3, 2];
    const duration = 1300;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setMetricCounters(targets.map((t) => Math.round(eased * t)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [commandCenterInView]);

  // Periodic scan sweep animation every 6 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setScanSweeping(true);
      setTimeout(() => setScanSweeping(false), 1300);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const currentCard = BATTLE_CARDS_DATA[activeComp];

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-base)] text-[var(--text-primary)] font-sans overflow-x-hidden antialiased">

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none" />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-5xl rounded-full border px-5 py-2.5 flex items-center justify-between transition-[background-color,border-color,box-shadow] duration-300 ${
            scrolled
              ? 'bg-[var(--surface-base)]/90 border-[var(--border-default)] shadow-[0_1px_0_0_var(--hairline)] backdrop-blur-xl'
              : 'bg-[var(--surface-base)]/60 border-[var(--border-subtle)] backdrop-blur-md'
          }`}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-sky-500/15 border border-sky-500/30 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/25 transition-colors">
              <RivalscopeLogo size={13} className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Rivalscope</span>
          </Link>

          {/* Links */}
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

          {/* Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="hidden sm:block text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 whitespace-nowrap"
            >
              Sign in
            </Link>
            <MotionLink
              href="/auth/login"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--accent-primary)] text-white px-4 py-1.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
            >
              Get started
              <ArrowRight size={10} />
            </MotionLink>
            <motion.button
              onClick={() => setMenuOpen(!menuOpen)}
              whileHover={{ scale: 1.02 }}
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

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[var(--surface-base)]/95 backdrop-blur-xl flex flex-col justify-center px-8 md:hidden"
          >
            <div className="flex flex-col gap-5">
              {[
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Command Center', href: '#dashboard-showcase' },
                { label: 'Features', href: '#features' },
                { label: 'Battle Card', href: '#battle-card' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Sign in', href: '/auth/login' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-2xl font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors inline-block"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 lg:pt-28 lg:pb-24 px-6 overflow-hidden">
        {/* Subtle top glow - static, no animation */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[360px] bg-sky-600/[0.05] rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-sky-500/15 border border-sky-500/40 rounded-full px-4 py-2 mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-mono text-sky-500 tracking-wide font-semibold">LIVE · Real-time competitor monitoring</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="text-[48px] sm:text-[60px] lg:text-[72px] font-bold tracking-tight leading-[1.1] mb-6 text-[var(--text-primary)]"
              >
                Know every competitor<br className="hidden sm:block" />
                <HeroRotatingWord
                  words={['move.', 'pricing change.', 'feature launch.', 'messaging shift.', 'hiring signal.']}
                  className="text-sky-400"
                  interval={2400}
                />
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-md mb-8"
              >
                Your rivals change pricing, ship features, and shift messaging every week — and you find out too late. Rivalscope watches them 24/7 and hands you an AI battle card to win the deal.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8"
              >
                <MotionLink
                  href="/auth/login"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Start 2-day free trial
                  <ArrowRight size={12} />
                </MotionLink>
                <a
                  href="#dashboard-showcase"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-3"
                >
                  See a live demo
                  <ArrowRight size={12} className="opacity-50" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="flex items-center gap-5 text-xs text-[var(--text-muted)]"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13}  className="text-sky-500" /> No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13}  className="text-sky-500" /> Cancel anytime
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13}  className="text-sky-500" /> 5 min setup
                </span>
              </motion.div>
            </div>

            {/* Right: live intel feed preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md hover:border-[var(--border-strong)] transition-colors duration-300 overflow-hidden shadow-[var(--shadow-card)] cursor-pointer">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-sky-400" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Intel Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">Updated 8m ago</span>
                  </div>
                </div>

                {/* Feed rows */}
                <div className="p-3 space-y-1">
                  {FEED.map((item, i) => (
                    <div
                      key={i}
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
                    </div>
                  ))}
                </div>

                {/* Panel footer */}
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
      </section>

      {/* ── SOCIAL PROOF BAR ────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="py-16 border-y border-[var(--border-subtle)] bg-[var(--surface-raised)]/25 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 'Every 4h', label: 'scan frequency' },
            { value: '7', label: 'competitors per plan' },
            { value: '5 min', label: 'setup time' },
            { value: 'Monday', label: 'weekly playbook' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="text-[42px] sm:text-[56px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight leading-none">
                {stat.value}
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-[0.1em]">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.section>



      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-raised)] relative">
        <div className="max-w-5xl mx-auto">

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={0}
            className="mb-16"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">01 — How it works</p>
            <h2 className="text-[40px] lg:text-[54px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
              From change detection<br className="hidden md:block" /> to sales playbook in hours.
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-lg leading-relaxed">
              No SDK integrations. No permissions needed. We crawl public competitor surfaces and synthesize them into actionable intelligence.
            </p>
          </motion.div>

          <HowItWorksPanels />
        </div>
      </section>

      {/* ── COMMAND CENTER ──────────────────────────────────────────────── */}
      <section id="dashboard-showcase" ref={commandCenterRef} className="scroll-mt-24 py-28 px-6 bg-[var(--surface-base)] relative">
        <div className="pointer-events-none absolute top-24 left-[15%] w-[560px] h-[560px] bg-sky-600/[0.05] rounded-full blur-[120px] z-0" />
        <div className="max-w-7xl mx-auto relative z-10">

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={0}
            className="mb-12"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">02 — Command Center</p>
            <h2 className="text-[40px] lg:text-[54px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
              The Intelligence<br className="hidden md:block" /> Command Center
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-md leading-relaxed">
              One view for every competitor movement. Pricing updates, review signals, and AI playbooks in a single dashboard.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
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
                        className="w-full text-left text-xs px-3 py-2.5 rounded font-medium flex items-center justify-between transition-colors cursor-pointer relative animate-none"
                        style={{ color: selectedDashboardComp === comp ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {selectedDashboardComp === comp && (
                          <motion.div
                            layoutId="activeDashTab"
                            className="absolute inset-0 bg-sky-500/10 border border-sky-500/20 rounded"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="capitalize relative z-10">{comp}</span>
                        {COMP_CHANGE_COUNTS[comp] > 0 ? (
                          <span className={`flex-shrink-0 min-w-[18px] px-1 py-0.5 rounded text-[8px] font-bold font-mono relative z-10 text-center transition-colors ${
                            selectedDashboardComp === comp
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/25'
                              : 'bg-[var(--fill-subtle)] text-[var(--text-muted)]'
                          }`}>
                            {COMP_CHANGE_COUNTS[comp]}
                          </span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full relative z-10 transition-colors ${
                            selectedDashboardComp === comp ? 'bg-sky-400' : 'bg-[var(--border-strong)]'
                          }`} />
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
                              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-r-[5px] border-r-white/[0.08] border-b-4 border-b-transparent" />
                              <div className="absolute right-[calc(100%-1px)] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-r-[4px] border-r-[var(--surface-overlay)] border-b-[3px] border-b-transparent" />
                              <p className="leading-snug font-normal text-[var(--text-primary)]">
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
                  <div className="text-[10px] text-sky-300 font-mono bg-sky-500/8 border border-sky-500/15 px-2.5 py-1.5 rounded inline-block">
                    Every 4 hours
                  </div>
                </div>
              </div>

              {/* Main panel */}
              <div className="p-5 flex flex-col justify-between overflow-hidden relative">
                    {/* Periodic scan sweep */}
                    <AnimatePresence>
                      {scanSweeping && (
                        <motion.div
                          key="scan-sweep"
                          initial={{ x: '-110%', opacity: 0.9 }}
                          animate={{ x: '110%', opacity: 0.3 }}
                          exit={{}}
                          transition={{ duration: 1.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="absolute inset-y-0 left-0 w-32 pointer-events-none z-20"
                          style={{
                            background:
                              'linear-gradient(to right, transparent, rgba(79, 124, 176,0.07), rgba(79, 124, 176,0.12), rgba(79, 124, 176,0.07), transparent)',
                          }}
                        />
                      )}
                    </AnimatePresence>
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
                            <motion.div
                              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">Live</span>
                          </div>
                          <span className="text-[10px] font-mono bg-[var(--fill-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] px-2.5 py-1 rounded">
                            ALL
                          </span>
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
                            {s.trend && (
                              <div className={`text-[9px] font-mono mt-1 ${s.trendColor}`}>{s.trend}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Staggered intelligence event cards */}
                      <div className="space-y-2 mb-3">
                        <AnimatePresence mode="popLayout">
                          {BATTLE_CARDS_DATA[selectedDashboardComp].changes.map((change, i) => (
                            <motion.div
                              key={`${selectedDashboardComp}-change-${i}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{
                                opacity: 1,
                                x: 0,
                                transition: { delay: i * 0.07, duration: 0.22, ease: 'easeOut' },
                              }}
                              exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                              className="bg-[var(--fill-subtle-hover)] border border-[var(--border-subtle)] p-3 rounded"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${change.tc}`}>
                                  {change.tag.toUpperCase()}
                                </span>
                                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                  {i === 0 ? 'today' : i === 1 ? '2d ago' : '4d ago'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-primary)] leading-snug">{change.text}</p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="border border-sky-500/15 bg-sky-500/[0.03] p-4 rounded flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-mono text-sky-400 mb-1 flex items-center gap-1.5">
                            <CheckCircle2 size={9}  /> SUGGESTED PLAYBOOK
                          </div>
                          <p className="text-xs text-[var(--text-primary)] leading-snug">
                            {BATTLE_CARDS_DATA[selectedDashboardComp].moves[0]}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setCopiedPlaybook(true); setTimeout(() => setCopiedPlaybook(false), 2000); }}
                          className="flex-shrink-0 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/18 border border-sky-500/25 text-sky-400 font-mono text-[10px] rounded transition-colors flex items-center gap-1.5 cursor-pointer min-w-[95px] justify-center"
                        >
                          <AnimatePresence mode="wait">
                            {copiedPlaybook ? (
                              <motion.span
                                key="copied"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="flex items-center gap-1"
                              >
                                <Check size={10} className="text-emerald-400" />
                                Copied
                              </motion.span>
                            ) : (
                              <motion.span
                                key="copy"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="flex items-center gap-1"
                              >
                                <Copy size={10} />
                                Copy script
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                      <span>4 pages · 2 API routes · 1 docs path monitored</span>
                      <Link
                        href="/auth/login"
                        className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1"
                      >
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

      {/* ── FEATURES BENTO ──────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-24 py-28 px-6 bg-[var(--surface-raised)] relative">
        <div className="pointer-events-none absolute top-24 right-[12%] w-[560px] h-[560px] bg-sky-600/[0.05] rounded-full blur-[120px] z-0" />
        <div className="max-w-5xl mx-auto relative z-10">

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={1}
            className="mb-12"
          >
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">03 — Features</p>
            <h2 className="text-[40px] lg:text-[54px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] text-balance">
              Deep intelligence.<br className="hidden md:block" /> Built for your sales team.
            </h2>
          </motion.div>

          {/* Asymmetric bento: full width, then 2+1, then 1+2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Row 1: Full width — Pricing Grid Monitoring */}
            <motion.div
              variants={fadeUpVariants}
              custom={0}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              className="md:col-span-3 bg-[var(--surface-raised)] border border-[var(--border-default)] border-t border-t-[var(--border-strong)] rounded-md p-6 hover:border-sky-500/40 transition-colors duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-6 cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-5">
                  <TrendingUp size={18} className="text-sky-400 flex-shrink-0" />
                  <div className="h-px flex-1 bg-gradient-to-r from-sky-500/30 to-transparent" />
                  <span className="text-xs font-mono font-bold text-sky-400/80">01</span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Pricing Grid Monitoring</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
                  We scan HTML structures, pricing grids, and currency changes to detect discount models, bundle rates, or tier adjustments the moment they happen.
                </p>
              </div>
              <div className="flex-shrink-0 w-full sm:w-56 h-20 bg-[var(--surface-raised)] rounded-md border border-[var(--border-default)] overflow-hidden relative">
                <span className="absolute top-1.5 right-2 z-10 text-[9px] font-mono text-sky-400">▲ +12%</span>
                <svg className="w-full h-full p-2" viewBox="0 0 180 64">
                  <motion.path
                    d="M 8 56 L 35 44 L 65 28 L 95 36 L 120 18 L 150 10 L 175 4"
                    fill="none"
                    stroke={p.accent}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, margin: "0px 0px 400px 0px" }}
                    transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
                  />
                  <motion.path
                    d="M 8 56 L 35 44 L 65 28 L 95 36 L 120 18 L 150 10 L 175 4 L 175 64 L 8 64Z"
                    fill="url(#chartFill)"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "0px 0px 400px 0px" }}
                    transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.5 }}
                  />
                  <motion.circle
                    cx="175"
                    cy="4"
                    r="3"
                    fill={p.accentSoft}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: "0px 0px 400px 0px" }}
                    transition={{ duration: 0.4, delay: 1.2, type: 'spring', stiffness: 300 }}
                  />
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="64">
                      <stop stopColor={p.accent} stopOpacity="0.15" />
                      <stop offset="1" stopColor={p.accent} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>

            {/* Row 2: 2-col — Review Site Intelligence */}
            <motion.div
              variants={fadeUpVariants}
              custom={1}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              className="md:col-span-2 bg-[var(--surface-raised)] border border-[var(--border-default)] border-t border-t-[var(--border-strong)] rounded-md p-6 hover:border-sky-500/35 transition-colors duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare size={18} className="text-sky-400 flex-shrink-0" />
                <div className="h-px flex-1 bg-gradient-to-r from-sky-500/30 to-transparent" />
                <span className="text-xs font-mono font-bold text-sky-400/80">02</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Review Site Intelligence</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Watches G2, Trustpilot, and public forums. Automatically extracts feature complaints and service timeouts to locate users ready to churn away from competitors.
              </p>
              <div className="mt-4 space-y-2">
                {['G2 · Trustpilot', 'Capterra · Reddit', 'App Store · Play'].map((src) => (
                  <div key={src} className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {src}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 1-col — AI Copilot Playbooks */}
            <motion.div
              variants={fadeUpVariants}
              custom={2}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              onMouseEnter={() => setCard3Hovered(true)}
              onMouseLeave={() => setCard3Hovered(false)}
              className="md:col-span-1 bg-[var(--surface-raised)] border border-[var(--border-default)] border-t border-t-[var(--border-strong)] rounded-md p-6 hover:border-sky-500/30 transition-colors duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <Zap size={18} className="text-sky-400 flex-shrink-0" />
                <div className="h-px flex-1 bg-gradient-to-r from-sky-500/30 to-transparent" />
                <span className="text-xs font-mono font-bold text-sky-400/80">03</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">AI Copilot Playbooks</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Generates targeted email scripts and landing page copy built around the competitor changes detected today.
              </p>
              <div className="mt-4 font-mono text-[9px] text-sky-400 bg-[var(--accent-subtle)] border border-sky-500/10 p-2.5 rounded min-h-[36px] flex items-center">
                <span>{typewriterText}</span>
                {card3Hovered && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-1.5 h-3 bg-sky-400 ml-0.5"
                  />
                )}
              </div>
            </motion.div>

            {/* Row 3: 1-col — Zero-Access Crawling */}
            <motion.div
              variants={fadeUpVariants}
              custom={3}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              className="md:col-span-1 bg-[var(--surface-base)]/80 border border-[var(--border-default)] border-t border-t-[var(--border-strong)] rounded-md p-6 hover:border-[var(--border-strong)] transition-colors duration-300 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={18} className="text-sky-400 flex-shrink-0" />
                  <div className="h-px flex-1 bg-gradient-to-r from-sky-500/30 to-transparent" />
                  <span className="text-xs font-mono font-bold text-sky-400/80">04</span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Zero-Access Crawling</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  100% cloud-hosted crawlers scan pages externally. No credentials, integrations, or developer steps required.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-[2px] bg-[var(--fill-subtle-hover)] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: "0px 0px 400px 0px" }}
                    transition={{ duration: 1.0, ease: 'easeInOut', delay: 0.4 }}
                    style={{ transformOrigin: 'left' }}
                    className="absolute inset-0 bg-sky-500"
                  />
                </div>
                <CheckCircle2 size={12} className="text-sky-400 flex-shrink-0" />
              </div>
            </motion.div>

            {/* 2-col — Historical Changelog */}
            <motion.div
              variants={fadeUpVariants}
              custom={4}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              className="md:col-span-2 bg-[var(--surface-base)]/80 border border-[var(--border-default)] border-t border-t-[var(--border-strong)] rounded-md p-6 hover:border-[var(--border-strong)] transition-colors duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={18} className="text-[var(--text-primary)] flex-shrink-0" />
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-500/30 to-transparent" />
                <span className="text-xs font-mono font-bold text-[var(--text-primary)]">05</span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Historical Changelog</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Check chronological competitor visual logs. Understand their engineering speed, rebranding cycles, and positioning adjustments over time.
              </p>
              <div className="mt-5 flex items-center gap-0">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 border-r border-[var(--border-subtle)] last:border-r-0 flex items-end pb-1 px-0.5"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${20 + Math.sin(i * 1.3) * 14}px` }}
                      viewport={{ once: true, margin: "0px 0px 400px 0px" }}
                      transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.04 }}
                      className="w-full bg-sky-500/30 rounded-sm"
                      style={{ opacity: 0.3 + i * 0.06 }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>



      {/* ── BATTLE CARDS ────────────────────────────────────────────────── */}
      <section id="battle-card" className="scroll-mt-24 py-28 px-6 bg-[var(--surface-base)] relative">
        <div className="pointer-events-none absolute top-20 left-[10%] w-[560px] h-[560px] bg-sky-600/[0.04] rounded-full blur-[120px] z-0" />
        <div className="max-w-5xl mx-auto relative z-10">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <motion.div
              variants={fadeUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              custom={0}
            >
              <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">04 — Battle Cards</p>
              <h2 className="text-[40px] lg:text-[54px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-3 text-balance">
                Explore a live<br className="hidden md:block" /> Battle Card
              </h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm leading-relaxed">
                Generated every Monday for sales enablement, summarized into four actionable quadrants.
              </p>
            </motion.div>

            <div className="flex p-1 bg-[var(--fill-subtle)] border border-[var(--border-default)] rounded-full gap-0.5 flex-shrink-0">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <motion.button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  onMouseEnter={() => setHoveredBattleTab(comp)}
                  onMouseLeave={() => setHoveredBattleTab(null)}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full transition-colors cursor-pointer relative"
                  style={{ color: activeComp === comp ? 'var(--accent-text)' : 'var(--text-muted)' }}
                >
                  {hoveredBattleTab === comp && activeComp !== comp && (
                    <motion.div
                      layoutId="battleTabHover"
                      className="absolute inset-0 bg-[var(--fill-subtle-hover)] rounded-full"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  {activeComp === comp && (
                    <motion.div
                      layoutId="activeBattleTab"
                      className="absolute inset-0 bg-sky-600 rounded-full shadow-[0_2px_8px_rgba(79, 124, 176,0.25)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
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
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={1}
            className="border border-[var(--border-default)] rounded-md hover:border-[var(--border-strong)] transition-colors duration-300 overflow-hidden bg-[var(--surface-raised)] shadow-[var(--shadow-elevated)]"
          >
            {/* Card header */}
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

            {/* Hiring strip */}
            {currentCard.hiring && (
              <div className="px-5 py-4 border-b border-[var(--border-default)] bg-[var(--fill-subtle)]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Hiring</span>
                    </div>
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

            {/* 4 quadrants */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeComp}
                className="grid md:grid-cols-2 divide-x divide-y divide-[var(--border-subtle)]"
              >
                {/* Quadrant 1 */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: 0 * 0.06 }}
                  className="p-5 hover:bg-[var(--fill-subtle)] transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 bg-sky-500/8 border border-sky-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                    Detected changes
                  </div>
                  <div className="space-y-3">
                    {currentCard.changes.map((row, j) => (
                      <div key={j} className="flex gap-2.5 items-start">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0 mt-0.5 border ${row.tc}`}>
                          {row.tag}
                        </span>
                        <span className="text-xs text-[var(--text-primary)] leading-snug">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quadrant 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: 1 * 0.06 }}
                  className="p-5 hover:bg-[var(--fill-subtle)] transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 bg-red-500/8 border border-red-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                    User complaints
                  </div>
                  <div className="space-y-4">
                    {currentCard.complaints.map((c, j) => (
                      <div key={j} className="pl-0 space-y-1">
                        <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed min-h-[32px]">
                          {c.text}
                        </p>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1 block">{c.source}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quadrant 3 */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: 2 * 0.06 }}
                  className="p-5 hover:bg-[var(--fill-subtle)] transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                    Strategic signals
                  </div>
                  <div className="space-y-3">
                    {currentCard.signals.map((sig, j) => (
                      <div key={j} className="flex gap-2 items-start">
                        <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">›</span>
                        <p className="text-xs text-[var(--text-primary)] leading-snug">
                          <strong className="text-[var(--text-primary)] font-semibold">{sig.bold}</strong>{sig.rest}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quadrant 4 */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: 3 * 0.06 }}
                  className="p-5 hover:bg-[var(--fill-subtle)] transition-colors"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                    Playbook actions
                  </div>
                  <div className="space-y-2.5">
                    {currentCard.moves.map((move, j) => (
                      <div key={j} className="flex gap-2 items-start">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 34,
                            delay: 0.05 + j * 0.05
                          }}
                          className="text-emerald-400 flex-shrink-0 mt-0.5"
                        >
                          <CheckCircle2 size={14} />
                        </motion.div>
                        <span className="text-xs text-[var(--text-primary)] leading-snug">{move}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </section>

      {/* ── LOCAL BUSINESS ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[var(--surface-raised)] relative">
        <div className="pointer-events-none absolute top-20 right-[10%] w-[560px] h-[560px] bg-sky-600/[0.05] rounded-full blur-[120px] z-0" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              variants={fadeUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
              custom={0}
            >
              <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-4">05 — Local</p>
              <h2 className="text-[40px] lg:text-[54px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-5 text-balance">
                Built for local<br className="hidden lg:block" /> businesses too
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
                Not just SaaS. Crawl Google Maps reviews, social activity, and pricing for physical salons, cafes, gyms, and nearby competitors.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                See local plan <ArrowRight size={13} />
              </Link>
            </motion.div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: <Star size={15}  />, title: 'Google Reviews Track', body: 'Weekly alerts when a nearby competitor receives critical reviews.' },
                { icon: <Instagram size={15}  />, title: 'Social Actions Scan', body: 'Monitor local competitor Instagram and Facebook feeds without credentials.' },
                { icon: <CreditCard size={15}  />, title: 'Local Battle Playbooks', body: 'AI checklists: support gaps, price comparisons, promotion templates.' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUpVariants}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
                  className="flex items-start gap-3 bg-[var(--surface-base)]/80 border border-[var(--border-default)] p-4 rounded-md hover:border-[var(--border-strong)] transition-colors duration-300 cursor-pointer shadow-md"
                >
                  <div className="w-7 h-7 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{item.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-24 py-24 px-6 bg-[var(--surface-base)] relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={0}
            className="mb-3"
          >
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full inline-block">
              Pricing
            </span>
          </motion.div>
          <PricingBasic />
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[var(--surface-base)] relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0, margin: "0px 0px 400px 0px" }}
            custom={0}
            className="border border-sky-500/25 bg-[var(--surface-raised)] rounded-md px-10 py-16 text-center relative overflow-hidden shadow-[0_0_0_1px_rgba(79, 124, 176,0.08)]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent pointer-events-none" />
            <h2 className="text-[40px] sm:text-[52px] font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-4 text-balance">
              Start tracking competitor<br className="hidden sm:block" /> movements today.
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-sm mx-auto leading-relaxed mb-10">
              2-day free trial. Monitor up to 7 competitors. Cancel with one click.
            </p>
            <MotionLink
              href="/auth/login"
              whileHover="hover"
              initial="rest"
              whileTap={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2.5 bg-[var(--accent-primary)] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors text-sm relative"
            >
              <span>Start free trial</span>
              <motion.span
                variants={{ rest: { x: 0 }, hover: { x: 3 } }}
                className="inline-block"
              >
                <ArrowRight size={13} />
              </motion.span>
            </MotionLink>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-5">No credit card required · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-default)] py-14 px-6 bg-[var(--surface-base)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-10 mb-10 border-b border-[var(--border-default)]">

            {/* Brand */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded">
                  <RivalscopeLogo size={11} className="text-sky-400" />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">Rivalscope</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
                AI-driven competitive intelligence. Track pricing, reviews, and messaging shifts so you can act before the next sales call.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">Product</h4>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {[
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Command Center', href: '#dashboard-showcase' },
                  { label: 'Features', href: '#features' },
                  { label: 'Battle Card', href: '#battle-card' },
                ].map((l) => (
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
                <li>
                  <a href="mailto:manssjones@gmail.com" className="hover:text-[var(--text-primary)] transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              &copy; {new Date().getFullYear()} Rivalscope. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[var(--text-muted)]">
              <a
                href="https://github.com/IManss-ai/competitor-analyzer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                <Github size={14} />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
