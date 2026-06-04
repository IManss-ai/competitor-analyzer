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
  copy: 'bg-sky-400/10 text-sky-400 border border-sky-400/20',
  messaging: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
  content: 'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
};

const BATTLE_CARDS_DATA = {
  stripe: {
    company: 'Stripe',
    logoColor: 'bg-sky-600',
    date: 'Updated today',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Removed enterprise flat-rates. Custom contract quote required.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Released Stripe Checkout v4.1 with optimized redirect latency.' },
      { tag: 'copy', tc: 'text-sky-400 bg-sky-400/10 border-sky-400/20', text: 'Hero updated from "Payments infrastructure" to "Financial operations for global companies".' },
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
      { tag: 'copy', tc: 'text-sky-400 bg-sky-400/10 border-sky-400/20', text: 'Hero copy focused on "Instant conversion optimization" rather than "Send money".' },
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
      { tag: 'copy', tc: 'text-sky-400 bg-sky-400/10 border-sky-400/20', text: 'Hero changed from "Simple local commerce" to "The complete software & hardware platform".' },
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
    <div className="min-h-[100dvh] bg-[#030712] text-[#f8fafc] font-sans overflow-x-hidden selection:bg-sky-500/30 antialiased relative">
      
      {/* Inline styles for animated flow curves */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes flowLine {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-flow-line {
          stroke-dasharray: 6 6;
          animation: flowLine 2s linear infinite;
        }
      `}} />

      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(14, 165, 233, 0.12) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Elegant Fluid Ribbon Wave at the top (Steel blue / cyan aesthetic) */}
      <div className="absolute top-0 inset-x-0 h-[480px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[140%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-600/15 via-slate-950/5 to-transparent blur-[95px]" />
        
        {/* Glowing fluid paths */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full min-w-[1200px] h-[380px] opacity-35 mix-blend-screen" viewBox="0 0 1440 380" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80C350 200 680 -40 980 120C1280 280 1350 160 1440 100V0H0V80Z" fill="url(#paint0_linear_hero)" />
          <path d="M0 120C450 240 750 30 1050 180C1250 280 1380 200 1440 140V0H0V120Z" fill="url(#paint1_linear_hero)" />
          <defs>
            <linearGradient id="paint0_linear_hero" x1="0" y1="0" x2="1440" y2="280" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="0.5" stopColor="#67e8f9" stopOpacity="0.15" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="paint1_linear_hero" x1="1440" y1="0" x2="0" y2="320" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0ea5e9" stopOpacity="0.3" />
              <stop offset="0.5" stopColor="#0891b2" stopOpacity="0.1" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* FLOATING HEADER */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }}
          className={`w-full max-w-5xl rounded-full border border-white/[0.04] bg-[#070b13]/40 backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'bg-[#030712]/85 border-sky-500/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)]' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Link href="#" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.35)] group-hover:scale-105 transition-transform duration-300">
                <Crosshair size={15} weight="bold" className="text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white group-hover:text-sky-300 transition-colors">Competitor Analyzer</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-wider text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors duration-200">HOW IT WORKS</a>
            <a href="#pipeline" className="hover:text-white transition-colors duration-200">INTELLIGENCE FLOW</a>
            <a href="#dashboard-showcase" className="hover:text-white transition-colors duration-200">COMMAND CENTER</a>
            <a href="#features" className="hover:text-white transition-colors duration-200">FEATURES</a>
            <a href="#battle-card" className="hover:text-white transition-colors duration-200">BATTLE CARDS</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors hidden sm:block px-3 py-1">Sign in</Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-black pl-4 pr-3 py-1.5 rounded-full hover:scale-[1.025] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.975] transition-all cursor-pointer"
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
                { name: 'Intelligence Flow', href: '#pipeline' },
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
      <section className="relative z-10 pt-36 pb-20 lg:pt-44 lg:pb-24 px-6 max-w-7xl mx-auto text-center">
        {/* Centered Pill Badge (Fluxor style) */}
        <motion.div
          {...fadeUp(0)}
          className="inline-flex items-center gap-2.5 bg-[#0a0e17]/80 border border-sky-500/20 px-3.5 py-1.5 rounded-full text-xs font-medium text-sky-300 backdrop-blur-md mb-8 hover:border-sky-500/40 transition-colors shadow-lg shadow-sky-950/20 cursor-default"
        >
          <div className="flex -space-x-1.5 overflow-hidden">
            <img className="inline-block h-4 w-4 rounded-full ring-1 ring-[#030712]" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=96&h=96&q=80" alt="avatar 1" />
            <img className="inline-block h-4 w-4 rounded-full ring-1 ring-[#030712]" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=96&h=96&q=80" alt="avatar 2" />
            <img className="inline-block h-4 w-4 rounded-full ring-1 ring-[#04020a]" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=96&h=96&q=80" alt="avatar 3" />
          </div>
          <span className="text-[10px] font-mono tracking-tight uppercase">Live Competitor Monitoring Active</span>
        </motion.div>

        {/* Serif Italic Styled Heading (spaceedu/Earth style) */}
        <motion.h1
          {...fadeUp(0.08)}
          className="text-5xl sm:text-6xl lg:text-[76px] font-bold leading-[1.04] tracking-tight mb-8 text-white max-w-5xl mx-auto"
        >
          Turn competitor changes <br className="hidden md:inline" />
          into <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#f8fafc] via-[#e2e8f0] to-[#38bdf8] shadow-sm">your sales playbook.</span>
        </motion.h1>

        {/* Centered Subtitle */}
        <motion.p
          {...fadeUp(0.16)}
          className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10"
        >
          We crawl competitor landing pages, pricing grids, and public reviews 24/7. When a competitor shifts pricing or drops support, get an automated AI playbook detailing exactly how to win their customers.
        </motion.p>

        {/* Centered Buttons */}
        <motion.div {...fadeUp(0.24)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-3 bg-white text-black font-semibold px-8 py-3.5 rounded-full hover:scale-[1.025] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.985] transition-all duration-300 text-sm cursor-pointer"
          >
            <span>Start 14-day free trial</span>
            <ArrowRight size={13} weight="bold" />
          </Link>
          <a
            href="#dashboard-showcase"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/10 text-zinc-300 text-sm font-semibold rounded-full hover:border-sky-500/40 hover:text-white hover:bg-sky-950/[0.1] hover:scale-[1.015] active:scale-[0.985] transition-all duration-300 backdrop-blur-sm"
          >
            Watch Command Center
          </a>
        </motion.div>

        {/* Trust Badges */}
        <motion.div {...fadeUp(0.3)} className="flex items-center justify-center gap-6 sm:gap-8 text-xs text-zinc-500 font-mono mb-16">
          <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-sky-500" /> No credit card</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-sky-500" /> Cancel anytime</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={14} weight="fill" className="text-sky-500" /> 5 min setup</span>
        </motion.div>

        {/* Centered Stream Detector Widget (as a gorgeous floating window) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] as any }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Neon outer glow */}
          <div className="absolute inset-[-1px] bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-blue-500/10 rounded-2xl blur-xl opacity-60 z-0" />
          
          <div className="p-2 bg-[#070b13]/30 border border-sky-500/10 rounded-2xl shadow-3xl relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500 z-10 backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />

            {/* Inner bezel */}
            <div className="relative bg-[#030712] border border-white/[0.04] rounded-xl overflow-hidden text-left">
              {/* Traffic buttons / Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-[#070b13]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 tracking-wider ml-1">stream_detector.log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-sky-400 font-semibold tracking-wider">MONITORING LIVE FEED</span>
                </div>
              </div>

              {/* Log Stream */}
              <div className="p-5 font-mono text-xs space-y-4">
                <div className="text-zinc-500 text-[10px] border-b border-white/[0.03] pb-2 flex justify-between">
                  <span>$ init: tracking 5 competitor domains -- scan loop interval 10s</span>
                  <span className="text-sky-400/80">HTTPS connection encrypted</span>
                </div>
                <div className="space-y-3">
                  {FEED.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 border-b border-white/[0.01] pb-2.5 last:border-0 hover:bg-white/[0.02] p-2 rounded transition-all duration-200 cursor-default"
                    >
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-medium flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type] || 'bg-sky-400/10 text-sky-400 border border-sky-400/20'}`}>
                        {item.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-zinc-200">{item.company}</span>
                        <span className="text-zinc-400 ml-1.5 leading-snug">{item.action}</span>
                      </div>
                      <span className="text-zinc-500 text-[10px] whitespace-nowrap pl-2">{item.time}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between font-mono text-[10px]">
                  <span className="text-sky-400 flex items-center gap-1.5">
                    <Sparkle weight="fill" size={11} className="text-sky-400 animate-spin" style={{ animationDuration: '4s' }} />
                    Auto-playbook generated
                  </span>
                  <span className="text-zinc-500">Live UTC</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* TRUSTED BY LOGOS (Sleek monochrome row) */}
      <section className="relative z-10 py-10 border-y border-white/[0.04] bg-[#03050c]/70 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-6 text-center">
            Trusted by hyper-growth teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-45">
            {['Acme Corp', 'Echo Valley', 'Celestial', 'Quantum Labs', 'Apex Data', 'Pulse Flow'].map((logo) => (
              <span key={logo} className="text-xs font-semibold tracking-widest text-zinc-450 font-mono hover:text-white transition-colors duration-200 cursor-default">
                {logo.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS TIMELINE (Steel blue style) */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-6xl mx-auto border-b border-white/[0.04]">
        <div className="text-center mb-16">
          <motion.div {...fadeUp(0)}>
            <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
              Automation flow
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-4">
              Continuous scans. <span className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-slate-200 font-normal">Actionable plays.</span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              We monitor their public interfaces every day. No complicated SDK integrations, code changes, or permissions required.
            </p>
          </motion.div>
        </div>

        {/* Timeline block */}
        <div className="relative mt-20 max-w-5xl mx-auto">
          {/* Horizontal Line for Desktop */}
          <div className="absolute top-6 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent hidden md:block z-0" />

          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {[
              {
                step: 'Step 01',
                title: 'Register competitor URLs',
                body: 'Add the domains of up to 7 competitors. We automatically scan their homepages, pricing grids, developer docs, and social feeds.',
                icon: <Eye size={18} weight="bold" />
              },
              {
                step: 'Step 02',
                title: 'AI analyzes modifications',
                body: 'Our engine parses changes daily. When a pricing tier is tweaked or support complaints pile up, AI formats it into clean insights.',
                icon: <MagnifyingGlass size={18} weight="bold" />
              },
              {
                step: 'Step 03',
                title: 'Get your sales playbook',
                body: 'Every Monday, receive a clean executive brief outlining their modifications, friction points, and your exact response script.',
                icon: <Lightning size={18} weight="bold" />
              }
            ].map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.1)}
                className="flex flex-col items-center group text-center md:text-left"
              >
                {/* Step badge */}
                <div className="px-3 py-1 bg-sky-950/40 border border-sky-500/40 rounded-full text-sky-300 font-mono text-[10px] tracking-wide mb-6 shadow-[0_0_15px_rgba(14,165,233,0.2)] z-10 group-hover:scale-105 transition-all">
                  {s.step}
                </div>

                {/* Card */}
                <div className="bg-[#070b13]/50 border border-white/[0.04] hover:border-sky-500/20 backdrop-blur-md p-6 rounded-2xl transition-all duration-300 shadow-xl w-full min-h-[220px]">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 mx-auto md:mx-0">
                    {s.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEMA PIPELINE (Fluxor curved-bezier pipeline flow diagram - Steel blue/cyan) */}
      <section id="pipeline" className="relative z-10 py-24 px-6 bg-[#040711] border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                High-Performance Engine
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-4">
                Continuous, automated intelligence flows
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Watch how our system ingests external data points, routes them through classification hubs, and synthesizes sales playbooks.
              </p>
            </motion.div>
          </div>

          {/* Desktop flow diagram */}
          <div className="hidden lg:grid grid-cols-[1fr_220px_1fr] items-center gap-6 max-w-4xl mx-auto relative h-[360px] mt-12">
            
            {/* Column 1: Left Boxes (Ingestion Sources) */}
            <div className="flex flex-col justify-between h-[340px] pr-6">
              {[
                { title: 'Pricing API Targets', text: 'Scans HTML structures for discount modifications' },
                { title: 'Landing Page HTML', text: 'Tracks hero copy, header elements, and positioning shifts' },
                { title: 'Trustpilot & G2 Reviews', text: 'Aggregates feature timeouts and SLA service complaints' },
                { title: 'Social Activity Logs', text: 'Gathers hiring patterns and regional marketing campaigns' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  {...fadeUp(idx * 0.05)}
                  className="bg-[#070b13]/75 border border-white/[0.04] rounded-xl px-4 py-2.5 text-left backdrop-blur-sm relative z-20 group hover:border-sky-500/30 transition-all duration-300"
                >
                  <h4 className="text-xs font-bold text-sky-300">{item.title}</h4>
                  <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{item.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Column 2: Center Hub & SVG Lines */}
            <div className="relative w-[220px] h-[340px] flex items-center justify-center">
              {/* Core Hub */}
              <div className="w-14 h-14 rounded-2xl bg-[#0b1528]/80 border border-sky-500/50 flex items-center justify-center shadow-[0_0_35px_rgba(14,165,233,0.35)] text-sky-450 z-20">
                <Globe size={24} className="animate-spin text-sky-400" style={{ animationDuration: '15s' }} />
              </div>
              {/* Outer decorative dashed spinning rings */}
              <div className="absolute w-20 h-20 rounded-full border border-dashed border-sky-500/30 animate-[spin_8s_linear_infinite] z-10" />
              <div className="absolute w-28 h-28 rounded-full border border-dashed border-blue-500/10 animate-[spin_12s_linear_infinite_reverse] z-10" />

              {/* Connecting bezier lines */}
              <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 220 340" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Left to Hub paths */}
                <path d="M 0 35 C 100 35, 60 170, 110 170" stroke="url(#lineGradLeft)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 0 130 C 100 130, 60 170, 110 170" stroke="url(#lineGradLeft)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 0 220 C 100 220, 60 170, 110 170" stroke="url(#lineGradLeft)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 0 310 C 100 310, 60 170, 110 170" stroke="url(#lineGradLeft)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />

                {/* Hub to Right paths */}
                <path d="M 110 170 C 160 170, 120 35, 220 35" stroke="url(#lineGradRight)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 110 170 C 160 170, 120 130, 220 130" stroke="url(#lineGradRight)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 110 170 C 160 170, 120 220, 220 220" stroke="url(#lineGradRight)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />
                <path d="M 110 170 C 160 170, 120 310, 220 310" stroke="url(#lineGradRight)" strokeWidth="1.5" className="opacity-70 animate-flow-line" />

                <defs>
                  <linearGradient id="lineGradLeft" x1="0" y1="170" x2="110" y2="170" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22d3ee" stopOpacity="0" />
                    <stop offset="0.8" stopColor="#22d3ee" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="lineGradRight" x1="110" y1="170" x2="220" y2="170" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Column 3: Right Boxes (Analyzed Playbooks & Synthesis) */}
            <div className="flex flex-col justify-between h-[340px] pl-6">
              {[
                { title: 'AI Change Classifier', text: 'Isolates and indexes modified values' },
                { title: 'Battle Card Synthesizer', text: 'Summarizes competitor reports into 4 key quadrants' },
                { title: 'Sales Playbook Dispatcher', text: 'Builds customized phone/email outreach script drafts' },
                { title: 'Slack & Email Push Alerts', text: 'Dispatches real-time summaries to growth teams' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  {...fadeUp(idx * 0.05 + 0.1)}
                  className="bg-[#070b13]/75 border border-white/[0.04] rounded-xl px-4 py-2.5 text-left backdrop-blur-sm relative z-20 group hover:border-sky-500/30 transition-all duration-300"
                >
                  <h4 className="text-xs font-bold text-cyan-300">{item.title}</h4>
                  <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{item.text}</p>
                </motion.div>
              ))}
            </div>

          </div>

          {/* Fallback layout for mobile screens */}
          <div className="grid sm:grid-cols-2 gap-4 lg:hidden mt-8">
            {[
              { title: 'Pricing API Targets', text: 'Scans HTML structures for discount modifications' },
              { title: 'Landing Page HTML', text: 'Tracks positioning shifts' },
              { title: 'Trustpilot & G2 Reviews', text: 'Aggregates SLA complaints' },
              { title: 'Social Activity Logs', text: 'Gathers recruitment patterns' },
              { title: 'AI Change Classifier', text: 'Isolates modified values' },
              { title: 'Battle Card Synthesizer', text: 'Generates quad reports' },
              { title: 'Sales Playbook Dispatcher', text: 'Builds target outreach scripts' },
              { title: 'Slack & Email Alerts', text: 'Sends updates immediately' },
            ].map((item, idx) => (
              <div key={idx} className="bg-[#070b13]/60 border border-white/[0.04] rounded-xl p-4 text-left">
                <h4 className="text-xs font-semibold text-sky-300">{item.title}</h4>
                <p className="text-[10px] text-zinc-400 mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE (Command Center Demo) */}
      <section id="dashboard-showcase" className="relative z-10 py-24 px-6 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-14">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                PRODUCT PREVIEW
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-none mb-4">
                The Intelligence Command Center
              </h2>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                No complex AI layout grids. Just a clean, highly convenient dashboard detailing every competitor movement.
              </p>
            </motion.div>
          </div>

          {/* Dashboard Glass Mockup Container */}
          <motion.div
            {...fadeUp(0.1)}
            className="p-2 bg-sky-950/[0.02] border border-sky-500/10 rounded-2xl shadow-3xl overflow-hidden max-w-5xl mx-auto backdrop-blur-sm"
          >
            <div className="bg-[#070b13] border border-white/[0.04] rounded-xl overflow-hidden grid md:grid-cols-[220px_1fr] min-h-[480px]">
              
              {/* Sidebar */}
              <div className="border-r border-white/[0.04] bg-white/[0.01] p-4 space-y-6">
                <div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-3">TRACKED COMPANIES</div>
                  <div className="space-y-1 relative">
                    {(['stripe', 'paypal', 'square', 'adyen'] as const).map((comp) => (
                      <button
                        key={comp}
                        onClick={() => setSelectedDashboardComp(comp)}
                        className="w-full text-left text-xs px-3 py-2.5 rounded-lg font-semibold flex items-center justify-between transition-colors duration-200 cursor-pointer relative z-10"
                        style={{ color: selectedDashboardComp === comp ? '#ffffff' : '#94a3b8' }}
                      >
                        {selectedDashboardComp === comp && (
                          <motion.div
                            layoutId="activeDashboardTab"
                            className="absolute inset-0 bg-sky-500/15 border border-sky-500/30 rounded-lg z-[-1]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="capitalize">{comp}</span>
                        <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                          selectedDashboardComp === comp ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-zinc-650'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.04] space-y-2">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">CRAWL FREQUENCY</div>
                  <div className="text-[10px] text-sky-300 font-semibold px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md inline-block font-mono">
                    1 scan / 4 hours
                  </div>
                </div>
              </div>

              {/* Main Panel */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  
                  {/* Top bar */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/[0.04] pb-4 mb-5">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <TrendUp size={16} className="text-sky-400" />
                        <span>Intel Feed &mdash; <span className="capitalize text-sky-300 font-semibold">{selectedDashboardComp}</span></span>
                      </h3>
                      <p className="text-[9px] font-mono text-zinc-500">Live monitoring active · last scan 12 minutes ago</p>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-[9px] font-mono bg-[#030712] border border-white/5 text-zinc-450 px-2.5 py-1 rounded-md">
                        Feed type: ALL
                      </span>
                    </div>
                  </div>

                  {/* Panel Details */}
                  <div className="space-y-4">
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#030712] border border-white/[0.03] p-3 rounded-lg text-left">
                        <div className="text-[9px] font-mono text-zinc-500">MONITORED TARGETS</div>
                        <div className="text-sm font-bold font-mono text-white mt-1">4 targets</div>
                      </div>
                      <div className="bg-[#030712] border border-white/[0.03] p-3 rounded-lg text-left">
                        <div className="text-[9px] font-mono text-zinc-500">ALERT DENSITY</div>
                        <div className="text-sm font-bold font-mono text-sky-400 mt-1">3 changes</div>
                      </div>
                      <div className="bg-[#030712] border border-white/[0.03] p-3 rounded-lg text-left">
                        <div className="text-[9px] font-mono text-zinc-500">OPPORTUNITIES</div>
                        <div className="text-sm font-bold font-mono text-cyan-400 mt-1">2 plays</div>
                      </div>
                    </div>

                    {/* Highlight Card */}
                    <div className="bg-[#030712]/50 border border-white/[0.04] p-4 rounded-xl text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          PRICING UPDATE DETECTED
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">June 4, 2026</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1.5 leading-snug">
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

                    {/* Action Playbook */}
                    <div className="bg-sky-500/[0.01] border border-sky-500/20 p-4 rounded-xl text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[9px] font-mono font-semibold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
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
                        className="self-start sm:self-center px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-mono text-[10px] rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        <Clipboard size={11} />
                        <span>{copiedPlaybook ? 'Copied script' : 'Copy copy script'}</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Export link */}
                <div className="pt-4 mt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-zinc-500">
                  <span>Monitor output targets: 4 pages, 2 API routes, 1 documentation path</span>
                  <Link href="/auth/login" className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 font-mono">
                    <span>Export Battle Card PDF</span>
                    <ArrowUpRight size={10} />
                  </Link>
                </div>

              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* CORE FEATURES (Sleek Grid with Custom SVG diagrams) */}
      <section id="features" className="relative z-10 py-24 px-6 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
                Core capabilities
              </span>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white mb-4">
                Deep intelligence. <span className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-slate-200 font-normal">Legal compliance.</span>
              </h2>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-6 gap-6 max-w-5xl mx-auto">
            {/* Feature 1: Pricing Grids */}
            <motion.div
              {...fadeUp(0.05)}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              className="md:col-span-3 bg-[#070b13]/50 border border-white/[0.04] p-6 rounded-2xl transition-all duration-300 group cursor-default shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/25 rounded-lg flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-500/20 transition-all">
                  <TrendUp size={18} weight="bold" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Pricing Grids Monitoring</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We scan HTML elements, custom pricing grids, and currency changes to detect discount models, bundle rates, or tier adjustments instantly.
                </p>
              </div>
              
              {/* Custom SVG Tech Art: Glowing Chart inside grid */}
              <div className="h-24 w-full mt-6 bg-[#03050c] rounded-lg border border-white/[0.02] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '12px 12px'
                }} />
                <svg className="w-full h-full p-2" viewBox="0 0 280 80">
                  <path d="M 10 70 L 50 60 L 90 40 L 130 50 L 170 30 L 210 20 L 250 10" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="opacity-80" />
                  <circle cx="250" cy="10" r="3.5" fill="#67e8f9" className="animate-ping" />
                  <circle cx="250" cy="10" r="2.5" fill="#38bdf8" />
                </svg>
              </div>
            </motion.div>

            {/* Feature 2: Review Site Scraping */}
            <motion.div
              {...fadeUp(0.1)}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              className="md:col-span-3 bg-[#070b13]/50 border border-white/[0.04] p-6 rounded-2xl transition-all duration-300 group cursor-default shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/25 rounded-lg flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 transition-all">
                  <Chats size={18} weight="bold" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Review Site Scraping</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Watches G2, Trustpilot, and public forums. Automatically extracts feature complaints and service timeouts to locate users ready to churn.
                </p>
              </div>

              {/* Custom SVG Tech Art: Scanning Radar Circle */}
              <div className="h-24 w-full mt-6 bg-[#03050c] rounded-lg border border-white/[0.02] relative overflow-hidden flex items-center justify-center">
                <svg className="w-20 h-20 opacity-70" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3 3" className="opacity-30" />
                  <circle cx="40" cy="40" r="20" fill="none" stroke="#0ea5e9" strokeWidth="1" className="opacity-45" />
                  <circle cx="40" cy="40" r="10" fill="none" stroke="#0ea5e9" strokeWidth="1" className="opacity-60" />
                  <line x1="40" y1="40" x2="68" y2="40" stroke="#38bdf8" strokeWidth="1.5" className="animate-[spin_4s_linear_infinite] origin-[40px_40px]" />
                  <circle cx="58" cy="30" r="2.5" fill="#34d399" className="animate-pulse" />
                  <circle cx="28" cy="50" r="2" fill="#fbbf24" className="animate-pulse" />
                </svg>
              </div>
            </motion.div>

            {/* Feature 3: AI Copilot Playbooks */}
            <motion.div
              {...fadeUp(0.15)}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              className="md:col-span-2 bg-[#070b13]/50 border border-white/[0.04] p-6 rounded-2xl transition-all duration-300 group cursor-default shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/25 rounded-lg flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-500/20 transition-all">
                  <Lightning size={18} weight="bold" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">AI Copilot Playbooks</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Generates responsive email templates and target landing page guidelines designed around the competitor changes flagged today.
                </p>
              </div>

              {/* Custom SVG Tech Art: Node branch connections */}
              <div className="h-20 w-full mt-6 bg-[#03050c] rounded-lg border border-white/[0.02] relative overflow-hidden flex items-center justify-center">
                <svg className="w-40 h-16 opacity-80" viewBox="0 0 160 64">
                  <rect x="10" y="24" width="25" height="15" rx="3" fill="#070b13" stroke="#38bdf8" strokeWidth="1" />
                  <circle cx="13" cy="31.5" r="1.5" fill="#38bdf8" />
                  <path d="M 35 31.5 L 60 31.5 M 60 31.5 L 80 15 M 60 31.5 L 80 48" stroke="#0284c7" strokeWidth="1" />
                  <rect x="80" y="7" width="40" height="15" rx="3" fill="#070b13" stroke="#0ea5e9" strokeWidth="1" />
                  <rect x="80" y="41" width="40" height="15" rx="3" fill="#070b13" stroke="#06b6d4" strokeWidth="1" />
                </svg>
              </div>
            </motion.div>

            {/* Feature 4: Historical Changelog */}
            <motion.div
              {...fadeUp(0.2)}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              className="md:col-span-2 bg-[#070b13]/50 border border-white/[0.04] p-6 rounded-2xl transition-all duration-300 group cursor-default shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/25 rounded-lg flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-500/20 transition-all">
                  <CalendarBlank size={18} weight="bold" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Historical Changelog</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Check chronological competitor visual logs. Understand their engineering speed, rebranding cycles, and positioning adjustments.
                </p>
              </div>

              {/* Custom SVG Tech Art: Logs Timeline grid */}
              <div className="h-20 w-full mt-6 bg-[#03050c] rounded-lg border border-white/[0.02] relative overflow-hidden flex items-center justify-center">
                <svg className="w-40 h-16 opacity-70" viewBox="0 0 160 64">
                  <line x1="10" y1="32" x2="150" y2="32" stroke="#334155" strokeWidth="1.5" />
                  {[30, 70, 110].map((cx, i) => (
                    <g key={i}>
                      <circle cx={cx} cy="32" r="5" fill="#070b13" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx={cx} cy="32" r="2.5" fill="#38bdf8" className="animate-pulse" />
                      <line x1={cx} y1="32" x2={cx} y2="12" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                    </g>
                  ))}
                </svg>
              </div>
            </motion.div>

            {/* Feature 5: Zero-Access Crawling */}
            <motion.div
              {...fadeUp(0.25)}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              className="md:col-span-2 bg-[#070b13]/50 border border-white/[0.04] p-6 rounded-2xl transition-all duration-300 group cursor-default shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/25 rounded-lg flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-500/20 transition-all">
                  <ShieldCheck size={18} weight="bold" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Zero-Access Crawling</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  100% cloud-hosted crawlers scan pages externally. No credentials, integrations, or developer steps required.
                </p>
              </div>

              {/* Custom SVG Tech Art: Secure Shield Shield map */}
              <div className="h-20 w-full mt-6 bg-[#03050c] rounded-lg border border-white/[0.02] relative overflow-hidden flex items-center justify-center">
                <svg className="w-40 h-16 opacity-75" viewBox="0 0 160 64">
                  <rect x="68" y="16" width="24" height="32" rx="4" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
                  <path d="M 80 24 L 80 40 M 74 32 L 86 32" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="80" cy="32" r="14" fill="none" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" className="animate-[spin_20s_linear_infinite]" />
                </svg>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* INTERACTIVE BATTLE CARD preview (Sleek Steel-blue/cyan board) */}
      <section id="battle-card" className="relative z-10 py-24 px-6 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
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
            <div className="flex p-1 bg-[#070b13]/80 border border-white/[0.06] rounded-full gap-1 flex-shrink-0 relative">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  className="text-xs font-semibold px-4.5 py-1.5 rounded-full transition-colors duration-200 cursor-pointer relative z-10"
                  style={{ color: activeComp === comp ? '#ffffff' : '#94a3b8' }}
                >
                  {activeComp === comp && (
                    <motion.div
                      layoutId="activeBattleCardTab"
                      className="absolute inset-0 bg-sky-600 rounded-full z-[-1] shadow-[0_2px_8px_rgba(14,165,233,0.3)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {comp.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Battle Card UI */}
          <motion.div
            layoutId="battle-card-panel"
            className="p-1 bg-[#070b13]/45 border border-sky-500/20 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm"
          >
            <div className="bg-[#030712] border border-white/[0.04] rounded-xl overflow-hidden">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.04] bg-[#070b13] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${currentCard.logoColor} flex items-center justify-center shadow-md`}>
                    <Crosshair size={14} weight="bold" className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{currentCard.company} Report</h4>
                    <p className="text-[9px] font-mono text-zinc-550">Live Weekly Synthesizer</p>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-550">{currentCard.date}</div>
              </div>

              {/* Grid Quadrants */}
              <div className="grid md:grid-cols-2 divide-x divide-y divide-white/[0.04] bg-white/[0.01]">
                
                {/* Quadrant 1 */}
                <div className="p-6 text-left hover:bg-white/[0.01] transition-colors duration-200">
                  <div className="inline-flex items-center text-[9px] font-mono uppercase tracking-widest text-sky-400 mb-4 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    01 · DETECTED CHANGES
                  </div>
                  <div className="space-y-3.5">
                    {currentCard.changes.map((row, j) => (
                      <div key={j} className="flex gap-2.5 items-start">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wide flex-shrink-0 mt-0.5 border ${row.tc ? row.tc.replace('text-amber-400 bg-amber-400/10 border-amber-400/20', 'badge-pricing_change').replace('text-emerald-400 bg-emerald-400/10 border-emerald-400/20', 'badge-feature_add').replace('text-sky-400 bg-sky-400/10 border-sky-400/20', 'badge-minor_copy') : 'badge-pricing_change'}`}>
                          {row.tag}
                        </span>
                        <span className="text-xs text-zinc-300 leading-snug">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quadrant 2 */}
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

                {/* Quadrant 3 */}
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

                {/* Quadrant 4 */}
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
      <section className="relative z-10 py-24 px-6 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <motion.div {...fadeUp(0)}>
              <span className="text-[9px] font-mono text-sky-400 uppercase tracking-widest border border-sky-500/20 bg-sky-500/5 px-3 py-1 rounded-full mb-4 inline-block">
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
                whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.25)' }}
                className="bg-[#070b13]/50 border border-white/[0.04] p-5 rounded-xl transition-all duration-300 group cursor-default shadow-xl"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:bg-sky-500/25 transition-all">
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
      <section id="pricing" className="relative z-10 py-24 px-6 border-b border-white/[0.04]">
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
      <section className="relative z-10 py-32 px-6 bg-[#030712] border-t border-white/[0.02] overflow-hidden">
        {/* Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[150px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.05] mb-6">
              Start tracking competitor movements <br />
              <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-slate-250">automatically today.</span>
            </h2>
            <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
              Claim your 14-day free trial now. Monitor up to 7 competitors. Cancel with a single click inside settings.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-3.5 rounded-full hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] active:scale-[0.985] transition-all duration-300 text-sm cursor-pointer"
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
              <div className="w-7 h-7 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center rounded-lg">
                <Crosshair size={12} weight="bold" className="text-sky-400" />
              </div>
              <span className="text-sm font-semibold text-white">Competitor Analyzer</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              AI-driven competitive intelligence platform. Tracking pricing updates, support reviews, and marketing copy adjustments so founders can stay ahead.
            </p>
            <p className="text-[10px] text-zinc-650 font-mono">Compliance certified · Cloud infrastructure</p>
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
                className="w-full bg-white/[0.02] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-sky-500/40 transition-colors"
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
          <div className="flex items-center gap-4 text-zinc-550">
            <a href="#" className="hover:text-white transition-colors"><TwitterLogo size={15} /></a>
            <a href="#" className="hover:text-white transition-colors"><LinkedinLogo size={15} /></a>
            <a href="#" className="hover:text-white transition-colors"><GithubLogo size={15} /></a>
          </div>
        </div>
      </footer>

    </div>
  );
}
