'use client';

import Link from 'next/link';
import { Crosshair, CheckSquare, TrendUp, ChartBar, ShieldCheck, ArrowRight, Lightning, Users } from '@phosphor-icons/react';
import { motion, useScroll, useTransform, Variants } from 'motion/react';
import { useEffect, useState } from 'react';

const heroItems: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};
const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity1 = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white selection:bg-blue-500/30 font-sans overflow-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 inset-x-0 h-16 z-50 flex items-center justify-between px-6 lg:px-12 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.06] transition-shadow duration-300 ${scrolled ? 'shadow-[0_1px_0_rgba(255,255,255,0.08),0_4px_20px_rgba(0,0,0,0.4)]' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Crosshair size={18} weight="bold" className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Competitor Analyzer</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Sign in</Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link href="/auth/login" className="hidden sm:inline-flex px-4 py-2 bg-white text-[#0a0a0a] text-sm font-semibold rounded-full hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)] transition-shadow cursor-pointer">Get started free</Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 px-6 lg:px-12">
        {/* Glow layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-600 rounded-full opacity-[0.18] blur-[100px]"
            animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-indigo-600 rounded-full opacity-[0.12] blur-[80px]"
            animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />
          <motion.div
            className="absolute bottom-[0%] left-[40%] w-[500px] h-[300px] bg-blue-500 rounded-full opacity-[0.10] blur-[90px]"
            animate={{ x: [0, 30, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Hero text */}
          <motion.div
            variants={heroItems}
            initial="hidden"
            animate="visible"
            style={{ y: y1, opacity: opacity1 }}
            className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl"
          >
            <motion.div variants={heroItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-medium text-white/80 uppercase tracking-widest">Intelligence Platform</span>
            </motion.div>

            <motion.h1
              variants={heroItem}
              className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6"
            >
              Know what your competitors{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">changed</span>
              <br />before your customers do.
            </motion.h1>

            <motion.p variants={heroItem} className="text-lg md:text-xl text-white/50 max-w-xl leading-relaxed mb-10 font-light tracking-wide">
              Weekly AI monitoring across your competitive landscape. Pricing shifts, feature launches, and messaging changes - all surfaced as ready-to-use actions.
            </motion.p>

            <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black text-sm font-semibold rounded-full hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition-shadow cursor-pointer"
                >
                  Start tracking - $99/mo
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={heroItem} className="flex items-center gap-6 mt-8 text-white/30 text-xs">
              <span className="flex items-center gap-1.5"><Lightning size={12} weight="fill" /> 5-minute setup</span>
              <span className="flex items-center gap-1.5"><Users size={12} weight="fill" /> 7 competitors</span>
              <span className="flex items-center gap-1.5"><CheckSquare size={12} weight="fill" /> AI action drafts</span>
            </motion.div>
          </motion.div>

          {/* Right: Product preview */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ perspective: 1000 }}
            className="w-full lg:w-[48%] mt-12 lg:mt-0 flex-shrink-0"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-2xl blur-xl" />
              <div className="relative bg-[#111111] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                {/* Browser chrome bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0d] border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 mx-3 h-5 bg-white/5 rounded-md flex items-center justify-center">
                    <span className="text-[9px] text-white/30 font-mono">app.competitor-analyzer.com/dashboard</span>
                  </div>
                </div>
                {/* App layout */}
                <div className="flex h-[340px]">
                  {/* Mini sidebar */}
                  <div className="w-[52px] bg-[#0a0a0a] border-r border-white/[0.05] flex flex-col items-center py-3 gap-3 flex-shrink-0">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                      <Crosshair size={11} weight="bold" className="text-white" />
                    </div>
                    <div className="mt-2 flex flex-col gap-2 w-full px-2">
                      {[true, false, false, false, false].map((active, i) => (
                        <div key={i} className={`h-6 rounded-md ${active ? 'bg-white/10' : 'bg-white/[0.03]'} flex items-center justify-center`}>
                          <div className={`w-3 h-3 rounded-sm ${active ? 'bg-blue-500' : 'bg-white/10'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-4 overflow-hidden bg-[#f8f8f8]">
                    {/* Topbar */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="h-3 w-20 bg-[#0a0a0a] rounded mb-1" />
                        <div className="h-2 w-32 bg-[#a3a3a3] rounded" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="h-2 w-16 bg-[#525252] rounded" />
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { val: '5', dot: 'bg-zinc-400' },
                        { val: '12', dot: 'bg-blue-500' },
                        { val: '3', dot: 'bg-amber-500' },
                        { val: 'Active', dot: 'bg-emerald-500' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white border border-[#e5e5e5] rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="h-1.5 w-10 bg-[#a3a3a3] rounded" />
                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          </div>
                          <div className="text-[11px] font-bold text-[#0a0a0a] font-mono">{s.val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="bg-white border border-[#e5e5e5] rounded-lg p-3 mb-3">
                      <div className="h-1.5 w-24 bg-[#0a0a0a] rounded mb-3" />
                      <div className="flex items-end gap-1 h-12">
                        {[3, 7, 4, 10, 6, 2, 8, 5, 9, 3, 7, 11].map((h, i) => (
                          <div key={i} className={`flex-1 rounded-t-sm ${i === 11 ? 'bg-blue-500' : i % 3 === 0 ? 'bg-blue-200' : 'bg-[#e5e5e5]'}`} style={{ height: `${(h / 11) * 100}%` }} />
                        ))}
                      </div>
                    </div>
                    {/* Activity rows */}
                    {[
                      { color: 'bg-amber-500', name: 'Acme Corp', tag: 'Pricing', tagColor: 'bg-amber-100 text-amber-700' },
                      { color: 'bg-emerald-500', name: 'Globex Inc', tag: 'Feature', tagColor: 'bg-emerald-100 text-emerald-700' },
                    ].map((row, i) => (
                      <div key={i} className="bg-white border border-[#e5e5e5] rounded-lg px-3 py-2 flex items-center gap-2 mb-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.color}`} />
                        <div className="w-5 h-5 rounded bg-[#f0f0f0] flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-[9px] font-semibold text-[#0a0a0a]">{row.name}</div>
                          <div className="h-1.5 w-24 bg-[#e5e5e5] rounded mt-0.5" />
                        </div>
                        <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${row.tagColor}`}>{row.tag}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white text-[#0a0a0a] relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">How it works</h2>
            <p className="text-[#737373]">Three steps to competitive clarity.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line */}
            <div className="hidden md:block absolute top-[56px] left-[16.7%] right-[16.7%] h-px border-t-2 border-dashed border-[#e5e5e5]" />
            {[
              { icon: Users, title: 'Add competitors', desc: 'Paste up to 7 URLs. We start monitoring immediately.' },
              { icon: Lightning, title: 'AI scans weekly', desc: 'Every Monday, we diff every page and classify changes.' },
              { icon: CheckSquare, title: 'Review and act', desc: 'Get AI-drafted counter-moves ready for your team.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center relative z-10"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
                  <step.icon size={22} weight="duotone" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[#737373] max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="py-24 bg-[#0a0a0a] relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">Everything you need</h2>
            <p className="text-white/50">A complete toolkit for competitive intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
            {/* Digest Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              viewport={{ once: true }}
              className="md:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <CheckSquare size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Weekly Action Digest</h3>
                <p className="text-sm text-white/50 max-w-sm">Every Monday morning, get a beautifully formatted email with all changes and AI-drafted counter-actions.</p>
              </div>
            </motion.div>

            {/* Scale Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <TrendUp size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Track 7 Competitors</h3>
              <p className="text-sm text-white/50">Monitor the entire market landscape simultaneously.</p>
            </motion.div>

            {/* Trends Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <ChartBar size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">12-Week Trends</h3>
              <p className="text-sm text-white/50">Spot macro patterns and identify when your competitors are preparing for a major launch.</p>
            </motion.div>

            {/* Drafts Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI-Generated Counter Moves</h3>
                <p className="text-sm text-white/50 max-w-sm mb-6">We don&apos;t just tell you what happened. We write the exact email, slack message, or sales battlecard you need to respond.</p>
                <div className="mt-auto bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs text-white/60">
                  &gt; Generating counter-positioning draft...<br/>
                  &gt; Ready for review.
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-[#050505] border-t border-white/5">
        <div className="max-w-lg mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">Simple pricing</h2>
          <p className="text-white/50 mb-12">One plan. Everything included. Cancel anytime.</p>
          <motion.div
            whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            className="relative bg-[#111] border border-white/10 rounded-2xl p-8 text-center transition-all"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">Most popular</div>
            <div className="text-5xl font-bold text-white mb-2 mt-4">$99<span className="text-lg font-normal text-white/40">/mo</span></div>
            <p className="text-sm text-white/50 mb-8">Everything you need to stay ahead.</p>
            <ul className="text-left space-y-3 mb-8">
              {['Up to 7 competitors', 'Weekly AI scans', 'AI-drafted counter-moves', 'Monday morning digest', '12-week trend analysis'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="w-1 h-1 rounded-full bg-blue-500" />
                  {f}
                </li>
              ))}
            </ul>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link href="/auth/login" className="block w-full py-3 bg-white text-[#0a0a0a] text-sm font-semibold rounded-lg hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition-shadow cursor-pointer text-center">
                Get started free
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
              <Crosshair size={12} weight="bold" className="text-white/50" />
            </div>
            <span className="text-sm font-medium text-white/50 tracking-tight">Competitor Analyzer</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
