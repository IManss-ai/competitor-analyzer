'use client';

import Link from 'next/link';
import { Crosshair, Plus, CheckSquare, TrendUp, ChartBar, ShieldCheck, Check, ArrowRight } from '@phosphor-icons/react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

// Typewriter component
function TypewriterHeading() {
  const text = "Know what changed before your customers do.";
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 leading-[1.1] mb-6 min-h-[2.2em] md:min-h-0 text-center">
      {displayed}
      <span className="animate-pulse inline-block w-1 h-[0.9em] bg-blue-500 ml-1 align-baseline translate-y-1"></span>
    </h1>
  );
}

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity1 = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white selection:bg-blue-500/30 font-sans overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Crosshair size={18} weight="bold" className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            Competitor Analyzer
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/auth/login" className="hidden sm:inline-flex px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:scale-105 active:scale-95 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 flex flex-col items-center text-center">
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-[100%] pointer-events-none" />
        
        <motion.div style={{ y: y1, opacity: opacity1 }} className="relative z-10 flex flex-col items-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-medium text-white/80 uppercase tracking-widest">Intelligence Platform</span>
          </div>
          
          <TypewriterHeading />
          
          <p className="text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed mb-10 font-light tracking-wide">
            Weekly AI monitoring across your competitive landscape. Pricing shifts, feature launches, and messaging changes - all surfaced as ready-to-use actions.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              href="/auth/login" 
              className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black text-sm font-semibold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[glint_1.5s_ease-in-out_infinite]" />
              Start tracking - $99/mo
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Interactive Product Preview */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 pb-32">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-20" />
        
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-4">See what you've been missing</h2>
          <p className="text-white/50 text-sm">A live timeline of competitor moves, analyzed and categorized.</p>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="p-6">
              {[
                { comp: "Stripe", type: "pricing", color: "bg-amber-500", text: "Updated enterprise pricing tier to custom only." },
                { comp: "Vercel", type: "feature", color: "bg-emerald-500", text: "Launched new v0 generative UI feature." },
                { comp: "Linear", type: "repositioning", color: "bg-blue-500", text: "Changed tagline to 'Built for builders'." }
              ].map((row, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0"
                >
                  <div className={`w-2 h-2 rounded-full ${row.color}`} />
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 uppercase">
                    {row.comp[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{row.comp}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${row.color.replace('bg-', 'text-').replace('500', '400')} ${row.color.replace('bg-', 'border-').replace('500', '900/50')} ${row.color.replace('bg-', 'bg-').replace('500', '900/20')}`}>
                        {row.type}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 font-mono">{row.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
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
              viewport={{ once: true }}
              className="md:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors"
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
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors"
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
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors"
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
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-8 relative overflow-hidden group hover:border-white/20 transition-colors"
            >
               <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI-Generated Counter Moves</h3>
                <p className="text-sm text-white/50 max-w-sm mb-6">We don't just tell you what happened. We write the exact email, slack message, or sales battlecard you need to respond.</p>
                <div className="mt-auto bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs text-white/60">
                  &gt; Generating counter-positioning draft...<br/>
                  &gt; Ready for review.
                </div>
              </div>
            </motion.div>
          </div>
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
