'use client';

import Link from 'next/link';
import { Crosshair, Plus, CheckSquare, TrendUp, ChartBar, ShieldCheck, Check } from '@phosphor-icons/react';
import { motion } from 'motion/react';

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#f5f5f5] selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-sm border-b border-[#e5e5e5] z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
            <Crosshair size={18} weight="bold" className="text-white" />
          </div>
          <span className="text-lg font-semibold text-[#0a0a0a] tracking-tight">
            Competitor Analyzer
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-[#525252] hover:text-[#0a0a0a] transition-colors">
            Sign in
          </Link>
          <Link href="/auth/login" className="px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-colors">
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-[100dvh] bg-[#0a0a0a] flex items-center pt-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full lg:w-[55%]"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/50 border border-blue-900/50 mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wide">AI-powered intelligence</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1] mb-6">
              Know what your competitors changed. Before your customers do.
            </h1>
            <p className="text-lg text-white/50 max-w-xl leading-relaxed mb-8">
              Weekly AI monitoring across your competitive landscape. Pricing, features, messaging — all surfaced as ready-to-use actions.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
              <Link href="/auth/login" className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center">
                Start free trial
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto px-6 py-3.5 border border-white/20 text-white/70 text-sm font-medium rounded-lg hover:bg-white/5 hover:text-white transition-colors text-center">
                See how it works
              </Link>
            </div>
            <div className="flex items-center gap-4 divide-x divide-white/10">
              <span className="text-xs text-white/40">14-day free trial</span>
              <span className="text-xs text-white/40 pl-4">No credit card</span>
              <span className="text-xs text-white/40 pl-4">Cancel anytime</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-[45%]"
          >
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 opacity-50"></div>
              {/* Mini Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="text-[11px] text-white/40 font-mono mb-1">Competitors</div>
                  <div className="text-xl font-semibold text-white">5</div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="text-[11px] text-white/40 font-mono mb-1">Changes</div>
                  <div className="text-xl font-semibold text-white">12</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-900/30 rounded-xl p-3">
                  <div className="text-[11px] text-blue-400 font-mono mb-1">Actions</div>
                  <div className="text-xl font-semibold text-blue-100">3</div>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-5 h-24 flex items-end gap-2 justify-between">
                {[4, 2, 6, 8, 3, 12, 5].map((val, i) => (
                  <div key={i} className={`w-full rounded-t-sm ${i === 5 ? 'bg-blue-500' : 'bg-white/10'}`} style={{ height: `${(val / 12) * 100}%` }}></div>
                ))}
              </div>
              
              {/* Mini Activity Feed */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5"><TrendUp size={12} weight="bold"/></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-white">Acme Corp</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Pricing</span>
                    </div>
                    <div className="text-[11px] text-white/50">Increased Pro plan from $49 to $59/mo</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><TrendUp size={12} weight="bold"/></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-white">Globex</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Feature</span>
                    </div>
                    <div className="text-[11px] text-white/50">Launched AI copilot for enterprise</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-[#0a0a0a]">From monitoring to action in minutes</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                num: "1",
                title: "Add your competitors",
                desc: "Paste the URLs of your top competitors. We instantly start monitoring their websites.",
              },
              {
                num: "2",
                title: "AI detects what changed",
                desc: "Our engine catches pricing updates, feature launches, and subtle positioning shifts.",
              },
              {
                num: "3",
                title: "Get ready-to-use actions",
                desc: "Receive weekly emails with draft responses and counter-moves to stay ahead.",
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="text-7xl font-bold text-[#f0f0f0] mb-4 tracking-tighter leading-none">{step.num}</div>
                <h3 className="text-xl font-semibold text-[#0a0a0a] mb-2">{step.title}</h3>
                <p className="text-sm text-[#525252] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature bento grid */}
      <section className="py-24 bg-[#0a0a0a] relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12"
          >
            <h2 className="text-3xl font-semibold tracking-tight text-white">Everything you need to stay ahead</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-4 auto-rows-[280px]">
            {/* Cell 1: Large - Digest */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="bg-[#141414] border border-white/10 rounded-xl p-6 md:col-span-4 md:row-span-1 overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
              <h3 className="text-lg font-semibold text-white mb-2 relative z-10">Weekly intelligence digest</h3>
              <p className="text-sm text-white/50 max-w-sm mb-6 relative z-10">Wake up every Monday to a clean summary of what changed in your market.</p>
              <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 w-64 bg-[#0a0a0a] border border-white/10 rounded-lg p-3 shadow-xl transform rotate-2 group-hover:rotate-0 transition-transform">
                <div className="text-[10px] text-white/40 font-mono mb-2 border-b border-white/10 pb-2">Mon 8:00 AM</div>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 bg-white/20 rounded"></div>
                  <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                  <div className="flex gap-2 mt-3">
                    <div className="w-4 h-4 rounded-sm bg-blue-500/20"></div>
                    <div className="w-4 h-4 rounded-sm bg-emerald-500/20"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cell 2: Tracked */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-[#141414] border border-white/10 rounded-xl p-6 md:col-span-2 md:row-span-1 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7 competitors tracked</h3>
                <p className="text-sm text-white/50">Watch your closest rivals without limits.</p>
              </div>
              <div className="space-y-1.5 mt-4">
                {[0.9, 0.7, 0.5].map((op, i) => (
                  <div key={i} className="h-6 bg-white/5 rounded-md flex items-center px-2" style={{opacity: op}}>
                    <div className="w-3 h-3 rounded bg-white/20 mr-2"></div>
                    <div className="h-1.5 w-20 bg-white/10 rounded"></div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Cell 3: Change types */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-[#141414] border border-white/10 rounded-xl p-6 md:col-span-2 md:row-span-1 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4 change types detected</h3>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Pricing</span>
                <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Feature</span>
                <span className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">Repositioning</span>
                <span className="text-[10px] px-2 py-1 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase">Copy</span>
              </div>
            </motion.div>

            {/* Cell 4: Action drafts */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-[#141414] border border-white/10 rounded-xl p-6 md:col-span-2 md:row-span-1 flex flex-col relative overflow-hidden"
            >
              <div className="relative z-10 mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">AI-generated drafts</h3>
                <p className="text-[13px] text-white/50">Ready-to-use counter moves.</p>
              </div>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-3 text-[10px] font-mono text-white/60 relative z-10 opacity-80 mt-auto">
                &gt; Draft response to Acme&apos;s new pricing:
                <br/>
                Highlight our unlimited tier value...
              </div>
            </motion.div>

            {/* Cell 5: Trend history */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-[#141414] border border-white/10 rounded-xl p-6 md:col-span-2 md:row-span-1 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">12-week trend history</h3>
                <p className="text-[13px] text-white/50">Spot macro patterns.</p>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-4">
                {Array.from({length: 15}).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-[3px] ${Math.random() > 0.6 ? 'bg-blue-500/50' : 'bg-white/5'}`}></div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <div className="bg-white border border-[#e5e5e5] rounded-2xl p-8 max-w-sm w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="text-sm font-semibold text-blue-600 mb-2">Competitor Analyzer Pro</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold text-[#0a0a0a] tracking-tight">$99</span>
                <span className="text-[#525252] text-sm">/month</span>
              </div>
              <div className="space-y-4 mb-8">
                {[
                  "Track up to 7 competitors",
                  "Weekly intelligence digest",
                  "AI-generated counter actions",
                  "12-week historical trends",
                  "Priority support"
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={16} className="text-[#0a0a0a] flex-shrink-0" weight="bold" />
                    <span className="text-sm text-[#525252]">{feat}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/login" className="block w-full py-3 bg-[#0a0a0a] text-white text-center text-sm font-medium rounded-lg hover:bg-[#1a1a1a] transition-colors mb-3">
                Start 14-day free trial
              </Link>
              <p className="text-[11px] text-[#a3a3a3] text-center font-mono">No credit card required. Cancel anytime.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crosshair size={20} weight="bold" className="text-white/50" />
            <span className="text-sm font-medium text-white/50 tracking-tight">Competitor Analyzer</span>
          </div>
          <p className="text-xs text-white/30 font-mono">© 2025 Competitor Analyzer. Built for founders.</p>
        </div>
      </footer>
    </div>
  );
}
