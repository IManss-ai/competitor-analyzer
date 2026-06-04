'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, ArrowRight, CheckCircle, Sparkle,
  Eye, MagnifyingGlass, Lightning,
  Star, InstagramLogo, Cards, TrendUp,
  ShieldCheck, Chats, CalendarBlank,
  GithubLogo, TwitterLogo, LinkedinLogo, Globe,
  ArrowUpRight, WarningCircle, Clipboard
} from '@phosphor-icons/react';
import DisplayCards from '@/components/ui/display-cards';
import { PricingBasic } from '@/components/ui/pricing-demo';

// Competitor mock data for feeds and battle cards
const FEED = [
  { company: 'Stripe', action: 'Removed flat pricing from enterprise pages', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Increased card processing fees to 3.49%', time: '6h ago', type: 'pricing' },
  { company: 'Braintree', action: 'Launched new bio-auth checkouts API v4', time: '1d ago', type: 'feature' },
  { company: 'Square', action: 'Changed POS hero to "Complete retail platform"', time: '2d ago', type: 'messaging' },
  { company: 'Adyen', action: 'Added 3 enterprise retail case studies', time: '3d ago', type: 'content' },
];

const TAG_STYLE: Record<string, string> = {
  pricing: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
  feature: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
  copy: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  messaging: 'bg-indigo-400/10 text-indigo-400 border border-indigo-400/20',
  content: 'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
};

const BATTLE_CARDS_DATA = {
  stripe: {
    company: 'Stripe',
    logoColor: 'bg-indigo-600',
    date: 'Updated today',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Removed enterprise flat-rates. Custom contract quote required.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Released Stripe Checkout v4.1 with optimized redirect latency.' },
      { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10 border-blue-400/20', text: 'Hero updated from "Payments infrastructure" to "Financial operations for global companies".' },
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
      { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10 border-blue-400/20', text: 'Hero copy focused on "Instant conversion optimization" rather than "Send money".' },
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
      'Highlight "No hidden percentage increases — simple flat rates" in your checkout flows.',
      'Write blog post "Why developer sandbox speed is critical for product launch".',
    ]
  },
  square: {
    company: 'Square',
    logoColor: 'bg-zinc-800',
    date: 'Updated 2 days ago',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Flat rate subscription fee changed to dynamic pricing on point-of-sale.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Launched POS v3 firmware with offline sync capabilities for retail terminals.' },
      { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10 border-blue-400/20', text: 'Hero changed from "Simple local commerce" to "The complete software & hardware platform".' },
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
      'Advertise "Dual-band Wi-Fi backup POS terminal integration" to counter connection drops.',
      'Target Square merchants with "Contract-free hardware replacement program".',
    ]
  }
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as any },
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeComp, setActiveComp] = useState<'stripe' | 'paypal' | 'square'>('stripe');
  const [emailInput, setEmailInput] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  
  // Dashboard demo state
  const [selectedDashboardComp, setSelectedDashboardComp] = useState<'stripe' | 'paypal' | 'square' | 'adyen'>('stripe');
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setNewsletterSubscribed(true);
      setEmailInput('');
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    }
  };

  const currentCard = BATTLE_CARDS_DATA[activeComp];

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 font-sans overflow-x-hidden selection:bg-blue-500/30 antialiased">
      
      {/* Ambient background glow - smooth, fixed, and performance optimized */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vh] rounded-full bg-blue-600/[0.04] blur-[150px]" />
        <div className="absolute top-[35%] left-[-15%] w-[60vw] h-[60vh] rounded-full bg-indigo-900/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[50vh] rounded-full bg-blue-800/[0.03] blur-[130px]" />
      </div>

      {/* FLOATING HEADER */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }}
          className={`w-full max-w-5xl rounded-full border border-white/[0.06] bg-zinc-950/40 backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'bg-zinc-950/80 border-white/[0.12] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Link href="#" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform duration-300">
                <Crosshair size={15} weight="bold" className="text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white group-hover:text-blue-400 transition-colors">Competitor Analyzer</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors duration-200">HOW IT WORKS</a>
            <a href="#dashboard-showcase" className="hover:text-white transition-colors duration-200">COMMAND CENTER</a>
            <a href="#features" className="hover:text-white transition-colors duration-200">FEATURES</a>
            <a href="#battle-card" className="hover:text-white transition-colors duration-200">BATTLE CARDS</a>
            <a href="#pricing" className="hover:text-white transition-colors duration-200">PRICING</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors hidden sm:block px-3 py-1">Sign in</Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white text-black pl-4 pr-2.5 py-1.5 rounded-full hover:scale-[1.025] hover:shadow-[0_4px_20px_rgba(255,255,255,0.25)] active:scale-[0.975] transition-all cursor-pointer"
            >
              <span>Get started</span>
              <ArrowRight size={10} weight="bold" />
            </Link>

            {/* Mobile Menu Icon */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 md:hidden flex flex-col gap-1 justify-center items-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Toggle navigation menu"
            >
              <span className={`w-4 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
              <span className={`w-4 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </button>
          </div>
        </motion.nav>
      </div>

      {/* MOBILE NAV PANEL */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-40 bg-zinc-950/90 flex flex-col justify-center px-8 md:hidden"
          >
            <div className="flex flex-col gap-6 text-2xl font-bold tracking-tight">
              {[
                { name: 'How it works', href: '#how-it-works' },
                { name: 'Command Center', href: '#dashboard-showcase' },
                { name: 'Features', href: '#features' },
                { name: 'Battle Card Preview', href: '#battle-card' },
                { name: 'Pricing Plans', href: '#pricing' },
                { name: 'Sign in to account', href: '/auth/login' }
              ].map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] as any }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-16 lg:pt-48 lg:pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          
          {/* Hero Copy */}
          <div>
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-6 border border-emerald-500/25 bg-emerald-500/5 px-3 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Competitor Monitoring
            </motion.div>

            <motion.h1
              {...fadeUp(0.08)}
              className="text-4xl sm:text-5xl lg:text-[68px] font-bold leading-[1.02] tracking-tight mb-6 text-white"
            >
              Turn competitor changes into <span className="text-blue-500">your sales pipeline.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="text-zinc-400 text-base leading-relaxed max-w-lg mb-8"
            >
              We crawl competitor landing pages, pricing grids, and public reviews 24/7. When a competitor shifts pricing or drops support, get an automated AI playbook detailing exactly how to win their customers.
            </motion.p>

            <motion.div {...fadeUp(0.24)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-3 bg-white text-black font-semibold px-6 py-3 rounded-full hover:scale-[1.025] hover:shadow-[0_4px_24px_rgba(255,255,255,0.18)] active:scale-[0.985] transition-all duration-300 text-sm cursor-pointer"
              >
                <span>Start 14-day free trial</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
              <a
                href="#dashboard-showcase"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-zinc-300 text-sm font-medium rounded-full hover:border-white/30 hover:text-white hover:bg-white/[0.02] hover:scale-[1.015] active:scale-[0.985] transition-all duration-300"
              >
                Watch Command Center
              </a>
            </motion.div>

            <motion.div {...fadeUp(0.32)} className="flex items-center gap-6 text-xs text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-blue-500" /> No credit card</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-blue-500" /> Cancel anytime</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-blue-500" /> 5 min setup</span>
            </motion.div>
          </div>

          {/* Hero Live Feed Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as any }}
            className="relative"
          >
            {/* Outer shadow card container */}
            <div className="p-2 bg-white/[0.03] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden group hover:border-white/20 hover:scale-[1.008] transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />

              {/* Inner bezel */}
              <div className="relative bg-zinc-950 border border-white/5 rounded-xl overflow-hidden">
                {/* Traffic buttons / Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 tracking-wider ml-1">stream_detector.log</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 font-semibold tracking-wider">MONITORING</span>
                  </div>
                </div>

                {/* Log Stream */}
                <div className="p-4 font-mono text-xs space-y-3.5">
                  <div className="text-zinc-500 text-[10px] border-b border-white/[0.03] pb-1.5">
                    $ init: tracking 5 competitor domains -- scan loop interval 10s
                  </div>
                  <div className="space-y-3">
                    {FEED.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 border-b border-white/[0.02] pb-2 last:border-0 hover:bg-white/[0.02] hover:scale-[1.015] p-1.5 rounded transition-all duration-200 cursor-default"
                      >
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-medium flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type]}`}>
                          {item.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-zinc-200">{item.company}</span>
                          <span className="text-zinc-400 ml-1.5 leading-snug">{item.action}</span>
                        </div>
                        <span className="text-zinc-600 text-[10px] whitespace-nowrap pl-2">{item.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between font-mono text-[10px]">
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <Sparkle weight="fill" size={11} className="text-blue-400" />
                      Auto-playbook generated
                    </span>
                    <span className="text-zinc-500">Live UTC</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST / METRICS BAR */}
      <div className="relative z-10 border-y border-white/[0.05] bg-zinc-950/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05] text-center">
          {[
            { metric: '30x cheaper', label: 'vs manual consultant fees' },
            { metric: '100% Legal', label: 'uses public page archives' },
            { metric: '5 min', label: 'average setup time' },
            { metric: '14 days', label: 'free trial duration' },
          ].map((s, i) => (
            <motion.div
              key={i}
              {...fadeUp(i * 0.05)}
              className="py-6 px-4 group hover:bg-white/[0.01] hover:scale-[1.02] transition-all duration-300"
            >
              <div className="text-2xl font-bold font-mono text-white tracking-tight">{s.metric}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WHY COMPETITOR ANALYZER: Chaos vs Clarity */}
      <section className="relative z-10 py-24 px-6 bg-zinc-950/30 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                The Status Quo
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-[1.05] mb-6">
                Manual competitor tracking is broken.<br />
                <span className="text-zinc-500 font-normal">We automated the workflow.</span>
              </h2>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            
            {/* The Old Way */}
            <motion.div
              {...fadeUp(0.1)}
              className="bg-zinc-950 border border-red-500/10 p-8 rounded-2xl group hover:border-red-500/20 hover:scale-[1.01] transition-all duration-300"
            >
              <h3 className="text-base font-bold text-red-400 font-mono mb-6 uppercase tracking-wider">THE MANUAL CHAOS (BEFORE)</h3>
              <ul className="space-y-4 text-sm text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                  <span><strong>Refreshing pages:</strong> Manually checking pricing pages weekly. Tedious and unreliable.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                  <span><strong>Surprise sales objections:</strong> Finding out a competitor changed pricing only when a prospect tells you.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
                  <span><strong>Untracked reviews:</strong> Missing angry user complaints on G2 where users are ready to churn to you.</span>
                </li>
              </ul>
            </motion.div>

            {/* The Analyzer Way */}
            <motion.div
              {...fadeUp(0.2)}
              className="bg-zinc-950 border border-blue-500/20 p-8 rounded-2xl group hover:border-blue-500/40 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              <h3 className="text-base font-bold text-blue-400 font-mono mb-6 uppercase tracking-wider">THE COMPETITOR ANALYZER WAY (AFTER)</h3>
              <ul className="space-y-4 text-sm text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg leading-none mt-0.5">✓</span>
                  <span><strong>Automated daily crawls:</strong> Instant triggers flag code, tag, and asset changes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg leading-none mt-0.5">✓</span>
                  <span><strong>AI counter-playbooks:</strong> Get custom-crafted email sequences to pitch competitor users.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg leading-none mt-0.5">✓</span>
                  <span><strong>Review intelligence:</strong> Instantly notifies sales teams when competitor rating averages drop.</span>
                </li>
              </ul>
            </motion.div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-b border-white/[0.05]">
        <div className="grid lg:grid-cols-[40%_60%] gap-12 items-start">
          
          <div className="lg:sticky lg:top-28">
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest border border-blue-500/20 bg-blue-500/5 px-3 py-1 rounded-full mb-4 inline-block">
              Automation flow
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Continuous scans.<br />
              <span className="text-zinc-500">Actionable plays.</span>
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              We monitor their public interfaces every day. No complicated SDK integrations, code changes, or permissions required.
            </p>
          </div>

          <div className="space-y-5">
            {[
              {
                step: '01',
                title: 'Register competitor URLs',
                body: 'Add the domains of up to 7 competitors. We automatically scan their homepages, pricing grids, developer docs, and social feeds.',
                icon: <Eye size={18} weight="bold" />
              },
              {
                step: '02',
                title: 'AI analyzes modifications',
                body: 'Our engine parses changes daily. When a pricing tier is tweaked or support complains pile up, AI formats it into clean insights.',
                icon: <MagnifyingGlass size={18} weight="bold" />
              },
              {
                step: '03',
                title: 'Get your sales playbook',
                body: 'Every Monday, receive a clean executive brief outlining their modifications, friction points, and your exact response script.',
                icon: <Lightning size={18} weight="bold" />
              }
            ].map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.1)}
                className="p-0.5 bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/25 hover:scale-[1.01] transition-all duration-300 rounded-xl group cursor-default"
              >
                <div className="bg-[#0b0b0f] p-5 rounded-[10px] flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-all">
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                      <span className="text-[10px] font-mono text-zinc-600">{s.step}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* DASHBOARD SHOWCASE (Replaces the broken 3D scrolling component) */}
      <section id="dashboard-showcase" className="relative z-10 py-24 px-6 border-b border-white/[0.05] bg-zinc-950/20">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-14">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest border border-blue-500/20 bg-blue-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                PRODUCT PREVIEW
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-none mb-4">
                The Intelligence Command Center
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                No flying 3D visuals. Just a clean, highly convenient dashboard detailing every competitor movement.
              </p>
            </motion.div>
          </div>

          {/* Gorgeous Dashboard Mockup Container */}
          <motion.div
            {...fadeUp(0.1)}
            className="p-2 bg-white/[0.02] border border-white/[0.08] rounded-2xl shadow-3xl overflow-hidden max-w-5xl mx-auto"
          >
            <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden grid md:grid-cols-[200px_1fr] min-h-[480px]">
              
              {/* Mockup Sidebar */}
              <div className="border-r border-white/[0.05] bg-zinc-900/10 p-4 space-y-6">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">TRACKED COMPANIES</div>
                  <div className="space-y-1">
                    {(['stripe', 'paypal', 'square', 'adyen'] as const).map((comp) => (
                      <button
                        key={comp}
                        onClick={() => setSelectedDashboardComp(comp)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-all duration-200 cursor-pointer ${
                          selectedDashboardComp === comp
                            ? 'bg-blue-600/10 border border-blue-500/20 text-white'
                            : 'text-zinc-400 hover:bg-white/[0.02] hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="capitalize">{comp}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.03] space-y-2">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">CRAWL FREQUENCY</div>
                  <div className="text-xs text-white/70 font-semibold px-3 py-1 bg-white/[0.03] rounded-md inline-block font-mono">
                    1 scan / 4 hours
                  </div>
                </div>
              </div>

              {/* Mockup Core Dashboard Panel */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  
                  {/* Panel Top bar */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/[0.05] pb-4 mb-5">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <TrendUp size={16} className="text-blue-500" />
                        <span>Intel Feed &mdash; <span className="capitalize text-blue-400 font-semibold">{selectedDashboardComp}</span></span>
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500">Live monitoring active · last scan 12 minutes ago</p>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono bg-zinc-900 border border-white/5 text-zinc-300 px-2.5 py-1 rounded-md">
                        Feed type: ALL
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Alert View based on sidebar selection */}
                  <div className="space-y-4">
                    
                    {/* Stat Cards Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg text-left">
                        <div className="text-[10px] font-mono text-zinc-500">MONITORED PAGES</div>
                        <div className="text-base font-bold font-mono text-white mt-1">4 targets</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg text-left">
                        <div className="text-[10px] font-mono text-zinc-500">ALERT DENSITY</div>
                        <div className="text-base font-bold font-mono text-amber-400 mt-1">3 changes</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg text-left">
                        <div className="text-[10px] font-mono text-zinc-500">OPPORTUNITIES</div>
                        <div className="text-base font-bold font-mono text-emerald-400 mt-1">2 plays</div>
                      </div>
                    </div>

                    {/* Change highlight */}
                    <div className="bg-[#0b0b0f] border border-white/[0.05] p-4 rounded-xl text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          PRICING UPDATE DETECTED
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">June 4, 2026</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1.5">
                        {selectedDashboardComp === 'stripe' && 'Removed flat-rate pricing for enterprise accounts ($99/mo tier grandfathered)'}
                        {selectedDashboardComp === 'paypal' && 'Merchant card transaction fee adjusted from 2.9% to 3.49% flat rate'}
                        {selectedDashboardComp === 'square' && 'POS Terminal firmware update v3.1 introducing dynamic check fees'}
                        {selectedDashboardComp === 'adyen' && 'Added custom POS redirect APIs + changed EMEA support tiers'}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {selectedDashboardComp === 'stripe' && 'All enterprise leads are now redirected to the "Contact Sales" pipeline, hiding exact transaction fee discounts. Support complaints show standard enterprise churn.'}
                        {selectedDashboardComp === 'paypal' && 'This rate change increases merchant billing overhead by 20%. Developers report sandbox instability following biometric checkout changes.'}
                        {selectedDashboardComp === 'square' && 'POS terminals report Wi-Fi dropping issues during heavy retail store checkout hours.'}
                        {selectedDashboardComp === 'adyen' && 'Focusing heavily on enterprise custom retail integrations. Small merchant SLA support shifted to ticket system.'}
                      </p>
                    </div>

                    {/* Automated Playbook Play */}
                    <div className="bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-xl text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-mono font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                          <CheckCircle size={10} weight="fill" />
                          <span>SUGGESTED SALES PLAYBOOK</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-snug">
                          {selectedDashboardComp === 'stripe' && 'Email script targeting Stripe companies flagging transparent flat support agreements.'}
                          {selectedDashboardComp === 'paypal' && 'Promotional campaign addressing developers: "Zero-latency sandbox trial & transparent flat billing".'}
                          {selectedDashboardComp === 'square' && 'Ad sequence targeting retail merchants highlighting terminal offline-mode robustness.'}
                          {selectedDashboardComp === 'adyen' && 'Targeting mid-market merchants looking for dedicated phone support lines.'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setCopiedPlaybook(true);
                          setTimeout(() => setCopiedPlaybook(false), 2000);
                        }}
                        className="self-start sm:self-center px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        <Clipboard size={11} />
                        <span>{copiedPlaybook ? 'Copied script' : 'Copy copy script'}</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-4 mt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-500">
                  <span>Monitor output targets: 4 pages, 2 API routes, 1 documentation path</span>
                  <Link href="/auth/login" className="text-blue-400 hover:underline flex items-center gap-1 font-mono">
                    <span>Export Battle Card PDF</span>
                    <ArrowUpRight size={10} />
                  </Link>
                </div>

              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* CORE FEATURES BENTO */}
      <section id="features" className="relative z-10 py-24 px-6 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest border border-blue-500/20 bg-blue-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                Core capabilities
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-none">
                Deep intelligence. Legal compliance.
              </h2>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-6 gap-6 max-w-5xl mx-auto">
            {/* 1 */}
            <motion.div
              {...fadeUp(0.05)}
              className="md:col-span-3 bg-zinc-950 border border-white/[0.06] hover:border-blue-500/20 hover:scale-[1.01] hover:-translate-y-0.5 p-6 rounded-2xl transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/25 rounded-lg flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-600/20 transition-all">
                <TrendUp size={20} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Pricing Grids Monitoring</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We scan HTML elements, custom pricing grids, and currency changes to detect discount models, bundle rates, or tier adjustments instantly.
              </p>
            </motion.div>

            {/* 2 */}
            <motion.div
              {...fadeUp(0.1)}
              className="md:col-span-3 bg-zinc-950 border border-white/[0.06] hover:border-emerald-500/20 hover:scale-[1.01] hover:-translate-y-0.5 p-6 rounded-2xl transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-emerald-600/10 border border-emerald-500/25 rounded-lg flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-600/20 transition-all">
                <Chats size={20} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Review Site Scraping</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Watches G2, Trustpilot, and public forums. Automatically extracts feature complaints and service timeouts to locate users ready to churn.
              </p>
            </motion.div>

            {/* 3 */}
            <motion.div
              {...fadeUp(0.15)}
              className="md:col-span-2 bg-zinc-950 border border-white/[0.06] hover:border-purple-500/20 hover:scale-[1.01] hover:-translate-y-0.5 p-6 rounded-2xl transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-purple-600/10 border border-purple-500/25 rounded-lg flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-600/20 transition-all">
                <Lightning size={20} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">AI Copilot Playbooks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generates responsive email templates and target landing page guidelines designed around the competitor changes flagged today.
              </p>
            </motion.div>

            {/* 4 */}
            <motion.div
              {...fadeUp(0.2)}
              className="md:col-span-2 bg-zinc-950 border border-white/[0.06] hover:border-amber-500/20 hover:scale-[1.01] hover:-translate-y-0.5 p-6 rounded-2xl transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-amber-600/10 border border-amber-500/25 rounded-lg flex items-center justify-center text-amber-400 mb-4 group-hover:bg-amber-600/20 transition-all">
                <CalendarBlank size={20} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Historical Changelog</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Check chronological competitor visual logs. Understand their engineering speed, rebranding cycles, and positioning adjustments.
              </p>
            </motion.div>

            {/* 5 */}
            <motion.div
              {...fadeUp(0.25)}
              className="md:col-span-2 bg-zinc-950 border border-white/[0.06] hover:border-blue-500/20 hover:scale-[1.01] hover:-translate-y-0.5 p-6 rounded-2xl transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/25 rounded-lg flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-600/20 transition-all">
                <ShieldCheck size={20} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Zero-Access Crawling</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                100% cloud-hosted crawlers scan pages externally. No credentials, integrations, or developer steps required.
              </p>
            </motion.div>
          </div>

        </div>
      </section>

      {/* INTERACTIVE BATTLE CARD preview */}
      <section id="battle-card" className="relative z-10 py-24 px-6 border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                Interactive Preview
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-none mb-3">
                Explore a live Battle Card
              </h2>
              <p className="text-zinc-400 text-xs max-w-sm">
                Generated every Monday morning for sales enablement, summarized into four key actionable quadrants.
              </p>
            </div>

            {/* Switchers */}
            <div className="flex p-1 bg-white/[0.02] border border-white/[0.06] rounded-full gap-1 flex-shrink-0">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  className={`text-xs font-semibold px-4.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    activeComp === comp
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {comp.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Battle Card UI */}
          <motion.div
            layoutId="battle-card-panel"
            className="p-1 bg-white/[0.02] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.04] bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${currentCard.logoColor} flex items-center justify-center shadow-md`}>
                    <Crosshair size={14} weight="bold" className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{currentCard.company} Report</h4>
                    <p className="text-[9px] font-mono text-zinc-500">Live Weekly Synthesizer</p>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">{currentCard.date}</div>
              </div>

              {/* Grid Quadrants */}
              <div className="grid md:grid-cols-2 divide-x divide-y divide-white/[0.04] bg-white/[0.02]">
                
                {/* 1 */}
                <div className="p-6 text-left hover:bg-white/[0.01] transition-colors duration-200">
                  <div className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-blue-400 mb-4 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    01 · DETECTED CHANGES
                  </div>
                  <div className="space-y-3.5">
                    {currentCard.changes.map((row, j) => (
                      <div key={j} className="flex gap-2.5 items-start">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 mt-0.5 border ${row.tc}`}>
                          {row.tag}
                        </span>
                        <span className="text-xs text-zinc-300 leading-snug">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2 */}
                <div className="p-6 text-left hover:bg-white/[0.01] transition-colors duration-200">
                  <div className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-red-400 mb-4 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    02 · USER COMPLAINTS
                  </div>
                  <div className="space-y-4">
                    {currentCard.complaints.map((c, j) => (
                      <div key={j} className="border-l-2 border-red-500/20 pl-3">
                        <p className="text-xs text-zinc-400 italic leading-relaxed">{c.text}</p>
                        <span className="text-[9px] font-mono text-zinc-600 mt-1 block">{c.source}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 */}
                <div className="p-6 text-left hover:bg-white/[0.01] transition-colors duration-200">
                  <div className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-amber-400 mb-4 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    03 · STRATEGIC SIGNALS
                  </div>
                  <div className="space-y-3.5">
                    {currentCard.signals.map((sig, j) => (
                      <div key={j} className="flex gap-2 items-start">
                        <span className="text-amber-500 text-xs mt-0.5">›</span>
                        <p className="text-xs text-zinc-300 leading-snug">
                          <strong className="text-white font-medium">{sig.bold}</strong>{sig.rest}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4 */}
                <div className="p-6 text-left hover:bg-white/[0.01] transition-colors duration-200">
                  <div className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-emerald-400 mb-4 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    04 · PLAYBOOK ACTIONS
                  </div>
                  <div className="space-y-3">
                    {currentCard.moves.map((move, j) => (
                      <div key={j} className="flex gap-2 items-start">
                        <CheckCircle size={15} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-zinc-300 leading-snug">{move}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* LOCAL BUSINESS EXCLUSIVES */}
      <section className="relative z-10 py-24 px-6 border-b border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                Local Markets
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-none">
                Built for local companies too
              </h2>
              <p className="text-zinc-400 text-xs mt-3 max-w-sm mx-auto">
                Not just SaaS. Crawl Google Maps reviews, social activity logs, and pricing charts for physical salons, cafes, gyms, and competitors nearby.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Google Reviews Track',
                body: 'Get notified weekly when a nearby competitor receives critical reviews so you can adjust your positioning.',
                icon: <Star size={20} weight="fill" />
              },
              {
                title: 'Social Actions Scan',
                body: 'Monitor local competitor Instagram and Facebook feeds without manual credentials or logging in.',
                icon: <InstagramLogo size={20} weight="fill" />
              },
              {
                title: 'Local Battle Playbooks',
                body: 'AI-generated checklists outlining support gaps, price comparisons, and target promotion templates.',
                icon: <Cards size={20} weight="fill" />
              }
            ].map((card, i) => (
              <motion.div
                key={card.title}
                {...fadeUp(i * 0.08)}
                className="bg-zinc-950 border border-white/[0.06] hover:border-emerald-500/20 hover:scale-[1.02] p-5 rounded-xl transition-all duration-300 group cursor-default"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/25 transition-all">
                  {card.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{card.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* PRICING PLANS */}
      <section id="pricing" className="relative z-10 py-24 px-6 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <PricingBasic />
        </div>
      </section>

      {/* RECENT TRIGGERS SCREEN */}
      <section className="relative z-10 py-16 px-6 bg-zinc-950/20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6">Recent intelligence scanning feeds</p>
          <motion.div {...fadeUp(0.05)}>
            <DisplayCards />
          </motion.div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="relative z-10 py-32 px-6 bg-zinc-950 border-t border-white/[0.02]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] mb-6">
              Start tracking competitor movements <span className="text-blue-500">automatically today.</span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
              Claim your 14-day free trial now. Monitor up to 7 competitors. Cancel with a single click inside settings.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-3 bg-white text-black font-semibold px-6 py-3 rounded-full hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(255,255,255,0.22)] active:scale-[0.985] transition-all duration-300 text-sm cursor-pointer"
            >
              <span>Get started with 14-day trial</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* COMPREHENSIVE FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] py-16 px-6 bg-zinc-950/80">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 pb-12">
          
          {/* Brand block */}
          <div className="col-span-2 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600/10 border border-blue-500/25 flex items-center justify-center rounded-lg">
                <Crosshair size={12} weight="bold" className="text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-white">Competitor Analyzer</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              AI-driven competitive intelligence platform. Tracking pricing updates, support reviews, and marketing copy adjustments so founders can stay ahead.
            </p>
            <p className="text-[10px] text-zinc-600 font-mono">Compliance certified · Cloud infrastructure</p>
          </div>

          {/* Links: Product */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Product</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#dashboard-showcase" className="hover:text-white transition-colors">Command Center</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features list</a></li>
              <li><a href="#battle-card" className="hover:text-white transition-colors">Battle Cards</a></li>
            </ul>
          </div>

          {/* Links: Integrations */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Sources</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li><span className="text-zinc-600">Google Reviews</span></li>
              <li><span className="text-zinc-600">G2 & Trustpilot</span></li>
              <li><span className="text-zinc-600">Polar.sh Payments</span></li>
              <li><span className="text-zinc-600">Public metadata</span></li>
            </ul>
          </div>

          {/* Newsletter / Subscribe */}
          <div className="col-span-2 md:col-span-1 space-y-3 text-left">
            <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Weekly Intel</h4>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                placeholder="name@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
              <button
                type="submit"
                className="w-full py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-[11px] rounded-lg cursor-pointer transition-all"
              >
                {newsletterSubscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="max-w-5xl mx-auto border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-zinc-600 font-mono">
            &copy; {new Date().getFullYear()} Competitor Analyzer. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-zinc-500">
            <a href="#" className="hover:text-white transition-colors"><TwitterLogo size={15} /></a>
            <a href="#" className="hover:text-white transition-colors"><LinkedinLogo size={15} /></a>
            <a href="#" className="hover:text-white transition-colors"><GithubLogo size={15} /></a>
          </div>
        </div>
      </footer>

    </div>
  );
}
