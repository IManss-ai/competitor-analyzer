'use client';

import Link from 'next/link';
import { Crosshair, ArrowRight, CheckCircle, CaretRight, Sparkle } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import DisplayCards from '@/components/ui/display-cards';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import AnimatedHero from '@/components/ui/animated-hero';

const FEED = [
  { company: 'Stripe', action: 'Removed enterprise pricing from public page', time: '2h ago', type: 'pricing' },
  { company: 'PayPal', action: 'Launched new checkout SDK v4.1', time: '6h ago', type: 'feature' },
  { company: 'Braintree', action: 'Updated developer docs navigation', time: '1d ago', type: 'copy' },
  { company: 'Square', action: 'Changed hero from "fast" to "global payments"', time: '2d ago', type: 'messaging' },
  { company: 'Adyen', action: 'Added 3 new enterprise case studies', time: '3d ago', type: 'content' },
];

const TYPE_COLOR: Record<string, string> = {
  pricing: 'text-amber-400',
  feature: 'text-emerald-400',
  copy: 'text-blue-400',
  messaging: 'text-violet-400',
  content: 'text-zinc-400',
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#080808] text-white font-sans overflow-x-hidden">

      {/* NAV */}
      <nav className={`fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 lg:px-10 transition-all duration-200 ${scrolled ? 'bg-[#080808]/95 backdrop-blur-sm border-b border-white/[0.06]' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <Crosshair size={13} weight="bold" className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Competitor Analyzer</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/auth/login" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">Sign in</Link>
          <Link href="/auth/login" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded transition-colors">
            Start free
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-16 lg:pt-44 lg:pb-20 px-6 lg:px-10">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-16">

          {/* Animated Hero */}
          <AnimatedHero titles={["pricing changes", "new features", "job postings", "review shifts", "hiring moves"]} />

          {/* Live Intel Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="border border-white/[0.08] rounded-sm bg-[#0d0d0d] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0a]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                  </div>
                  <span className="text-[11px] font-mono text-white/25">competitor-feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400/60">live</span>
                </div>
              </div>

              <div className="p-5 font-mono text-[12px]">
                <div className="text-white/20 mb-5">$ monitoring 5 competitors -- last scan 2h ago</div>
                <div className="space-y-4">
                  {FEED.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <span className="text-white/20 flex-shrink-0 mt-px">›</span>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold ${TYPE_COLOR[item.type]}`}>{item.company}</span>
                        <span className="text-white/50 ml-2 leading-snug">{item.action}</span>
                      </div>
                      <span className="text-white/20 flex-shrink-0 pl-3">{item.time}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-blue-400">
                  -&gt; 3 Battle Cards ready for review
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STAT BAR */}
      <div className="border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4">
          {[
            { n: '30x', label: 'cheaper than Crayon' },
            { n: '7', label: 'competitors tracked' },
            { n: '5 min', label: 'to set up' },
            { n: '14 days', label: 'free trial' },
          ].map((s, i) => (
            <div key={i} className={`py-7 text-center ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}>
              <div className="text-2xl font-bold tracking-tight">{s.n}</div>
              <div className="text-xs text-white/35 mt-1 font-mono">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DISPLAY CARDS */}
      <section className="py-20 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-10">Latest intelligence</p>
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
        </div>
      </section>

      {/* BATTLE CARD */}
      <section id="battle-card" className="py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <p className="text-[11px] font-mono text-blue-400 uppercase tracking-widest mb-4">The Battle Card</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
              Not just alerts.<br />A weekly playbook.
            </h2>
            <p className="text-white/45 mt-4 max-w-lg text-lg leading-relaxed">
              Four sections per competitor. Delivered every Monday. Built to act on, not just read.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06]">
            {[
              {
                num: '01',
                label: 'What changed',
                body: (
                  <div className="space-y-3">
                    {[
                      { tag: 'pricing', tagColor: 'text-amber-400 bg-amber-400/10', text: 'Removed enterprise pricing from public page' },
                      { tag: 'feature', tagColor: 'text-emerald-400 bg-emerald-400/10', text: 'Launched new checkout SDK with 3 new integrations' },
                      { tag: 'copy', tagColor: 'text-blue-400 bg-blue-400/10', text: 'Hero changed from "fast payments" to "global payments"' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm uppercase flex-shrink-0 mt-0.5 ${row.tagColor}`}>{row.tag}</span>
                        <span className="text-sm text-white/65 leading-snug">{row.text}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '02',
                label: 'Customer complaints',
                body: (
                  <div className="space-y-4">
                    <div className="border-l-2 border-red-400/30 pl-4">
                      <p className="text-sm text-white/60 italic leading-relaxed">&ldquo;Support took 4 days to resolve our payout issue.&rdquo;</p>
                      <p className="text-[10px] font-mono text-white/25 mt-1.5">Trustpilot · 1 star · 2 days ago</p>
                    </div>
                    <div className="border-l-2 border-amber-400/30 pl-4">
                      <p className="text-sm text-white/60 italic leading-relaxed">&ldquo;Pricing is completely opaque after their latest change.&rdquo;</p>
                      <p className="text-[10px] font-mono text-white/25 mt-1.5">G2 · 2 stars · 5 days ago</p>
                    </div>
                  </div>
                ),
              },
              {
                num: '03',
                label: 'Strategic signal',
                body: (
                  <div className="space-y-4">
                    {[
                      { highlight: '4 Enterprise Sales roles', rest: ' posted in EMEA this week. Aggressive European expansion incoming.' },
                      { highlight: 'Head of Partnerships', rest: ' hired. Channel strategy shift coming in 60-90 days.' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-white/20 font-mono flex-shrink-0 mt-0.5">›</span>
                        <p className="text-sm text-white/60 leading-snug">
                          <span className="text-white">{item.highlight}</span>{item.rest}
                        </p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '04',
                label: 'Your moves',
                body: (
                  <div className="space-y-4">
                    {[
                      'Lead EMEA sales calls with your local pricing advantage',
                      'Add "24h support" to the hero section of your pricing page',
                      'Write a comparison landing page targeting their dissatisfied customers',
                    ].map((move, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle size={15} weight="fill" className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/75 leading-snug">{move}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="bg-[#080808] p-8"
              >
                <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-5">{card.num} — {card.label}</p>
                {card.body}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTAINER SCROLL */}
      <section className="py-10 px-6 lg:px-10 border-t border-white/[0.06]">
        <ContainerScroll
          titleComponent={
            <div className="text-center mb-6">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.05] mb-3">
                The complete picture, delivered weekly.
              </h2>
              <p className="text-white/40 text-lg font-mono">Every competitor. Every change. One playbook.</p>
            </div>
          }
        >
          <div className="h-full w-full p-4 font-mono text-[12px]">
            <div className="grid grid-cols-2 gap-3 h-full">
              {[
                {
                  num: '01',
                  label: 'What changed',
                  lines: ['pricing: enterprise tier removed', 'feature: SDK v4.1 launched', 'copy: hero rewrite detected'],
                  accent: 'text-amber-400',
                },
                {
                  num: '02',
                  label: 'Customer complaints',
                  lines: ['"Support took 4 days..." - 1 star', '"Pricing opaque since update"', '"API docs are confusing"'],
                  accent: 'text-red-400',
                },
                {
                  num: '03',
                  label: 'Strategic signal',
                  lines: ['4 EMEA sales roles posted', 'Head of Partnerships hired', 'Series B announced'],
                  accent: 'text-violet-400',
                },
                {
                  num: '04',
                  label: 'Your moves',
                  lines: ['Lead EMEA calls w/ local pricing', 'Add "24h support" to hero', 'Write comparison landing page'],
                  accent: 'text-blue-400',
                },
              ].map((section, i) => (
                <div key={i} className="border border-white/[0.08] rounded p-3 bg-[#0a0a0a]">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">{section.num} -- {section.label}</p>
                  <div className="space-y-1.5">
                    {section.lines.map((line, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className={`flex-shrink-0 mt-px ${section.accent}`}>›</span>
                        <span className="text-white/60 leading-snug">{line}</span>
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
      <section className="py-20 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Two segments. One platform.</h2>
            <p className="text-white/40 mt-2 text-sm font-mono">Crayon charges $1,500/mo. We built the same thing for the people they ignore.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06]">
            {[
              {
                label: 'For SaaS founders',
                price: '$49',
                desc: 'Bootstrapped or seed-stage. Competing for deals. Priced out of Crayon.',
                items: ['Up to 7 competitors', 'Weekly Battle Cards', 'G2 + Trustpilot reviews', 'Job postings intelligence', 'AI action plans'],
                accent: false,
              },
              {
                label: 'For local businesses',
                price: '$19',
                desc: 'Salons, gyms, cafes, restaurants. Competing for local customers.',
                items: ['Up to 5 competitors', 'Google Reviews tracking', 'Instagram + Facebook posts', 'Weekly Battle Card', 'AI action plan'],
                accent: true,
              },
            ].map((tier, i) => (
              <div key={i} className="bg-[#080808] p-10">
                <p className="text-[11px] font-mono text-white/35 uppercase tracking-widest mb-6">{tier.label}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-bold tracking-tight">{tier.price}</span>
                  <span className="text-white/35 font-mono">/month</span>
                </div>
                <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">{tier.desc}</p>
                <ul className="space-y-3 mb-10">
                  {tier.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/60">
                      <CaretRight size={11} className={tier.accent ? 'text-blue-400' : 'text-white/30'} weight="bold" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded active:scale-[0.98] transition-all ${
                    tier.accent
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                      : 'border border-white/15 text-white hover:bg-white hover:text-black'
                  }`}
                >
                  Start free trial
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-white/25 font-mono">
            14-day free trial on both plans. No credit card required. Cancel anytime.
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-8">14-day free trial · no credit card required</p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
              Your competitors are<br />being watched right now.
            </h2>
            <p className="text-white/40 mb-10 text-lg">The only question is whether you are the one watching.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-500 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(37,99,235,0.3)]"
            >
              Start free trial
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white/[0.06] rounded flex items-center justify-center">
              <Crosshair size={11} weight="bold" className="text-white/40" />
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
