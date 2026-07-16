import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PricingBasic } from '@/components/ui/pricing-demo';
import ThemeToggle from '@/components/theme-toggle';
import MobileMenu from '@/components/landing-nav';
import { HowItWorks } from '@/components/landing/how-it-works';
import { ProductShowcase } from '@/components/landing/product-showcase';
import { LogoCloud } from '@/components/landing/logo-cloud';
import { CtaCloser } from '@/components/landing/cta-closer';
import { SiteFooter } from '@/components/landing/site-footer';
import { MotionProvider } from '@/components/landing/motion-provider';
import { MockDate } from '@/components/landing/mock-date';
import { RevealGroup, RevealItem } from '@/components/reveal';
import { CountUp } from '@/components/ui/count-up';

// Rivalscope landing — serious-tool register (Linear port). Hero + framed product
// panel set the tone; the sections below are rebuilt to match (see
// docs/superpowers/specs/2026-06-28-landing-sections-redesign-design.md).

const AUTH = '/auth/login';

type Tone = 'pricing' | 'feature' | 'hiring';

const TONE: Record<Tone, string> = {
  pricing: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
  feature: 'text-primary border-primary/30 bg-primary/10',
  hiring: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
};

const FEED: { mark: string; bg: string; name: string; tone: Tone; label: string; desc: string; t: string }[] = [
  { mark: 'S', bg: '#635bff', name: 'Stripe', tone: 'pricing', label: 'Pricing', desc: 'Raised Starter to $29/mo, annual moved below the fold', t: '3h' },
  { mark: 'L', bg: '#5e6ad2', name: 'Linear', tone: 'feature', label: 'Feature', desc: 'Shipped an AI assistant on the pricing page', t: '5h' },
  { mark: 'N', bg: '#111111', name: 'Notion', tone: 'hiring', label: 'Hiring', desc: 'Opened 4 enterprise AE roles in EMEA', t: '1d' },
];

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide ${TONE[tone]}`}>
      {children}
    </span>
  );
}

// Framed product panel behind the hero — the dashboard "screenshot", flat (no glow).
function ProductPanel() {
  return (
    <div className="relative mx-auto mt-16 max-w-[1040px] px-1">
      <div className="relative grid grid-cols-1 sm:grid-cols-[188px_1fr] overflow-hidden rounded-t-xl border border-border bg-card text-left shadow-[0_50px_140px_-50px_rgba(8,9,10,0.95)] ring-1 ring-foreground/[0.05]">
        {/* sidebar */}
        <div className="hidden border-r border-border bg-muted/40 p-3 sm:block">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="h-[18px] w-[18px] rounded-md" style={{ backgroundImage: 'var(--gradient-primary)' }} />
            <span className="font-display text-[13px] font-semibold">Rivalscope</span>
          </div>
          <p className="px-2 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">Desk</p>
          {['Dashboard', 'Competitors', 'Campaigns'].map((l, i) => (
            <div key={l} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${i === 0 ? 'bg-primary/12 font-medium text-primary' : 'text-muted-foreground'}`}>
              <span className="h-3 w-3 rounded-[3px] bg-current opacity-55" />{l}
            </div>
          ))}
          <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">Signal</p>
          {['Intel Feed', 'Battle Cards', 'Trends'].map((l) => (
            <div key={l} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground">
              <span className="h-3 w-3 rounded-[3px] bg-current opacity-55" />{l}
            </div>
          ))}
        </div>
        {/* main */}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-[19px] font-semibold">Dashboard</div>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"><MockDate /></p>
            </div>
            <span className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground">Scan now</span>
          </div>
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[['Competitors', '12', '+3 this week'], ['Changes / 7d', '47', '+12'], ['Signals', '8', '2 strategic'], ['Queued plays', '5', 'ready']].map(([k, v, d], i) => (
              <div key={k} className="rounded-xl border border-border bg-background/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{k}</p>
                <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums tracking-[-0.03em]" style={i === 3 ? { color: 'var(--primary)' } : undefined}><CountUp to={Number(v)} /></p>
                <p className={`text-[11px] ${i === 3 ? 'text-muted-foreground' : 'text-emerald-500'}`}>{d}</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-background/40">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[12.5px] font-semibold">
              Intel feed
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Live
              </span>
            </div>
            <RevealGroup viewport={{ once: true }}>
              {FEED.map((r) => (
                <RevealItem key={r.name} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                  <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px] text-[11px] font-semibold text-white" style={{ background: r.bg }}>{r.mark}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold">{r.name}<Badge tone={r.tone}>{r.label}</Badge></div>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{r.desc}</p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.t}</span>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <MotionProvider>
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground antialiased">
      {/* Atmospheric hero wash — Stripe-port depth, restrained single-accent blue (not neon) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[860px]"
        style={{ background: 'radial-gradient(115% 56% at 50% -12%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%)' }}
      />
      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        {/* NAV */}
        <nav className="sticky top-0 z-50 -mx-6 flex h-16 items-center justify-between border-b border-border bg-background/92 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-md" style={{ backgroundImage: 'var(--gradient-primary)' }} />
            <span className="font-display text-[17px] font-semibold tracking-tight">Rivalscope</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="py-3 transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
            <a className="py-3 transition-colors hover:text-foreground" href="#product">Product</a>
            <a className="py-3 transition-colors hover:text-foreground" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link className="hidden px-2 py-3 text-muted-foreground transition-colors hover:text-foreground sm:inline-block" href={AUTH}>Sign in</Link>
            <Link href={AUTH} className="hidden rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 md:inline-flex">Start free</Link>
            <MobileMenu />
          </div>
        </nav>

        {/* HERO — Linear port: left-aligned, monochrome, type-forward */}
        <header className="pb-16 pt-20 md:pb-24 md:pt-28">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Competitive intelligence for sales teams
          </p>
          <h1 className="max-w-[760px] text-balance text-[clamp(38px,6vw,64px)] font-medium leading-[1.03] tracking-[-0.022em] text-foreground">
            Track every competitor. Turn each change into a winning play.
          </h1>
          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
              Pricing, messaging and hiring, watched around the clock and compiled into ranked sales plays your reps can send.
            </p>
            <Link href={AUTH} className="group inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              <span className="font-medium text-foreground">New</span> Auto-generated battle cards
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-2">
            <Link href={AUTH} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90">
              Start free <ArrowRight size={15} />
            </Link>
            <a href="mailto:support@rivalscope.dev" className="inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              Book a demo
            </a>
          </div>

          <ProductPanel />
        </header>

        <LogoCloud />
        <HowItWorks />
        <ProductShowcase />

        {/* PRICING */}
        <section id="pricing" className="scroll-mt-20 border-t border-border py-24">
          <PricingBasic />
        </section>

        <CtaCloser />
        <SiteFooter />
      </div>
    </div>
    </MotionProvider>
  );
}
