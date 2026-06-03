'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
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
  pricing: 'bg-amber-400/15 text-amber-400',
  feature: 'bg-emerald-400/15 text-emerald-400',
  copy: 'bg-blue-400/15 text-blue-400',
  messaging: 'bg-indigo-400/15 text-indigo-400',
  content: 'bg-zinc-400/15 text-zinc-400',
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 as number },
  transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#070c14] text-white font-sans overflow-x-hidden">

      {/* Ambient background glows - fixed, pointer-events-none */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 right-0 w-[900px] h-[700px] rounded-full bg-blue-600/[0.11] blur-[130px]" />
        <div className="absolute top-[55%] -left-20 w-[600px] h-[500px] rounded-full bg-blue-900/[0.14] blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-blue-700/[0.08] blur-[100px]" />
      </div>

      {/* NAV */}
      <nav className={`fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 lg:px-10 transition-all duration-300 ${scrolled ? 'bg-[#070c14]/90 backdrop-blur-xl border-b border-white/[0.07]' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(37,99,235,0.55)]">
            <Crosshair size={14} weight="bold" className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Competitor Analyzer</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-white/45">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#battle-card" className="hover:text-white transition-colors">Battle Card</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-white/45 hover:text-white transition-colors hidden sm:block">Sign in</Link>
          <Link href="/auth/login" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg transition-all shadow-[0_0_18px_rgba(37,99,235,0.4)] hover:shadow-[0_0_24px_rgba(37,99,235,0.55)] active:scale-[0.97]">
            Start free
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[55%_45%] gap-12 lg:gap-14 items-center">

          {/* Left */}
          <div>
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 text-[11px] font-mono text-emerald-400 uppercase tracking-widest mb-7 border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-1.5 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live competitive intelligence
            </motion.div>

            <motion.h1
              {...fadeUp(0.1)}
              className="text-[54px] lg:text-[70px] font-black leading-[0.94] tracking-[-0.03em] mb-6"
            >
              Your competitors<br />
              are moving.<br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Are you watching?
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.2)}
              className="text-white/50 text-[1.1rem] leading-relaxed max-w-[42ch] mb-10"
            >
              Monitor pricing, reviews, job postings, and messaging for every competitor. Get a weekly Battle Card with what changed and exactly what to do about it.
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-start gap-3 mb-8">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 active:scale-[0.98] transition-all shadow-[0_0_28px_rgba(37,99,235,0.45)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
              >
                Start free trial
                <ArrowRight size={15} weight="bold" />
              </Link>
              <a
                href="#battle-card"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/[0.14] text-white/60 text-sm font-medium rounded-xl hover:border-white/30 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                See a Battle Card
              </a>
            </motion.div>

            <motion.div {...fadeUp(0.4)} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/28 font-mono">
              <span>14-day free trial</span>
              <span className="text-white/[0.1]">|</span>
              <span>$49/mo after</span>
              <span className="text-white/[0.1]">|</span>
              <span>30x cheaper than Crayon</span>
            </motion.div>
          </div>

          {/* Right: Live Intel Feed */}
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl border border-white/[0.1] bg-[#0d1525] overflow-hidden shadow-[0_0_60px_rgba(37,99,235,0.12),0_40px_80px_rgba(0,0,0,0.45)]">
              {/* Traffic light bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0a1020]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="text-[11px] font-mono text-white/25">competitor-feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400/70">live</span>
                </div>
              </div>

              <div className="p-5 font-mono text-[12px]">
                <div className="text-white/25 mb-5">$ monitoring 5 competitors -- last scan 2h ago</div>
                <div className="space-y-3">
                  {FEED.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + i * 0.11, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-3"
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase flex-shrink-0 mt-0.5 ${TAG_STYLE[item.type]}`}>
                        {item.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white/80">{item.company}</span>
                        <span className="text-white/45 ml-1.5 leading-snug">{item.action}</span>
                      </div>
                      <span className="text-white/20 flex-shrink-0 pl-2">{item.time}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between">
                  <span className="text-blue-400">-&gt; 3 Battle Cards ready</span>
                  <span className="text-white/20 text-[10px]">Mon 8:00 AM UTC</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STAT BAR */}
      <div className="relative z-10 border-y border-white/[0.07] bg-gradient-to-r from-transparent via-blue-950/25 to-transparent">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4">
          {[
            { n: '30x', label: 'cheaper than Crayon', hi: false },
            { n: '7', label: 'competitors tracked', hi: false },
            { n: '5 min', label: 'to set up', hi: true },
            { n: '14 days', label: 'free trial', hi: false },
          ].map((s, i) => (
            <motion.div
              key={i}
              {...reveal(i * 0.06)}
              className={`py-8 text-center ${i < 3 ? 'border-r border-white/[0.07]' : ''}`}
            >
              <div className={`text-3xl font-black tracking-tight ${s.hi ? 'text-amber-400' : 'text-white'}`}>{s.n}</div>
              <div className="text-xs text-white/35 mt-1.5 font-mono">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...reveal()} className="mb-16 max-w-2xl">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.0] mb-4">
              Set up in 5 minutes.<br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Insights every Monday.
              </span>
            </h2>
            <p className="text-white/45 text-lg">No integrations. No APIs. Paste URLs and we do the rest.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-[2.75rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-blue-500/40 via-blue-400/20 to-blue-500/40" />

            {[
              {
                icon: <Eye size={20} weight="bold" />,
                step: '01',
                title: 'Add your competitors',
                body: 'Paste up to 7 competitor URLs. We identify their pricing page, review profiles, job board, and messaging automatically.',
              },
              {
                icon: <MagnifyingGlass size={20} weight="bold" />,
                step: '02',
                title: 'We monitor everything',
                body: 'Every 24 hours we scan for pricing changes, new features, reviews, job postings, and messaging shifts.',
              },
              {
                icon: <Lightning size={20} weight="bold" />,
                step: '03',
                title: 'Get your Battle Card',
                body: 'Every Monday morning, your AI-generated Battle Card arrives with all changes and 5 specific actions to take.',
              },
            ].map((s, i) => (
              <motion.div key={i} {...reveal(i * 0.12)}>
                <div className="flex flex-col gap-5 p-7 rounded-2xl border border-white/[0.08] bg-[#0d1525] hover:border-blue-500/25 hover:bg-[#0f1a2e] transition-all group cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                      {s.icon}
                    </div>
                    <span className="text-xs font-mono text-white/18">{s.step}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-white/48 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DISPLAY CARDS */}
      <section className="relative z-10 py-12 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.p {...reveal()} className="text-[11px] font-mono text-white/28 uppercase tracking-widest mb-12 text-center">
            Latest intelligence
          </motion.p>
          <motion.div {...reveal(0.1)}>
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
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.0] mb-4">
              Not just alerts.<br />
              <span className="text-amber-400">A weekly playbook.</span>
            </h2>
            <p className="text-white/45 max-w-md text-lg leading-relaxed">
              Four sections per competitor. Delivered every Monday. Built to act on.
            </p>
          </motion.div>

          {/* Card chrome */}
          <motion.div {...reveal(0.05)} className="border border-white/[0.1] rounded-t-2xl bg-[#0d1525] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/25 flex items-center justify-center">
                <Crosshair size={14} weight="bold" className="text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Stripe</div>
                <div className="text-[11px] font-mono text-white/30">Battle Card - Weekly</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-white/28">Monday, Jun 3, 2026</div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-b-2xl overflow-hidden">
            {[
              {
                num: '01',
                label: 'What changed',
                labelClass: 'text-blue-400 border-blue-400/25 bg-blue-400/[0.07]',
                body: (
                  <div className="space-y-3">
                    {[
                      { tag: 'pricing', tc: 'text-amber-400 bg-amber-400/10', text: 'Removed enterprise pricing from public page' },
                      { tag: 'feature', tc: 'text-emerald-400 bg-emerald-400/10', text: 'Launched new checkout SDK with 3 new integrations' },
                      { tag: 'copy', tc: 'text-blue-400 bg-blue-400/10', text: 'Hero changed from "fast payments" to "global payments"' },
                    ].map((row, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase flex-shrink-0 mt-0.5 ${row.tc}`}>{row.tag}</span>
                        <span className="text-sm text-white/60 leading-snug">{row.text}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '02',
                label: 'Customer complaints',
                labelClass: 'text-red-400 border-red-400/25 bg-red-400/[0.07]',
                body: (
                  <div className="space-y-4">
                    <div className="border-l-2 border-red-400/30 pl-4">
                      <p className="text-sm text-white/55 italic leading-relaxed">"Support took 4 days to resolve our payout issue."</p>
                      <p className="text-[10px] font-mono text-white/25 mt-1.5">Trustpilot - 1 star - 2 days ago</p>
                    </div>
                    <div className="border-l-2 border-amber-400/30 pl-4">
                      <p className="text-sm text-white/55 italic leading-relaxed">"Pricing is completely opaque after their latest change."</p>
                      <p className="text-[10px] font-mono text-white/25 mt-1.5">G2 - 2 stars - 5 days ago</p>
                    </div>
                  </div>
                ),
              },
              {
                num: '03',
                label: 'Strategic signal',
                labelClass: 'text-amber-400 border-amber-400/25 bg-amber-400/[0.07]',
                body: (
                  <div className="space-y-4">
                    {[
                      { hi: '4 Enterprise Sales roles', rest: ' posted in EMEA this week. European expansion incoming.' },
                      { hi: 'Head of Partnerships', rest: ' hired. Channel strategy shift in 60-90 days.' },
                    ].map((item, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <span className="text-amber-400/50 font-mono flex-shrink-0 mt-0.5">›</span>
                        <p className="text-sm text-white/60 leading-snug">
                          <span className="text-white font-medium">{item.hi}</span>{item.rest}
                        </p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '04',
                label: 'Your moves',
                labelClass: 'text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.07]',
                body: (
                  <div className="space-y-4">
                    {[
                      'Lead EMEA sales calls with your local pricing advantage',
                      'Add "24h support" to the hero section of your pricing page',
                      'Write a comparison landing page targeting their dissatisfied customers',
                    ].map((move, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <CheckCircle size={15} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/70 leading-snug">{move}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.08)}
                className="bg-[#0d1525] p-8 hover:bg-[#0f1a2e] transition-colors"
              >
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest mb-5 border px-2 py-0.5 rounded ${card.labelClass}`}>
                  {card.num} / {card.label}
                </div>
                {card.body}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTAINER SCROLL */}
      <section className="relative z-10 py-4 px-6 lg:px-10">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-6">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.0] mb-3">
                The complete picture,<br />
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  delivered weekly.
                </span>
              </h2>
              <p className="text-white/40 text-lg font-mono">Every competitor. Every change. One playbook.</p>
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
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-3">Two segments. One platform.</h2>
            <p className="text-white/40 font-mono text-sm">Crayon charges $1,500/mo. We built the same for the people they ignore.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              {
                label: 'For SaaS founders',
                price: '$49',
                desc: 'Bootstrapped or seed-stage. Competing for deals. Priced out of Crayon.',
                items: ['Up to 7 competitors', 'Weekly Battle Cards', 'G2 + Trustpilot reviews', 'Job postings intelligence', 'AI action plans'],
                featured: false,
              },
              {
                label: 'For local businesses',
                price: '$19',
                desc: 'Salons, gyms, cafes, restaurants. Competing for local customers.',
                items: ['Up to 5 competitors', 'Google Reviews tracking', 'Instagram + Facebook posts', 'Weekly Battle Card', 'AI action plan'],
                featured: true,
              },
            ].map((tier, i) => (
              <motion.div
                key={i}
                {...reveal(i * 0.1)}
                className={`relative p-9 rounded-2xl overflow-hidden transition-all ${
                  tier.featured
                    ? 'bg-[#0d1525] border border-blue-500/35 shadow-[0_0_50px_rgba(37,99,235,0.14)]'
                    : 'bg-[#0d1525] border border-white/[0.09] hover:border-white/[0.15]'
                }`}
              >
                {tier.featured && (
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                )}
                <p className="text-[11px] font-mono text-white/35 uppercase tracking-widest mb-6">{tier.label}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-6xl font-black tracking-tight ${tier.featured ? 'text-blue-400' : 'text-white'}`}>{tier.price}</span>
                  <span className="text-white/35 font-mono text-sm">/month</span>
                </div>
                <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">{tier.desc}</p>
                <ul className="space-y-3 mb-10">
                  {tier.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/60">
                      <CheckCircle size={14} weight="fill" className={tier.featured ? 'text-blue-400' : 'text-white/22'} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl active:scale-[0.98] transition-all ${
                    tier.featured
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_22px_rgba(37,99,235,0.4)] hover:shadow-[0_0_32px_rgba(37,99,235,0.55)]'
                      : 'border border-white/14 text-white hover:bg-white/[0.05]'
                  }`}
                >
                  Start free trial
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div {...reveal(0.2)} className="mt-7 text-center text-xs text-white/20 font-mono">
            14-day free trial on both plans. No credit card required. Cancel anytime.
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-32 px-6 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            {...reveal()}
          >
            <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-8">14-day free trial - no credit card required</p>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-[0.97] mb-6">
              Your competitors are<br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                being watched right now.
              </span>
            </h2>
            <p className="text-white/40 mb-10 text-lg max-w-sm mx-auto">The only question is whether you are the one watching.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 active:scale-[0.98] transition-all shadow-[0_0_44px_rgba(37,99,235,0.45)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
            >
              Start free trial
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-blue-600/20 rounded-lg border border-blue-500/20 flex items-center justify-center">
              <Crosshair size={11} weight="bold" className="text-blue-400/60" />
            </div>
            <span className="text-sm text-white/35 font-medium">Competitor Analyzer</span>
          </div>
          <p className="text-xs text-white/20 font-mono">Built in public - $49/mo - 30x cheaper than Crayon</p>
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
