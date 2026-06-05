'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, ArrowRight, CheckCircle2, Zap, TrendingUp, ShieldCheck, MessageSquare, Calendar, ArrowUpRight, Copy, Star, CreditCard } from 'lucide-react';
import { Github, Twitter, Linkedin, Instagram } from '@/components/ui/brand-icons';
import { PricingBasic } from '@/components/ui/pricing-demo';
import { ScannerCardStream } from '@/components/ui/scanner-card-stream';
import { HeroRotatingWord } from '@/components/ui/hero-rotating-word';
import { InteractiveDotCanvas } from '@/components/ui/interactive-dot-canvas';

// ─── Data ────────────────────────────────────────────────────────────────────

const FEED = [
  { company: 'Stripe', action: 'Removed flat pricing from enterprise pages', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Increased card processing fees to 3.49%', time: '6h ago', type: 'pricing' },
  { company: 'Braintree', action: 'Launched new bio-auth checkouts API v4', time: '1d ago', type: 'feature' },
  { company: 'Square', action: 'Changed POS hero to "Complete retail platform"', time: '2d ago', type: 'messaging' },
  { company: 'Adyen', action: 'Added 3 enterprise retail case studies', time: '3d ago', type: 'content' },
];

const TAG_STYLE: Record<string, string> = {
  pricing:   'bg-amber-400/10 text-amber-400 border border-amber-400/20',
  feature:   'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  copy:      'bg-sky-400/10 text-sky-400 border border-sky-400/20',
  messaging: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
  content:   'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
};

const BATTLE_CARDS_DATA = {
  stripe: {
    company: 'Stripe',
    logoColor: 'bg-sky-600',
    date: 'Updated today',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Removed enterprise flat-rates. Custom contract quote required.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Released Stripe Checkout v4.1 with optimized redirect latency.' },
      { tag: 'copy',    tc: 'text-sky-400 bg-sky-400/10 border-sky-400/20', text: 'Hero updated from "Payments infrastructure" to "Financial operations for global companies".' },
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
    ]
  },
  paypal: {
    company: 'PayPal',
    logoColor: 'bg-blue-600',
    date: 'Updated yesterday',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Increased merchant checkout card processing fee from 2.9% to 3.49%.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Integrated bio-auth verification directly inside the checkout iframe.' },
      { tag: 'copy',    tc: 'text-sky-400 bg-sky-400/10 border-sky-400/20', text: 'Hero copy focused on "Instant conversion optimization" rather than "Send money".' },
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
    ]
  },
  square: {
    company: 'Square',
    logoColor: 'bg-zinc-700',
    date: 'Updated 2 days ago',
    changes: [
      { tag: 'pricing',   tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Flat rate subscription fee changed to dynamic pricing on point-of-sale.' },
      { tag: 'feature',   tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Launched POS v3 firmware with offline sync capabilities for retail terminals.' },
      { tag: 'messaging', tc: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', text: 'Hero changed from "Simple local commerce" to "The complete software & hardware platform".' },
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
    ]
  }
};



// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.05, margin: "0px 0px -50px 0px" },
  transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as any },
});

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeComp, setActiveComp] = useState<'stripe' | 'paypal' | 'square'>('stripe');
  const [selectedDashboardComp, setSelectedDashboardComp] = useState<'stripe' | 'paypal' | 'square' | 'adyen'>('stripe');
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

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



  const currentCard = BATTLE_CARDS_DATA[activeComp];

  return (
    <div className="min-h-[100dvh] bg-[#040812] text-[#f8fafc] font-sans overflow-x-hidden antialiased">

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="absolute top-0 h-px w-full pointer-events-none" />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-5xl rounded-full border px-5 py-2.5 flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? 'bg-[#040812]/90 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl'
              : 'bg-[#040812]/60 border-white/[0.05] backdrop-blur-md'
          }`}
        >
          {/* Brand */}
          <Link href="#" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-sky-500/15 border border-sky-500/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/25 transition-colors">
              <Crosshair size={13}  className="text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Competitor Analyzer</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7 text-[11px] font-medium text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#dashboard-showcase" className="hover:text-white transition-colors">Command Center</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#battle-card" className="hover:text-white transition-colors">Battle CreditCard</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-100 active:scale-[0.97] transition-all"
            >
              Get started
              <ArrowRight size={10}  />
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 md:hidden flex flex-col gap-1 items-center justify-center w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`w-3.5 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`w-3.5 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </button>
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
            className="fixed inset-0 z-40 bg-[#040812]/95 backdrop-blur-xl flex flex-col justify-center px-8 md:hidden"
          >
            <div className="flex flex-col gap-5">
              {[
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Command Center', href: '#dashboard-showcase' },
                { label: 'Features', href: '#features' },
                { label: 'Battle CreditCard', href: '#battle-card' },
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
                    className="text-2xl font-bold text-zinc-300 hover:text-white transition-colors"
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
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-24 px-6 overflow-hidden">
        {/* Interactive dot canvas background */}
        <InteractiveDotCanvas className="z-0 opacity-70" />

        {/* Subtle top glow - static, no animation */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-600/6 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-sky-500/8 border border-sky-500/20 rounded-full px-3 py-1.5 mb-8"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-mono text-sky-300 tracking-wide">Live competitor monitoring</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="text-[52px] sm:text-[60px] lg:text-[64px] font-bold tracking-tight leading-[1.02] mb-6 text-white"
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
                className="text-zinc-400 text-lg leading-relaxed max-w-md mb-8"
              >
                We track pricing changes, messaging shifts, and review signals across your competitors 24/7. Get AI-generated sales playbooks every Monday morning.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8"
              >
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 bg-white text-black font-semibold text-sm px-6 py-3 rounded-full hover:bg-zinc-100 active:scale-[0.97] transition-all"
                >
                  Start 14-day free trial
                  <ArrowRight size={12}  />
                </Link>
                <a
                  href="#dashboard-showcase"
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors px-2 py-3"
                >
                  See a live demo
                  <ArrowRight size={12}  className="opacity-50" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="flex items-center gap-5 text-xs text-zinc-500"
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
              <div className="bg-[#080e1c] border border-white/[0.06] rounded-3xl hover:border-white/[0.1] transition-colors duration-300 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-sky-400" />
                    <span className="text-sm font-semibold text-white">Intel Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-zinc-500">Updated 8m ago</span>
                  </div>
                </div>

                {/* Feed rows */}
                <div className="p-3 space-y-1">
                  {FEED.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.025] transition-colors cursor-default"
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type] || TAG_STYLE.content}`}>
                        {item.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-zinc-200">{item.company}</span>
                        <span className="text-xs text-zinc-400 ml-1.5 leading-snug">{item.action}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 whitespace-nowrap flex-shrink-0 pt-0.5">{item.time}</span>
                    </div>
                  ))}
                </div>

                {/* Panel footer */}
                <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                  <span className="text-[11px] font-mono text-zinc-500">5 competitors tracked</span>
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
      <section className="py-10 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center
                        justify-center gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">1,200+</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">sales teams</div>
          </div>
          <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">8,400+</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">competitors tracked</div>
          </div>
          <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">24/7</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">automated scanning</div>
          </div>
          <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">4h</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">avg detection time</div>
          </div>
        </div>
      </section>

      {/* ── SCANNER STREAM ──────────────────────────────────────────────── */}
      <section className="py-0 overflow-hidden bg-[#040812] relative">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#040812] to-transparent z-30 pointer-events-none" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#040812] to-transparent z-30 pointer-events-none" />
        {/* Left fade */}
        <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-[#040812] to-transparent z-30 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-[#040812] to-transparent z-30 pointer-events-none" />

        <ScannerCardStream
          initialSpeed={100}
          direction={-1}
          cardGap={40}
          friction={0.97}
          scanEffect="scramble"
          height={260}
          repeat={5}
        />
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#050c1a] relative">
        <div className="max-w-5xl mx-auto">

          <motion.div {...fadeUp(0)} className="mb-16">
            <h2 className="text-3xl lg:text-[42px] font-bold tracking-tight text-white leading-tight mb-4">
              From change detection<br className="hidden md:block" /> to sales playbook in hours.
            </h2>
            <p className="text-zinc-400 text-base max-w-lg">
              No SDK integrations. No permissions needed. We crawl public competitor surfaces and synthesize them into actionable intelligence.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-5 left-[calc(16.5%)] right-[calc(16.5%)] h-px">
              <div className="h-full bg-gradient-to-r from-sky-500/20 via-sky-500/40 to-sky-500/20" />
            </div>

            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {[
                {
                  n: '01',
                  title: 'Register competitor URLs',
                  body: 'Add domains of up to 7 competitors. We automatically scan homepages, pricing grids, developer docs, and social feeds.',
                },
                {
                  n: '02',
                  title: 'AI analyzes modifications',
                  body: 'Our engine parses changes daily. When a pricing tier is tweaked or complaints pile up, AI formats it into clean categorized insights.',
                },
                {
                  n: '03',
                  title: 'Get your sales playbook',
                  body: 'Every Monday, receive an executive brief outlining competitor modifications, friction points, and your exact response script.',
                },
              ].map((step, i) => (
                <motion.div key={i} {...fadeUp(i * 0.1)} className="flex flex-col gap-5">
                  {/* Number node */}
                  <div className="relative flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-sky-500/30 bg-sky-500/8 flex items-center justify-center flex-shrink-0 relative z-10">
                      <span className="text-sky-400 text-sm font-bold font-mono">{step.n}</span>
                    </div>
                    <div className="flex-1 h-px bg-white/[0.04] md:hidden" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-2 leading-snug">{step.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{step.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── COMMAND CENTER ──────────────────────────────────────────────── */}
      <section id="dashboard-showcase" className="py-24 px-6 bg-[#040812] relative">
        <div className="max-w-7xl mx-auto">

          <motion.div {...fadeUp(0)} className="mb-12">
            <h2 className="text-3xl lg:text-[42px] font-bold tracking-tight text-white leading-tight mb-4">
              The Intelligence Command Center
            </h2>
            <p className="text-zinc-400 text-base max-w-md">
              One view for every competitor movement. Pricing updates, review signals, and AI playbooks in a single dashboard.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp(0.1)}
            className="border border-white/[0.06] rounded-3xl hover:border-white/[0.1] transition-colors duration-300 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-[#060b18]"
          >
            <div className="grid md:grid-cols-[200px_1fr] min-h-[480px]">

              {/* Sidebar */}
              <div className="border-r border-white/[0.06] p-4 space-y-6">
                <div>
                  <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-3">Tracked</div>
                  <div className="space-y-1">
                    {(['stripe', 'paypal', 'square', 'adyen'] as const).map((comp) => (
                      <button
                        key={comp}
                        onClick={() => setSelectedDashboardComp(comp)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer relative"
                        style={{ color: selectedDashboardComp === comp ? '#ffffff' : '#6b7280' }}
                      >
                        {selectedDashboardComp === comp && (
                          <motion.div
                            layoutId="activeDashTab"
                            className="absolute inset-0 bg-sky-500/10 border border-sky-500/20 rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="capitalize relative z-10">{comp}</span>
                        <span className={`w-1.5 h-1.5 rounded-full relative z-10 transition-colors ${
                          selectedDashboardComp === comp ? 'bg-sky-400' : 'bg-zinc-700'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Scan rate</div>
                  <div className="text-[10px] text-sky-300 font-mono bg-sky-500/8 border border-sky-500/15 px-2.5 py-1.5 rounded-lg inline-block">
                    Every 4 hours
                  </div>
                </div>
              </div>

              {/* Main panel */}
              <div className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <TrendingUp size={14} className="text-sky-400" />
                        Intel Feed · <span className="text-zinc-600">last scan 8m ago</span>
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] text-zinc-500 px-2.5 py-1 rounded-lg">
                      ALL
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Monitored', value: '4 targets', color: 'text-white' },
                      { label: 'Changes', value: '3 this week', color: 'text-sky-400' },
                      { label: 'Plays', value: '2 ready', color: 'text-emerald-400' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl">
                        <div className="text-[9px] font-mono text-zinc-600 mb-1">{s.label.toUpperCase()}</div>
                        <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-500/8 border border-sky-500/15 px-2 py-0.5 rounded-md">
                        PRICING UPDATE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">June 4, 2026</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white mb-1.5 leading-snug">
                      {selectedDashboardComp === 'stripe' && 'Removed flat-rate pricing for enterprise accounts'}
                      {selectedDashboardComp === 'paypal' && 'Card transaction fee adjusted from 2.9% to 3.49%'}
                      {selectedDashboardComp === 'square' && 'POS firmware update v3.1 with dynamic checkout fees'}
                      {selectedDashboardComp === 'adyen' && 'Changed EMEA support tiers and custom POS redirect APIs'}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {selectedDashboardComp === 'stripe' && 'Enterprise leads now redirected to "Contact Sales" pipeline, hiding transaction fee discounts.'}
                      {selectedDashboardComp === 'paypal' && 'Rate change increases merchant billing overhead by 20%. Developers report sandbox instability.'}
                      {selectedDashboardComp === 'square' && 'Terminals report Wi-Fi dropping during heavy retail checkout hours.'}
                      {selectedDashboardComp === 'adyen' && 'Focusing on enterprise custom integrations. Small merchant SLA support shifted to ticket system.'}
                    </p>
                  </div>

                  <div className="border border-sky-500/15 bg-sky-500/[0.03] p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-mono text-sky-400 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={9}  /> SUGGESTED PLAYBOOK
                      </div>
                      <p className="text-xs text-zinc-300 leading-snug">
                        {selectedDashboardComp === 'stripe' && 'Email script targeting Stripe companies flagging transparent flat support agreements.'}
                        {selectedDashboardComp === 'paypal' && 'Campaign addressing developers: "Zero-latency sandbox trial & transparent flat billing".'}
                        {selectedDashboardComp === 'square' && 'Ads targeting retail merchants highlighting terminal offline-mode robustness.'}
                        {selectedDashboardComp === 'adyen' && 'Target mid-market merchants looking for dedicated phone support lines.'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setCopiedPlaybook(true); setTimeout(() => setCopiedPlaybook(false), 2000); }}
                      className="flex-shrink-0 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/18 border border-sky-500/25 text-sky-400 font-mono text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={10} />
                      {copiedPlaybook ? 'Copied' : 'Copy script'}
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                  <span>4 pages · 2 API routes · 1 docs path monitored</span>
                  <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                    Export Battle Card <ArrowUpRight size={9} />
                  </Link>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── FEATURES BENTO ──────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-[#050c1a] relative">
        <div className="max-w-5xl mx-auto">

          <motion.div {...fadeUp(0)} className="mb-3">
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full inline-block">
              Core capabilities
            </span>
          </motion.div>
          <motion.div {...fadeUp(0.05)} className="mb-12">
            <h2 className="text-3xl lg:text-[42px] font-bold tracking-tight text-white leading-tight">
              Deep intelligence.<br className="hidden md:block" /> Built for your sales team.
            </h2>
          </motion.div>

          {/* Asymmetric bento: full width, then 2+1, then 1+2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Row 1: Full width feature */}
            <motion.div
              {...fadeUp(0.05)}
              className="md:col-span-3 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-6"
            >
              <div className="flex-1">
                <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4">
                  <TrendingUp size={18}  />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Pricing Grid Monitoring</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                  We scan HTML structures, pricing grids, and currency changes to detect discount models, bundle rates, or tier adjustments the moment they happen.
                </p>
              </div>
              <div className="flex-shrink-0 w-full sm:w-48 h-20 bg-[#030712] rounded-2xl border border-white/[0.04] overflow-hidden relative">
                <svg className="w-full h-full p-2" viewBox="0 0 180 64">
                  <path d="M 8 56 L 35 44 L 65 28 L 95 36 L 120 18 L 150 10 L 175 4" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M 8 56 L 35 44 L 65 28 L 95 36 L 120 18 L 150 10 L 175 4 L 175 64 L 8 64Z" fill="url(#chartFill)" />
                  <circle cx="175" cy="4" r="3" fill="#38bdf8" />
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="64">
                      <stop stopColor="#0ea5e9" stopOpacity="0.15" />
                      <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>

            {/* Row 2: 2 + 1 */}
            <motion.div
              {...fadeUp(0.1)}
              className="md:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 mb-4">
                <MessageSquare size={18}  />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Review Site Intelligence</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Watches G2, Trustpilot, and public forums. Automatically extracts feature complaints and service timeouts to locate users ready to churn away from competitors.
              </p>
              <div className="mt-4 space-y-2">
                {['G2 · Trustpilot', 'Capterra · Reddit', 'App Store · Play'].map((src) => (
                  <div key={src} className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> {src}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...fadeUp(0.12)}
              className="md:col-span-1 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4">
                <Zap size={18}  />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">AI Copilot Playbooks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generates targeted email scripts and landing page copy built around the competitor changes detected today.
              </p>
            </motion.div>

            {/* Row 3: 1 + 2 */}
            <motion.div
              {...fadeUp(0.14)}
              className="md:col-span-1 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4">
                <ShieldCheck size={18}  />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Zero-Access Crawling</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                100% cloud-hosted crawlers scan pages externally. No credentials, integrations, or developer steps required.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp(0.16)}
              className="md:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] transition-all duration-300"
            >
              <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 mb-4">
                <Calendar size={18}  />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">Historical Changelog</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Check chronological competitor visual logs. Understand their engineering speed, rebranding cycles, and positioning adjustments over time.
              </p>
              <div className="mt-5 flex items-center gap-0">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 border-r border-white/[0.04] last:border-r-0 flex items-end pb-1 px-0.5"
                  >
                    <div
                      className="w-full bg-sky-500/30 rounded-sm"
                      style={{ height: `${20 + Math.sin(i * 1.3) * 14}px`, opacity: 0.3 + i * 0.06 }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── BATTLE CARDS ────────────────────────────────────────────────── */}
      <section id="battle-card" className="py-24 px-6 bg-[#050c1a] relative">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <motion.div {...fadeUp(0)}>
              <h2 className="text-3xl lg:text-[42px] font-bold tracking-tight text-white leading-tight mb-3">
                Explore a live Battle Card
              </h2>
              <p className="text-zinc-400 text-sm max-w-sm">
                Generated every Monday for sales enablement, summarized into four actionable quadrants.
              </p>
            </motion.div>

            <div className="flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-full gap-0.5 flex-shrink-0">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full transition-colors cursor-pointer relative"
                  style={{ color: activeComp === comp ? '#ffffff' : '#6b7280' }}
                >
                  {activeComp === comp && (
                    <motion.div
                      layoutId="activeBattleTab"
                      className="absolute inset-0 bg-sky-600 rounded-full shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{comp}</span>
                </button>
              ))}
            </div>
          </div>

          <motion.div
            {...fadeUp(0.08)}
            className="border border-white/[0.06] rounded-3xl hover:border-white/[0.1] transition-colors duration-300 overflow-hidden bg-[#060b18]"
          >
            {/* Card header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${currentCard.logoColor} flex items-center justify-center`}>
                  <Crosshair size={13}  className="text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{currentCard.company} Battle Card</h4>
                  <p className="text-[10px] font-mono text-zinc-500">Weekly synthesis</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">{currentCard.date}</span>
            </div>

            {/* 4 quadrants */}
            <div className="grid md:grid-cols-2 divide-x divide-y divide-white/[0.05]">

              <div className="p-5 hover:bg-white/[0.01] transition-colors">
                <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 bg-sky-500/8 border border-sky-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                  Detected changes
                </div>
                <div className="space-y-3">
                  {currentCard.changes.map((row, j) => (
                    <div key={j} className="flex gap-2.5 items-start">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wide flex-shrink-0 mt-0.5 border ${row.tc}`}>
                        {row.tag}
                      </span>
                      <span className="text-xs text-zinc-300 leading-snug">{row.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 hover:bg-white/[0.01] transition-colors">
                <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 bg-red-500/8 border border-red-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                  User complaints
                </div>
                <div className="space-y-4">
                  {currentCard.complaints.map((c, j) => (
                    <div key={j} className="border-l-2 border-red-500/20 pl-3">
                      <p className="text-xs text-zinc-400 italic leading-relaxed">{c.text}</p>
                      <span className="text-[10px] font-mono text-zinc-600 mt-1 block">{c.source}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 hover:bg-white/[0.01] transition-colors">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                  Strategic signals
                </div>
                <div className="space-y-3">
                  {currentCard.signals.map((sig, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">›</span>
                      <p className="text-xs text-zinc-300 leading-snug">
                        <strong className="text-white font-semibold">{sig.bold}</strong>{sig.rest}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 hover:bg-white/[0.01] transition-colors">
                <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1 rounded-md inline-flex mb-4">
                  Playbook actions
                </div>
                <div className="space-y-2.5">
                  {currentCard.moves.map((move, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <CheckCircle2 size={14}  className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-zinc-300 leading-snug">{move}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── LOCAL BUSINESS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#040812] relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp(0)}>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mb-4">
                Built for local businesses too
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Not just SaaS. Crawl Google Maps reviews, social activity, and pricing for physical salons, cafes, gyms, and nearby competitors.
              </p>
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">
                See local plan <ArrowRight size={13} />
              </Link>
            </motion.div>
            <motion.div {...fadeUp(0.08)} className="grid grid-cols-1 gap-3">
              {[
                { icon: <Star size={15}  />, title: 'Google Reviews Track', body: 'Weekly alerts when a nearby competitor receives critical reviews.' },
                { icon: <Instagram size={15}  />, title: 'Social Actions Scan', body: 'Monitor local competitor Instagram and Facebook feeds without credentials.' },
                { icon: <CreditCard size={15}  />, title: 'Local Battle Playbooks', body: 'AI checklists: support gaps, price comparisons, promotion templates.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl hover:border-white/[0.1] transition-all duration-300">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white mb-0.5">{item.title}</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-[#050c1a] relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp(0)} className="mb-3">
            <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full inline-block">
              Pricing
            </span>
          </motion.div>
          <PricingBasic />
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#040812] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-950/5 to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] mb-5">
              Start tracking competitor movements today.
            </h2>
            <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed mb-8">
              14-day free trial. Monitor up to 7 competitors. Cancel with one click.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2.5 bg-white text-black font-semibold px-8 py-3.5 rounded-full hover:bg-zinc-100 active:scale-[0.98] transition-all text-sm"
            >
              Start free trial
              <ArrowRight size={13}  />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-10 mb-10 border-b border-white/[0.05]">

            {/* Brand */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded-lg">
                  <Crosshair size={11}  className="text-sky-400" />
                </div>
                <span className="text-sm font-semibold text-white">Competitor Analyzer</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                AI-driven competitive intelligence. Track pricing, reviews, and messaging shifts so you can act before the next sales call.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Product</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {['How it works', 'Command Center', 'Features', 'Battle CreditCard'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Sources</h4>
              <ul className="space-y-2 text-xs text-zinc-500">
                {['Google Reviews', 'G2 & Trustpilot', 'Landing pages', 'Public metadata'].map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Links</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                {['Privacy Policy', 'Terms of Service', 'Status', 'Contact'].map((l) => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-600 font-mono">
              &copy; {new Date().getFullYear()} Competitor Analyzer. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-zinc-500">
              <a href="#" className="hover:text-white transition-colors"><Twitter size={14} /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin size={14} /></a>
              <a href="#" className="hover:text-white transition-colors"><Github size={14} /></a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
