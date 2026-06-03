'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crosshair, ArrowRight, CheckCircle, Sparkle,
  Eye, MagnifyingGlass, Lightning,
} from '@phosphor-icons/react';
import DisplayCards from '@/components/ui/display-cards';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 as number },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

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
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-5xl rounded-full border border-white/[0.08] bg-black/40 backdrop-blur-md px-6 py-3 flex items-center justify-between transition-all duration-300 ${
            scrolled ? 'bg-[#08080b]/75 border-white/[0.12] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.45)]">
              <Crosshair size={14} weight="bold" className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Competitor Analyzer</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#battle-card" className="hover:text-white transition-colors">Battle Card</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">Sign in</Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs font-bold bg-white text-black pl-4 pr-1.5 py-1.5 rounded-full hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-[0.97] transition-all cursor-pointer"
            >
              <span>Start free</span>
              <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                <ArrowRight size={11} weight="bold" />
              </span>
            </Link>

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
                { name: 'Battle Card', href: '#battle-card' },
                { name: 'Pricing', href: '#pricing' },
                { name: 'Sign in', href: '/auth/login' }
              ].map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
              className="text-5xl sm:text-6xl lg:text-[76px] font-bold leading-[0.92] tracking-tight mb-8 text-balance"
            >
              Your competitors are <span className="text-white/40">making moves.</span><br />
              <span className="text-blue-500">
                Are you watching?
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.2)}
              className="text-white/50 text-base leading-relaxed max-w-sm mb-10"
            >
              Get a weekly AI-generated Battle Card detailing competitor pricing, product updates, and your precise counter-moves.
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-between gap-4 bg-white text-black font-semibold pl-6 pr-2 py-2 rounded-full cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
              >
                <span>Start free trial</span>
                <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </Link>
              <a
                href="#battle-card"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-white/60 text-sm font-medium rounded-full hover:border-white/20 hover:text-white hover:bg-white/[0.02] active:scale-[0.98] transition-all"
              >
                See a Battle Card
              </a>
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
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-start gap-3 border-b border-white/[0.02] pb-2 last:border-0"
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
              className={`py-8 px-4 flex flex-col items-center justify-center ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}
            >
              <div className={`text-4xl font-bold tracking-tight font-mono ${s.hi ? 'text-blue-400' : 'text-white'}`}>{s.n}</div>
              <div className="text-xs text-white/35 mt-2 font-mono tracking-wider text-center">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS (Asymmetrical Layout Split) */}
      <section id="how-it-works" className="relative z-10 py-32 px-6 lg:px-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[40%_60%] gap-12 lg:gap-16 items-start">

          {/* Left Static Intro */}
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[0.98] mb-6">
              Continuous scan.<br />
              <span className="text-white/40">Actionable intelligence.</span>
            </h2>
            <p className="text-white/45 text-base leading-relaxed max-w-sm">
              No complicated APIs, no manual audits. Just drop in competitor URLs, and our AI updates your custom playbook every week.
            </p>
          </div>

          {/* Right Staggered Step Deck (Double-Bezel) */}
          <div className="space-y-6">
            {[
              {
                icon: <Eye size={18} weight="bold" />,
                step: '01',
                title: 'Add competitor profiles',
                body: 'Provide up to 7 competitor URLs. We analyze their product routes, legal disclosures, job postings, and review profiles automatically.',
              },
              {
                icon: <MagnifyingGlass size={18} weight="bold" />,
                step: '02',
                title: 'Automated weekly audit',
                body: 'We audit pages every 24 hours, diffing layout shifts, tracking pricing tables, and identifying changes.',
              },
              {
                icon: <Lightning size={18} weight="bold" />,
                step: '03',
                title: 'Receive your Battle Card',
                body: 'Every Monday morning, a consolidated playbook arrives with all changes classified and 5 direct actions for your team.',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.1)}
                className="p-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:border-white/15 transition-all group"
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

      {/* DISPLAY CARDS */}
      <section className="relative z-10 py-16 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal(0.05)}>
            <DisplayCards
              cards={[
                {
                  icon: <Sparkle weight="fill" />,
                  title: "Pricing change",
                  description: "Stripe removed enterprise tier",
                  date: "2h ago",
                  className: "-translate-x-8 translate-y-3 rotate-[-4deg]",
                },
                {
                  icon: <Sparkle weight="fill" />,
                  title: "New feature",
                  description: "Competitor launched SDK v4.1",
                  date: "1d ago",
                  className: "translate-x-0 translate-y-0 rotate-[2deg]",
                },
                {
                  icon: <Sparkle weight="fill" />,
                  title: "Strategic signal",
                  description: "4 sales hires in EMEA",
                  date: "3d ago",
                  className: "translate-x-8 -translate-y-3 rotate-[6deg]",
                },
              ]}
            />
          </motion.div>
        </div>
      </section>

      {/* BATTLE CARD */}
      <section id="battle-card" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal()} className="mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.0] mb-4">
              Not just alerts.<br />
              <span className="text-blue-400">A weekly playbook.</span>
            </h2>
            <p className="text-white/45 max-w-md text-base leading-relaxed">
              Four sections per competitor. Delivered every Monday. Built to act on.
            </p>
          </motion.div>

          {/* Playbook Shell (Double-Bezel) */}
          <motion.div {...reveal(0.05)} className="p-2 bg-white/[0.04] border border-white/10 rounded-[2rem] shadow-2xl">
            <div className="bg-[#08080c] border border-white/5 rounded-[calc(2rem-0.5rem)] overflow-hidden">

              {/* Card Header Chrome */}
              <div className="px-6 py-4 border-b border-white/[0.06] bg-black/45 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <Crosshair size={14} weight="bold" className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Stripe</div>
                    <div className="text-[10px] font-mono text-white/30">Battle Card · Weekly</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-white/30">Monday, Jun 3, 2026</div>
              </div>

              {/* Grid content */}
              <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] overflow-hidden">
                {[
                  {
                    num: '01',
                    label: 'What changed',
                    labelClass: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
                    body: (
                      <div className="space-y-3.5">
                        {[
                          { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10', text: 'Removed enterprise pricing from public page' },
                          { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10', text: 'Launched new checkout SDK with 3 new integrations' },
                          { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10', text: 'Hero changed from "fast payments" to "global payments"' },
                        ].map((row, j) => (
                          <div key={j} className="flex items-start gap-3">
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0 mt-0.5 ${row.tc}`}>{row.tag}</span>
                            <span className="text-sm text-white/50 leading-snug">{row.text}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    num: '02',
                    label: 'Customer complaints',
                    labelClass: 'text-red-400 border-red-500/20 bg-red-500/10',
                    body: (
                      <div className="space-y-4">
                        <div className="border-l border-red-500/30 pl-4">
                          <p className="text-sm text-white/50 italic leading-relaxed">“Support took 4 days to resolve our payout issue.”</p>
                          <p className="text-[9px] font-mono text-white/20 mt-1.5">Trustpilot · 1 star · 2 days ago</p>
                        </div>
                        <div className="border-l border-amber-500/30 pl-4">
                          <p className="text-sm text-white/50 italic leading-relaxed">“Pricing is completely opaque after their latest change.”</p>
                          <p className="text-[9px] font-mono text-white/20 mt-1.5">G2 · 2 stars · 5 days ago</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    num: '03',
                    label: 'Strategic signals',
                    labelClass: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
                    body: (
                      <div className="space-y-4">
                        {[
                          { hi: '4 Enterprise Sales roles', rest: ' posted in EMEA this week. European expansion incoming.' },
                          { hi: 'Head of Partnerships', rest: ' hired. Channel strategy shift in 60-90 days.' },
                        ].map((item, j) => (
                          <div key={j} className="flex items-start gap-3">
                            <span className="text-amber-400/50 font-mono flex-shrink-0 mt-0.5">›</span>
                            <p className="text-sm text-white/50 leading-snug">
                              <span className="text-white/80 font-medium">{item.hi}</span>{item.rest}
                            </p>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    num: '04',
                    label: 'Your moves',
                    labelClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                    body: (
                      <div className="space-y-3.5">
                        {[
                          'Lead EMEA sales calls with your local pricing advantage',
                          'Add "24h support" to the hero section of your pricing page',
                          'Write a comparison landing page targeting their dissatisfied customers',
                        ].map((move, j) => (
                          <div key={j} className="flex items-start gap-3">
                            <CheckCircle size={15} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-white/60 leading-snug">{move}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="bg-[#0b0b0f] p-8 hover:bg-[#0e0e14] transition-colors"
                  >
                    <div className={`inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mb-6 border px-2 py-0.5 rounded ${card.labelClass}`}>
                      {card.num} · {card.label}
                    </div>
                    {card.body}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CONTAINER SCROLL */}
      <section className="relative z-10 py-4 px-6 lg:px-10">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-6">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.0] mb-3">
                The complete picture,<br />
                <span className="text-blue-500 font-semibold">
                  delivered weekly.
                </span>
              </h2>
              <p className="text-white/40 text-base leading-relaxed">Every competitor. Every change. One playbook.</p>
            </div>
          }
        >
          <div className="h-full w-full p-4 font-mono text-[12px]">
            <div className="grid grid-cols-2 gap-3 h-full">
              {[
                { num: '01', label: 'What changed', lines: ['pricing: enterprise tier removed', 'feature: SDK v4.1 launched', 'copy: hero rewrite detected'], ac: 'text-blue-400', bc: 'border-blue-500/25' },
                { num: '02', label: 'Customer complaints', lines: ['"Support took 4 days..." - 1 star', '"Pricing opaque since update"', '"API docs are confusing"'], ac: 'text-red-400', bc: 'border-red-500/25' },
                { num: '03', label: 'Strategic signal', lines: ['4 EMEA sales roles posted', 'Head of Partnerships hired', 'Series B announced'], ac: 'text-amber-400', bc: 'border-amber-500/25' },
                { num: '04', label: 'Your moves', lines: ['Lead EMEA calls w/ local pricing', 'Add "24h support" to hero', 'Write comparison landing page'], ac: 'text-emerald-400', bc: 'border-emerald-500/25' },
              ].map((s, i) => (
                <div key={i} className={`border ${s.bc} rounded-lg p-3 bg-[#0a1020]`}>
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

      {/* PRICING */}
      <section id="pricing" className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal()} className="mb-14 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">Simple plans. Complete access.</h2>
            <p className="text-white/40 text-sm">Competitor monitoring priced for growing teams.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                label: 'For SaaS founders',
                price: '49',
                desc: 'Bootstrapped or seed-stage. Competing for deals. Priced out of enterprise tools.',
                items: ['Up to 7 competitors', 'Weekly Battle Cards', 'G2 + Trustpilot reviews', 'Job postings intelligence', 'AI action plans'],
                featured: false,
              },
              {
                label: 'For local businesses',
                price: '19',
                desc: 'Salons, gyms, cafes, restaurants. Competing for local customers.',
                items: ['Up to 5 competitors', 'Google Reviews tracking', 'Instagram + Facebook posts', 'Weekly Battle Card', 'AI action plan'],
                featured: true,
              },
            ].map((tier, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.1)}
                className="p-1 bg-white/[0.04] border border-white/10 rounded-[2rem] relative shadow-2xl group"
              >
                {tier.featured && (
                  <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                )}
                <div className="bg-[#0b0b0f] border border-white/5 rounded-[calc(2rem-0.25rem)] p-9 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-6">{tier.label}</p>
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-white/30 text-2xl font-semibold">$</span>
                      <span className={`text-6xl font-bold tracking-tight font-mono ${tier.featured ? 'text-blue-400' : 'text-white'}`}>{tier.price}</span>
                      <span className="text-white/35 font-mono text-xs">/month</span>
                    </div>
                    <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">{tier.desc}</p>
                    <ul className="space-y-3.5 mb-10">
                      {tier.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm text-white/50">
                          <CheckCircle size={15} weight="fill" className={tier.featured ? 'text-blue-400' : 'text-white/20'} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/auth/login"
                    className={`w-full inline-flex items-center justify-between text-sm font-semibold pl-6 pr-2 py-2 rounded-full cursor-pointer transition-all ${
                      tier.featured
                        ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md'
                        : 'border border-white/10 text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>Start free trial</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.featured ? 'bg-white/10' : 'bg-white/5'}`}>
                      <ArrowRight size={14} weight="bold" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...reveal(0.2)} className="mt-7 text-center text-xs text-white/20 font-mono">
            14-day free trial on both plans. Cancel anytime.
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-36 px-6 lg:px-10 border-t border-white/[0.06] bg-[#07070a]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...reveal()}>
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[0.96] mb-6 text-balance">
              Your competitors are being <span className="text-blue-500">watched right now.</span>
            </h2>
            <p className="text-white/40 mb-10 text-base max-w-sm mx-auto">
              The only question is whether you are the one watching them.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-4 bg-white text-black font-semibold pl-6 pr-2 py-2 rounded-full cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
            >
              <span>Start free trial</span>
              <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                <ArrowRight size={14} weight="bold" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 lg:px-10 bg-[#07070a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-blue-600/10 border border-blue-500/20 flex items-center justify-center rounded-md">
              <Crosshair size={11} weight="bold" className="text-blue-400/60" />
            </div>
            <span className="text-sm text-white/35 font-medium">Competitor Analyzer</span>
          </div>
          <p className="text-xs text-white/20 font-mono">Built in public · $49/mo · 30x cheaper than Crayon</p>
          <div className="flex items-center gap-5 text-sm text-white/25">
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
            <a href="#" className="hover:text-white transition-colors">X</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
