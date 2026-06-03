'use client';

import Link from 'next/link';
import {
  Crosshair,
  ArrowDown,
  CheckCircle,
  XCircle,
  TrendUp,
  MapPin,
  Buildings,
  ChartLineUp,
  Megaphone,
} from '@phosphor-icons/react';
import { motion, useScroll, Variants } from 'motion/react';
import { useState, useEffect } from 'react';

// Reusable animated container for stagger
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setScrolled(latest > 20);
    });
  }, [scrollY]);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden relative">
      {/* 1. NAVIGATION */}
      <nav
        className={`fixed top-0 inset-x-0 h-16 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Crosshair size={18} weight="bold" className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Competitor Analyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/auth/login"
                className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-colors shadow-sm"
              >
                Start free trial
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 flex flex-col items-center min-h-[100dvh] justify-center overflow-hidden">
        {/* Aurora Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-500 to-transparent rounded-full blur-[120px] opacity-30"
            animate={{
              x: [0, 50, -50, 0],
              y: [0, 50, -30, 0],
              scale: [1, 1.1, 0.9, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-[20%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-bl from-indigo-500 to-transparent rounded-full blur-[120px] opacity-20"
            animate={{
              x: [0, -60, 40, 0],
              y: [0, -40, 60, 0],
              scale: [1, 1.2, 0.8, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-gradient-to-t from-violet-500 to-transparent rounded-full blur-[120px] opacity-15"
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -50, 30, 0],
              scale: [1, 0.9, 1.1, 1],
              opacity: [0.25, 0.35, 0.25],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 text-left"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-medium text-white/70 uppercase tracking-widest">
                Now tracking 847 competitors
              </span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6">
              Know what your competitors <br className="hidden md:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300">
                did
              </span>
              , and what to do next.
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-white/60 max-w-xl leading-relaxed mb-10 font-light">
              Competitor Analyzer monitors pricing, reviews, job postings, and social. Then generates a weekly Battle Card with your exact action plan. 30x cheaper than Crayon.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-black text-base font-bold rounded-full w-full sm:w-auto shadow-lg"
                >
                  Start free trial
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white text-base font-medium rounded-full w-full sm:w-auto hover:bg-white/10 transition-colors"
                >
                  See how it works
                  <ArrowDown size={16} weight="bold" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 text-[11px] text-white/40 font-mono">
              <div className="flex items-center gap-1.5"><CheckCircle size={14} /> 14-day free trial</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={14} /> No credit card needed</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={14} /> Setup in 5 minutes</div>
            </motion.div>
          </motion.div>

          {/* Right side product preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-[45%] perspective-1000"
          >
            <div className="bg-[#0a0a0a] rounded-2xl border border-blue-500/30 p-6 shadow-[0_0_40px_rgba(37,99,235,0.15)] relative overflow-hidden transform lg:rotate-y-[-5deg]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="font-bold text-white text-sm">S</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">Stripe</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-xs text-white/40 font-mono">Battle Card</span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">3 changes this week</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Pricing change</span>
                    <span className="text-xs text-white/70 truncate">Updated enterprise pricing tier to custom only</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">New feature</span>
                    <span className="text-xs text-white/70 truncate">Launched new checkout component</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">Messaging update</span>
                    <span className="text-xs text-white/70 truncate">Changed hero text to highlight global reach</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Your action plan</h4>
                <ul className="space-y-3">
                  {[
                    "Emphasize your monthly billing option in sales calls",
                    "Update pricing page to highlight your flexibility",
                    "Write a response blog post about their new feature"
                  ].map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                      <span className="text-sm text-white/80 leading-snug">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10">
                <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors border border-white/10">
                  View full Battle Card
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF BAR */}
      <section className="bg-[#0f0f0f] border-y border-white/5 py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-white/40 mb-6">
            Founders and business owners monitoring their competitors
          </p>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={containerVariants}
            className="flex flex-wrap justify-center items-center gap-3"
          >
            {["SaaS Startup", "Marketing Agency", "E-commerce", "Beauty Salon", "Restaurant", "Gym"].map((badge) => (
              <motion.div
                key={badge}
                variants={itemVariants}
                className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 font-medium"
              >
                {badge}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-white text-[#0a0a0a] relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">From monitoring to action in minutes</h2>
            <p className="text-[#525252] max-w-xl mx-auto">Every Monday: what changed, what it means, what to do about it. One per competitor. Zero manual work.</p>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="hidden md:block absolute top-7 left-[15%] right-[15%] h-[2px] bg-[#e5e5e5]" />
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
                title: "Get your Battle Card",
                desc: "Receive weekly emails with draft responses and counter-moves to stay ahead.",
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 bg-blue-50 border-2 border-white rounded-full flex items-center justify-center text-xl font-bold text-blue-600 mb-6 relative z-10 shadow-sm">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[#525252] leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. BATTLE CARD FEATURE SECTION */}
      <section className="py-24 bg-[#0a0a0a] relative overflow-hidden border-t border-white/5">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex-1 text-left"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-widest mb-6">
              The Battle Card
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 leading-[1.1]">
              Not just data. <br />
              <span className="text-white/50">A playbook.</span>
            </h2>
            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              Every week, for each competitor, you get four things: what they changed, what their customers are saying, what their hiring tells you about their strategy, and exactly what to do about it.
            </p>

            <ul className="space-y-4">
              {[
                "Pricing and feature changes, tracked automatically",
                "G2 and Google Reviews, surfaced and summarized",
                "Job postings, interpreted for strategic signal",
                "AI action plan, 5 specific moves to outposition them"
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <span className="text-base text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="flex-1 w-full max-w-lg perspective-1000">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={containerVariants}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-blue-500 opacity-50 rounded-t-2xl" />
              
              <div className="border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold">Stripe Weekly Battle Card</h3>
                <p className="text-xs text-white/40 font-mono">Generated Oct 24</p>
              </div>

              {/* What changed */}
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendUp size={16} className="text-white/50" />
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wide">What changed</h4>
                </div>
                <div className="space-y-2">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase mb-1">Pricing</span>
                    <p className="text-sm text-white/80">Removed public enterprise pricing grid.</p>
                  </div>
                </div>
              </motion.div>

              {/* Complaints */}
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone size={16} className="text-white/50" />
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Customer complaints</h4>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-red-500/20 border-l-2 border-l-red-500">
                  <p className="text-xs text-white/60 italic mb-1">"Support took 3 days to resolve our payout issue..."</p>
                  <p className="text-[10px] text-white/40 font-mono">Trustpilot • 1 star</p>
                </div>
              </motion.div>

              {/* Strategic Signal */}
              <motion.div variants={itemVariants} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <ChartLineUp size={16} className="text-white/50" />
                  <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Strategic signal</h4>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-sm text-white/80">Posted 4 new Enterprise Sales roles in EMEA. Expect heavy outbound motion in Europe.</p>
                </div>
              </motion.div>

              {/* Your moves */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-blue-400" />
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Your moves</h4>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-100">
                    <li>Highlight your 24/7 priority support on the pricing page.</li>
                    <li>Create an EMEA-specific landing page for localized sales.</li>
                  </ol>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. TWO-TIER PRICING */}
      <section className="py-24 bg-[#050505] relative border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-white/50">Choose the intelligence engine for your specific market.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
            {/* SaaS Card */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-8 flex flex-col relative"
            >
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6 w-max">
                For Startups
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold tracking-tight">$49</span>
                <span className="text-white/50 font-medium">/month</span>
              </div>
              <p className="text-sm text-white/50 mb-8 min-h-[40px]">Bootstrapped or seed-stage SaaS competing for market share</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Up to 7 competitors",
                  "Weekly Battle Cards",
                  "G2 + review tracking",
                  "Job postings intelligence",
                  "AI action plans",
                  "Monday morning digest"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle size={16} className="text-white" />
                    {feat}
                  </li>
                ))}
              </ul>
              
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link href="/auth/login" className="block w-full py-3.5 bg-white text-black text-center text-sm font-bold rounded-full shadow-lg">
                  Start free trial
                </Link>
              </motion.div>
            </motion.div>

            {/* Local Business Card */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#111] border border-blue-500/30 rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(37,99,235,0.1)]"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 w-max">
                For Local Business
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold tracking-tight">$19</span>
                <span className="text-white/50 font-medium">/month</span>
              </div>
              <p className="text-sm text-white/50 mb-8 min-h-[40px]">Salons, gyms, cafes, restaurants competing for local customers</p>
              
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Up to 5 local competitors",
                  "Google Reviews tracking",
                  "Instagram + Facebook monitoring",
                  "Weekly Battle Card",
                  "AI action plan"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle size={16} className="text-blue-400" />
                    {feat}
                  </li>
                ))}
              </ul>
              
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link href="/auth/login" className="block w-full py-3.5 bg-blue-600 text-white text-center text-sm font-bold rounded-full shadow-lg">
                  Start free trial
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-white/60">14-day free trial. No credit card required. Cancel anytime.</p>
            <div className="inline-block bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/50 max-w-2xl mx-auto">
              Crayon charges $1,500/month for the enterprise version. We built the same intelligence for founders and local businesses.
            </div>
          </div>
        </div>
      </section>

      {/* 7. COMPARISON TABLE SECTION */}
      <section className="py-24 bg-white text-[#0a0a0a] relative">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Everything Crayon offers. 30x cheaper.</h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left font-medium text-[#525252] border-b border-[#e5e5e5] w-1/3"></th>
                  <th className="p-4 text-center font-bold text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 rounded-t-xl w-1/5">Us</th>
                  <th className="p-4 text-center font-semibold text-[#0a0a0a] border-b border-[#e5e5e5] w-1/5">Manual tracking</th>
                  <th className="p-4 text-center font-semibold text-[#0a0a0a] border-b border-[#e5e5e5] w-1/5">Crayon/Klue</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Price", us: "From $19/mo", manual: "Free (Your time)", crayon: "$800 - $1,500/mo" },
                  { label: "Setup time", us: "5 minutes", manual: "Hours per week", crayon: "3-6 months" },
                  { label: "Automated monitoring", us: true, manual: false, crayon: true },
                  { label: "AI action plans", us: true, manual: false, crayon: false },
                  { label: "Review tracking", us: true, manual: true, crayon: true },
                  { label: "Job postings", us: true, manual: true, crayon: true },
                  { label: "Contract required", us: false, manual: false, crayon: true }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="p-4 text-sm font-medium text-[#525252]">{row.label}</td>
                    <td className="p-4 text-center bg-blue-50/30">
                      {typeof row.us === 'boolean' ? (
                        row.us ? <CheckCircle size={20} className="text-blue-600 mx-auto" weight="fill" /> : <XCircle size={20} className="text-[#a3a3a3] mx-auto" />
                      ) : (
                        <span className="text-sm font-semibold text-blue-600">{row.us}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.manual === 'boolean' ? (
                        row.manual ? <CheckCircle size={20} className="text-[#525252] mx-auto" weight="fill" /> : <XCircle size={20} className="text-[#a3a3a3] mx-auto" />
                      ) : (
                        <span className="text-sm text-[#525252]">{row.manual}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.crayon === 'boolean' ? (
                        row.crayon ? <CheckCircle size={20} className="text-[#525252] mx-auto" weight="fill" /> : <XCircle size={20} className="text-[#a3a3a3] mx-auto" />
                      ) : (
                        <span className="text-sm text-[#525252]">{row.crayon}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                <Crosshair size={12} weight="bold" className="text-white/50" />
              </div>
              <span className="text-sm font-bold text-white/50 tracking-tight">Competitor Analyzer</span>
            </div>
            <p className="text-xs text-white/40 mt-2 text-center md:text-left">
              Built in public by a solo founder. Follow the journey on X and LinkedIn.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#twitter" className="hover:text-white transition-colors">X (Twitter)</a>
            <a href="#linkedin" className="hover:text-white transition-colors">LinkedIn</a>
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
