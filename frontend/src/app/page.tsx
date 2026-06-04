'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, ArrowRight, CheckCircle, Sparkle,
  Eye, MagnifyingGlass, Lightning,
  Star, InstagramLogo, Cards, TrendUp,
  ShieldCheck, Chats, CalendarBlank,
  GithubLogo, TwitterLogo, LinkedinLogo, Globe
} from '@phosphor-icons/react';
import DisplayCards from '@/components/ui/display-cards';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { PricingBasic } from '@/components/ui/pricing-demo';

const FEED = [
  { company: 'Stripe', action: 'Removed enterprise pricing from public page', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Launched new checkout SDK v4.1', time: '6h ago', type: 'feature' },
  { company: 'Braintree', action: 'Updated developer docs navigation', time: '1d ago', type: 'copy' },
  { company: 'Square', action: 'Changed hero from "fast" to "global payments"', time: '2d ago', type: 'messaging' },
  { company: 'Adyen', action: 'Added 3 new enterprise case studies', time: '3d ago', type: 'content' },
];

const TAG_STYLE: Record<string, string> = {
  pricing: 'bg-amber-400/15 text-amber-400 border border-amber-400/10',
  feature: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/10',
  copy: 'bg-blue-400/15 text-blue-400 border border-blue-400/10',
  messaging: 'bg-indigo-400/15 text-indigo-400 border border-indigo-400/10',
  content: 'bg-zinc-400/15 text-zinc-400 border border-zinc-400/10',
};

const BATTLE_CARDS_DATA = {
  stripe: {
    company: 'Stripe',
    logoColor: 'bg-indigo-600',
    date: 'Monday, Jun 3, 2026',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Removed enterprise tier pricing. Custom contract quote required.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Released Stripe Checkout v4.1 with optimized bank redirect latency.' },
      { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10 border-blue-400/20', text: 'Hero updated from "Payments infrastructure" to "Financial operations for global companies".' },
    ],
    complaints: [
      { text: '“Support responses took 4 days. Blocked our payment gateway change.”', source: 'Trustpilot · 1 star · 2 days ago' },
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
    date: 'Monday, Jun 3, 2026',
    changes: [
      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: 'Increased merchant checkout card processing fee from 2.9% to 3.49%.' },
      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', text: 'Integrated bio-auth verification directly inside the popup checkout iframe.' },
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
    date: 'Monday, Jun 3, 2026',
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
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as any },
});

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as any },
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeComp, setActiveComp] = useState<'stripe' | 'paypal' | 'square'>('stripe');
  const [emailInput, setEmailInput] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
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
    <div className="min-h-[100dvh] bg-[#08080b] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">

      {/* Ambient background glows - fixed, pointer-events-none */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 right-0 w-[900px] h-[700px] rounded-full bg-blue-600/[0.09] blur-[140px]" />
        <div className="absolute top-[50%] -left-20 w-[650px] h-[550px] rounded-full bg-blue-900/[0.12] blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full bg-blue-700/[0.07] blur-[120px]" />
      </div>

      {/* NAV (Floating Glass Pill) */}
      <div className="fixed top-5 inset-x-0 z-50 flex justify-center px-4">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
          className={`w-full max-w-5xl rounded-full border border-white/[0.08] bg-black/40 backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'bg-[#08080b]/85 border-white/[0.15] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <motion.div 
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.45)] cursor-pointer"
            >
              <Crosshair size={14} weight="bold" className="text-white" />
            </motion.div>
            <span className="text-sm font-semibold tracking-tight">Competitor Analyzer</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <motion.a href="#how-it-works" whileHover={{ y: -1, color: '#fff' }} className="transition-all duration-200">How it works</motion.a>
            <motion.a href="#features" whileHover={{ y: -1, color: '#fff' }} className="transition-all duration-200">Features</motion.a>
            <motion.a href="#battle-card" whileHover={{ y: -1, color: '#fff' }} className="transition-all duration-200">Battle Card</motion.a>
            <motion.a href="#pricing" whileHover={{ y: -1, color: '#fff' }} className="transition-all duration-200">Pricing</motion.a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">Sign in</Link>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center"
            >
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-xs font-bold bg-white text-black pl-4 pr-1.5 py-1.5 rounded-full hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)] transition-all cursor-pointer"
              >
                <span>Start free</span>
                <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                  <ArrowRight size={11} weight="bold" />
                </span>
              </Link>
            </motion.div>

            {/* Hamburger Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative z-50 p-1 md:hidden flex flex-col gap-1.5 justify-center items-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <span className={`w-4.5 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
              <span className={`w-4.5 h-0.5 bg-white transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
            </button>
          </div>
        </motion.nav>
      </div>

      {/* MOBILE MENU PANEL */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-40 bg-black/85 flex flex-col justify-center px-10 md:hidden"
          >
            <div className="flex flex-col gap-8 text-3xl font-semibold">
              {[
                { name: 'How it works', href: '#how-it-works' },
                { name: 'Features', href: '#features' },
                { name: 'Battle Card', href: '#battle-card' },
                { name: 'Pricing', href: '#pricing' },
                { name: 'Sign in', href: '/auth/login' }
              ].map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] as any }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[55%_45%] gap-12 lg:gap-14 items-center">

          {/* Left Column */}
          <div>
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-8 border border-emerald-400/20 bg-emerald-400/[0.04] px-3.5 py-1.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live market intelligence
            </motion.div>

            <motion.h1
              {...fadeUp(0.1)}
              className="text-5xl sm:text-6xl lg:text-[76px] font-bold leading-[0.92] tracking-tight mb-8 text-balance text-left"
            >
              Your competitors aren't <span className="text-white/40">sending launch emails.</span><br />
              <span className="text-blue-500">
                Track them automatically.
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.2)}
              className="text-white/50 text-base leading-relaxed max-w-lg mb-10 text-left"
            >
              Stop flying blind. We monitor competitor landing pages, pricing charts, and ratings 24/7. Get a weekly AI-synthesized executive brief with exact playground moves to counter their actions.
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex"
              >
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-between w-full sm:w-auto gap-4 bg-white text-black font-semibold pl-6 pr-2 py-2.5 rounded-full cursor-pointer hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)] transition-all"
                >
                  <span>Start free trial</span>
                  <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                    <ArrowRight size={14} weight="bold" />
                  </span>
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex"
              >
                <a
                  href="#battle-card"
                  className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 border border-white/10 text-white/70 text-sm font-medium rounded-full hover:border-white/35 hover:text-white hover:bg-white/[0.02] transition-all"
                >
                  See a Battle Card
                </a>
              </motion.div>
            </motion.div>

            <motion.div {...fadeUp(0.35)} className="text-sm text-white/50 mb-8 font-medium">
              Trusted by B2B founders and local businesses tracking 200+ competitors
            </motion.div>

            <motion.div {...fadeUp(0.4)} className="flex items-center gap-4 text-xs text-white/25 font-mono">
              <span>14-day free trial</span>
              <span>·</span>
              <span>Cancel anytime</span>
              <span>·</span>
              <span>$49/mo post-trial</span>
            </motion.div>
          </div>

          {/* Right Column: Live Intel Feed (Double-Bezel Nesting) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] as any }}
          >
            {/* Outer Shell */}
            <div className="p-2 bg-white/[0.04] border border-white/10 rounded-[2rem] shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-[2rem] opacity-35 pointer-events-none" />

              {/* Inner Core */}
              <div className="relative bg-[#08080c] border border-white/5 rounded-[calc(2rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                {/* Traffic lights / header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-black/40">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-[10px] font-mono text-white/30 tracking-wider">competitor-feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">live feed</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 font-mono text-[12px] space-y-4">
                  <div className="text-white/30 text-[11px] mb-2">$ monitoring 5 competitors -- last scan 2h ago</div>
                  <div className="space-y-3.5">
                    {FEED.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                        className="flex items-start gap-3 border-b border-white/[0.02] pb-2 last:border-0 cursor-default p-1.5 rounded transition-all"
                      >
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type]}`}>
                          {item.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-white/80">{item.company}</span>
                          <span className="text-white/40 ml-2 leading-snug">{item.action}</span>
                        </div>
                        <span className="text-white/20 text-[10px] whitespace-nowrap pl-2">{item.time}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between font-mono text-[11px]">
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <Sparkle weight="fill" size={12} className="text-blue-400" />
                      3 playbook moves ready
                    </span>
                    <span className="text-white/20">Mon 8:00 AM UTC</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STAT BAR */}
      <div className="relative z-10 border-y border-white/[0.08] bg-[#08080b]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4">
          {[
            { n: '30x', label: 'cheaper than Crayon', hi: false },
            { n: '7', label: 'competitors tracked', hi: false },
            { n: '5 min', label: 'setup duration', hi: true },
            { n: '14 days', label: 'free trial period', hi: false },
          ].map((s, i) => (
            <motion.div
              key={i}
              {...reveal(i * 0.05)}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.01)' }}
              transition={{ duration: 0.2 }}
              className={`py-8 px-4 flex flex-col items-center justify-center transition-all ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}
            >
              <div className={`text-4xl font-bold tracking-tight font-mono ${s.hi ? 'text-blue-400' : 'text-white'}`}>{s.n}</div>
              <div className="text-xs text-white/35 mt-2 font-mono tracking-wider text-center">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* THE PROBLEM (Why manual tracking fails) */}
      <section className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06] bg-[#0b0b0f]/30">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div {...reveal()}>
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest border border-red-500/20 bg-red-500/[0.02] px-3.5 py-1.5 rounded-full mb-6 inline-block">
              The status quo
            </span>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-white leading-[1.0] mb-8">
              Why manual competitor<br />
              <span className="text-white/40">tracking is a losing battle</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
            {[
              {
                title: 'Sudden Pricing Revisions',
                desc: 'Your competitors shift their pricing tiers, grandfather active accounts, or change free trial caps without you noticing. You only find out when potential customers bring it up on sales calls.'
              },
              {
                title: 'Silent Product Updates',
                desc: 'They launch new landing page copy, shift their core value proposition tags, or ship optimized checkouts. By the time you review their website manually, they have already captured market momentum.'
              },
              {
                title: 'Missed Review Intelligence',
                desc: 'Disgruntled users write complaining reviews on G2 or Google Reviews. If you don\'t catch these issues instantly, you lose the chance to build custom landing pages and target their pain points.'
              }
            ].map((p, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.1)}
                whileHover={{ y: -4, borderColor: 'rgba(239, 68, 68, 0.2)' }}
                className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl transition-all duration-300"
              >
                <div className="text-red-400 font-mono text-[10px] uppercase tracking-wider mb-4">Problem {i+1}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[40%_60%] gap-12 lg:gap-16 items-start">

          {/* Left Intro */}
          <div className="sticky top-28">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest border border-blue-500/20 bg-blue-500/[0.02] px-3.5 py-1.5 rounded-full mb-6 inline-block">
              Automation flow
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[0.98] mb-6">
              Continuous scan.<br />
              <span className="text-white/40">Actionable playbook.</span>
            </h2>
            <p className="text-white/45 text-base leading-relaxed max-w-sm">
              We monitor their public interfaces every day. No complicated APIs, no code configuration. Just drop in URLs, and let AI update your playbook.
            </p>
          </div>

          {/* Right Steps */}
          <div className="space-y-6">
            {[
              {
                icon: <Eye size={18} weight="bold" />,
                step: '01',
                title: 'Add competitor URLs',
                body: 'Provide the public websites of up to 7 competitors. We configure crawlers to monitor their homepage, pricing page, metadata files, and public review profiles.',
              },
              {
                icon: <MagnifyingGlass size={18} weight="bold" />,
                step: '02',
                title: 'Continuous AI scanning',
                body: 'Our crawlers check targets daily. When a copy tweak, pricing adjustment, or negative rating is indexed, our pipeline evaluates and categorizes the threat.',
              },
              {
                icon: <Lightning size={18} weight="bold" />,
                step: '03',
                title: 'Receive your Battle Card',
                body: 'Every Monday morning, get a structured executive brief detailing exactly what changed, customer friction points, and your precise counter-actions.',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.1)}
                whileHover={{ scale: 1.02, y: -2, borderColor: 'rgba(59, 130, 246, 0.3)' }}
                className="p-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl transition-all duration-300 group cursor-default shadow-md"
              >
                <div className="bg-[#0b0b0f] border border-white/5 rounded-[calc(1.25rem)] p-6 flex items-start gap-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/20 transition-all flex-shrink-0">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-white">{s.title}</h3>
                      <span className="text-[10px] font-mono text-white/20">{s.step}</span>
                    </div>
                    <p className="text-sm text-white/45 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE FEATURES BENTO GRID */}
      <section id="features" className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest border border-blue-500/20 bg-blue-500/[0.02] px-3.5 py-1.5 rounded-full mb-6 inline-block">
              Features
            </span>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-white leading-[1.0] mb-4">
              Pillars of Market Intel
            </h2>
            <p className="text-white/40 text-base max-w-sm mx-auto">Everything you need to outmaneuver the competition.</p>
          </div>

          <div className="grid md:grid-cols-6 gap-6">
            {/* Bento block 1 */}
            <motion.div
              {...reveal(0)}
              whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.2)' }}
              className="md:col-span-3 bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600/25 transition-all">
                <TrendUp size={22} weight="bold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pricing Page Tracker</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Detects plan additions, fee adjustments, and subtle table shifts. Never get surprised by competitor discounting or tiers.
              </p>
            </motion.div>

            {/* Bento block 2 */}
            <motion.div
              {...reveal(0.05)}
              whileHover={{ y: -4, borderColor: 'rgba(16, 185, 129, 0.2)' }}
              className="md:col-span-3 bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-600/25 transition-all">
                <Chats size={22} weight="bold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Review Sentiment Aggregation</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Watches G2, Trustpilot, and Google Reviews. Flags complaints about competitor bugs and support latency so you can acquire their users.
              </p>
            </motion.div>

            {/* Bento block 3 */}
            <motion.div
              {...reveal(0.1)}
              whileHover={{ y: -4, borderColor: 'rgba(139, 92, 246, 0.2)' }}
              className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-12 h-12 bg-purple-600/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-600/25 transition-all">
                <Lightning size={22} weight="bold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Counter-Playbooks</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Our AI analyzes changes and drafts response templates, comparative landing pages, and sales scripts automatically.
              </p>
            </motion.div>

            {/* Bento block 4 */}
            <motion.div
              {...reveal(0.15)}
              whileHover={{ y: -4, borderColor: 'rgba(245, 158, 11, 0.2)' }}
              className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 mb-6 group-hover:bg-amber-600/25 transition-all">
                <CalendarBlank size={22} weight="bold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">12-Week History Trends</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Track changes chronologically over 3 months to identify competitor design choices, sprint velocity, and strategic shifts.
              </p>
            </motion.div>

            {/* Bento block 5 */}
            <motion.div
              {...reveal(0.2)}
              whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.2)' }}
              className="md:col-span-2 bg-white/[0.03] border border-white/[0.06] p-8 rounded-3xl relative overflow-hidden group transition-all duration-300"
            >
              <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600/25 transition-all">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero-Access Crawling</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                We monitor target pages completely externally. No site integration or competitor access required. Safe, legal, and private.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE BATTLE CARD WORKBENCH */}
      <section id="battle-card" className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12">
            <motion.div {...reveal()}>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/[0.02] px-3.5 py-1.5 rounded-full mb-6 inline-block">
                Interactive preview
              </span>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.0] mb-4">
                Explore a live Battle Card
              </h2>
              <p className="text-white/45 max-w-md text-sm leading-relaxed">
                Delivered every Monday morning. Synthesized into four critical quadrants to save your team hours of manual research.
              </p>
            </motion.div>

            {/* Switcher tabs */}
            <motion.div {...reveal(0.05)} className="flex bg-white/[0.03] border border-white/[0.08] p-1.5 rounded-full gap-1 mt-6 md:mt-0">
              {(['stripe', 'paypal', 'square'] as const).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveComp(comp)}
                  className={`text-xs font-semibold px-4.5 py-2 rounded-full cursor-pointer transition-all duration-300 ${
                    activeComp === comp
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  {comp.toUpperCase()}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Interactive Card Shell */}
          <motion.div
            layoutId="battle-card-panel"
            className="p-2 bg-white/[0.04] border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden"
          >
            <div className="bg-[#08080c] border border-white/5 rounded-[calc(2rem-0.5rem)] overflow-hidden">
              
              {/* Card Header */}
              <div className="px-6 py-5 border-b border-white/[0.06] bg-black/45 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${currentCard.logoColor} flex items-center justify-center shadow-lg transition-colors duration-300`}>
                    <Crosshair size={14} weight="bold" className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-none mb-1">{currentCard.company}</h3>
                    <p className="text-[10px] font-mono text-white/30">Battle Card · Live Audit</p>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-white/30">{currentCard.date}</div>
              </div>

              {/* Quadrants Grid */}
              <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] overflow-hidden">
                
                {/* Q1: What Changed */}
                <div className="bg-[#0b0b0f] p-8 hover:bg-[#0e0e14] transition-all duration-300 group cursor-default">
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mb-6 border border-blue-500/20 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded">
                    01 · What changed
                  </div>
                  <div className="space-y-4">
                    {currentCard.changes.map((row, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0 mt-0.5 border ${row.tc}`}>
                          {row.tag}
                        </span>
                        <span className="text-sm text-white/55 leading-snug group-hover:text-white/70 transition-colors">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q2: Customer Complaints */}
                <div className="bg-[#0b0b0f] p-8 hover:bg-[#0e0e14] transition-all duration-300 group cursor-default">
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mb-6 border border-red-500/20 bg-red-500/10 text-red-400 px-2.5 py-1 rounded">
                    02 · Customer complaints
                  </div>
                  <div className="space-y-4">
                    {currentCard.complaints.map((c, j) => (
                      <div key={j} className="border-l border-red-500/30 pl-4">
                        <p className="text-sm text-white/50 italic leading-relaxed group-hover:text-white/70 transition-colors">
                          {c.text}
                        </p>
                        <p className="text-[9px] font-mono text-white/20 mt-1.5">{c.source}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q3: Strategic Signals */}
                <div className="bg-[#0b0b0f] p-8 hover:bg-[#0e0e14] transition-all duration-300 group cursor-default">
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mb-6 border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded">
                    03 · Strategic signals
                  </div>
                  <div className="space-y-4">
                    {currentCard.signals.map((sig, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className="text-amber-400/50 font-mono flex-shrink-0 mt-0.5">›</span>
                        <p className="text-sm text-white/50 leading-snug group-hover:text-white/70 transition-colors">
                          <span className="text-white/80 font-medium">{sig.bold}</span>{sig.rest}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Q4: Your Playbook Moves */}
                <div className="bg-[#0b0b0f] p-8 hover:bg-[#0e0e14] transition-all duration-300 group cursor-default">
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mb-6 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded">
                    04 · Playbook moves
                  </div>
                  <div className="space-y-4">
                    {currentCard.moves.map((move, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <CheckCircle size={15} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/60 leading-snug group-hover:text-white/85 transition-colors">{move}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* CONTAINER SCROLL */}
      <section className="relative z-10 py-4 px-6 lg:px-10 border-b border-white/[0.06] bg-black/20">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-6">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.0] mb-3">
                The complete dashboard,<br />
                <span className="text-blue-500 font-semibold">
                  delivered weekly.
                </span>
              </h2>
              <p className="text-white/40 text-base leading-relaxed">Every competitor. Every change. One command center.</p>
            </div>
          }
        >
          <div className="h-full w-full p-4 font-mono text-[12px] bg-black/60 rounded-xl select-none">
            <div className="grid grid-cols-2 gap-3 h-full">
              {[
                { num: '01', label: 'What changed', lines: ['pricing: enterprise tier removed', 'feature: SDK v4.1 launched', 'copy: hero rewrite detected'], ac: 'text-blue-400', bc: 'border-blue-500/25' },
                { num: '02', label: 'Customer complaints', lines: ['"Support took 4 days..." - 1 star', '"Pricing opaque since update"', '"API docs are confusing"'], ac: 'text-red-400', bc: 'border-red-500/25' },
                { num: '03', label: 'Strategic signal', lines: ['4 EMEA sales roles posted', 'Head of Partnerships hired', 'Series B announced'], ac: 'text-amber-400', bc: 'border-amber-500/25' },
                { num: '04', label: 'Your moves', lines: ['Lead EMEA calls w/ local pricing', 'Add "24h support" to hero', 'Write comparison landing page'], ac: 'text-emerald-400', bc: 'border-emerald-500/25' },
              ].map((s, i) => (
                <div key={i} className={`border ${s.bc} rounded-lg p-3 bg-[#0a1020]/80 backdrop-blur`}>
                  <p className={`text-[10px] uppercase tracking-widest mb-2 ${s.ac}`}>{s.num} - {s.label}</p>
                  <div className="space-y-1.5">
                    {s.lines.map((line, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className={`flex-shrink-0 mt-px ${s.ac}`}>›</span>
                        <span className="text-white/55 leading-snug">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* BUILT FOR LOCAL BUSINESSES */}
      <section className="relative z-10 py-24 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal()} className="text-center mb-14">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/[0.02] px-3.5 py-1.5 rounded-full mb-6 inline-block">
              Local markets
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.0] mb-4">
              Built for local businesses <span className="text-emerald-400">too.</span>
            </h2>
            <p className="text-white/45 max-w-md mx-auto text-sm leading-relaxed">
              Not just SaaS. Track the salon next door, the gym down the street, or the café across town.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: <Star size={22} weight="fill" />,
                title: 'Google Reviews',
                body: 'Track your competitor\u2019s Google rating changes, review volume, and negative ratings weekly.',
              },
              {
                icon: <InstagramLogo size={22} weight="fill" />,
                title: 'Social Activity',
                body: 'Monitor their Instagram and Facebook posts and promotions automatically without logging in.',
              },
              {
                icon: <Cards size={22} weight="fill" />,
                title: 'Local Battle Cards',
                body: 'AI-generated plan: identify customer complaints, steal their traffic, and patch your local gaps.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                {...reveal(i * 0.1)}
                whileHover={{ scale: 1.03, y: -2, borderColor: 'rgba(16, 185, 129, 0.3)' }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 transition-all duration-300 group cursor-default shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-500/25 transition-all">
                  {card.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <PricingBasic />
        </div>
      </section>

      {/* DISPLAY CARDS - Subtly reinforcing alerts */}
      <section className="relative z-10 py-16 px-6 lg:px-10 bg-black/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-6">Recent scanning triggers from public sandbox</p>
          <motion.div {...reveal(0.05)}>
            <DisplayCards />
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-36 px-6 lg:px-10 bg-[#07070a] border-t border-white/[0.03]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...reveal()}>
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[0.96] mb-6 text-balance">
              Your competitors are being <span className="text-blue-500">watched right now.</span>
            </h2>
            <p className="text-white/40 mb-10 text-base max-w-sm mx-auto leading-relaxed">
              The only question is whether you are the one watching them, or they are watching you.
            </p>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-4 bg-white text-black font-bold pl-6 pr-2 py-3.5 rounded-full cursor-pointer hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] transition-all"
              >
                <span>Start your 14-day free trial</span>
                <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.08] py-16 px-6 lg:px-10 bg-[#060608]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 pb-12">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-blue-600/10 border border-blue-500/20 flex items-center justify-center rounded-md">
                <Crosshair size={11} weight="bold" className="text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-white">Competitor Analyzer</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs font-sans">
              AI-powered competitive intelligence. Tracking public pricing, reviews, and signals so founders can react instantly.
            </p>
            <p className="text-[10px] text-white/20 font-mono pt-2">Built in public · 14-day trial</p>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/35">Product</h4>
            <ul className="space-y-2 text-xs text-white/50">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#battle-card" className="hover:text-white transition-colors">Battle Card</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Col 3: Integrations */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/35">Integrations</h4>
            <ul className="space-y-2 text-xs text-white/50">
              <li><span className="text-white/30">Google Reviews</span></li>
              <li><span className="text-white/30">G2 & Trustpilot</span></li>
              <li><span className="text-white/30">Instagram Analytics</span></li>
              <li><span className="text-white/30">Polar.sh Billing</span></li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-white/35 font-semibold">Join Digest</h4>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 bg-white text-black font-semibold text-[11px] rounded-lg cursor-pointer hover:shadow-md transition-all duration-300"
              >
                {newsletterSubscribed ? 'Subscribed!' : 'Subscribe'}
              </motion.button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto border-t border-white/[0.05] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/20 font-mono">
            &copy; {new Date().getFullYear()} Competitor Analyzer. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-sm text-white/25">
            <motion.a href="#" whileHover={{ scale: 1.1, color: '#fff' }} className="transition-all"><TwitterLogo size={16} /></motion.a>
            <motion.a href="#" whileHover={{ scale: 1.1, color: '#fff' }} className="transition-all"><LinkedinLogo size={16} /></motion.a>
            <motion.a href="#" whileHover={{ scale: 1.1, color: '#fff' }} className="transition-all"><GithubLogo size={16} /></motion.a>
          </div>
        </div>
      </footer>
    </div>
  );
}
