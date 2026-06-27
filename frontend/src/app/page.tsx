import Link from 'next/link';
import { ArrowRight, Check, Bell, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingBasic } from '@/components/ui/pricing-demo';
import ThemeToggle from '@/components/theme-toggle';
import LandingBattleCard from '@/components/landing-battlecard';
import MobileMenu from '@/components/landing-nav';
import { Reveal, RevealGroup, RevealItem } from '@/components/reveal';

// Rivalscope landing — AppKittie-structure in our blue (user-approved direction).
// Centered bold Space Grotesk hero + framed product panel with accent glow.
// No raw hex — semantic tokens only, theme-aware (dark default + light).

const AUTH = '/auth/login';

// De-neon stopgap: headline keyword is now solid foreground (gradient text read as
// toy/pet, not serious-tool). Emphasis will be re-decided in the proper hero redesign.
const gradText: React.CSSProperties = {
  color: 'var(--foreground)',
};

type Tone = 'pricing' | 'feature' | 'hiring';

const TONE: Record<Tone, string> = {
  pricing: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  feature: 'text-primary border-primary/30 bg-primary/10',
  hiring: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
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

const HERO_FEATURES = [
  'Track competitor pricing & page changes',
  'Aggregate complaints from G2 & Trustpilot',
  'Spot hiring & strategic signals early',
  'Get 5 ranked plays to win every deal',
];

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[15px] text-foreground/85">
      <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-primary/45 bg-primary/15">
        <Check size={12} strokeWidth={3} className="text-primary" />
      </span>
      <span>{children}</span>
    </div>
  );
}

function Avatars() {
  const items = ['S', 'L', 'N', 'R'];
  return (
    <span className="flex">
      {items.map((m, i) => (
        <span
          key={m}
          className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-secondary text-[11px] font-semibold text-secondary-foreground"
          style={{ marginLeft: i ? -9 : 0 }}
        >
          {m}
        </span>
      ))}
      <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-primary/20 text-[11px] font-semibold text-primary" style={{ marginLeft: -9 }}>
        +
      </span>
    </span>
  );
}

// Framed product panel with an accent glow behind it — the AppKittie hero "screenshot".
function ProductPanel() {
  return (
    <div className="relative mx-auto mt-16 max-w-[1040px] px-1">
      <div className="relative grid grid-cols-1 sm:grid-cols-[188px_1fr] overflow-hidden rounded-t-xl border border-border bg-card text-left">
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
              <h3 className="font-display text-[19px] font-semibold">Dashboard</h3>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Fri 26 Jun 2026 · Intel HQ</p>
            </div>
            <span className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground">Scan now</span>
          </div>
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[['Competitors', '12', '+3 this week'], ['Changes / 7d', '47', '+12'], ['Signals', '8', '2 strategic'], ['Queued plays', '5', 'ready']].map(([k, v, d], i) => (
              <div key={k} className="rounded-xl border border-border bg-background/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{k}</p>
                <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums tracking-[-0.03em]" style={i === 3 ? { color: 'var(--primary)' } : undefined}>{v}</p>
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
            {FEED.map((r) => (
              <div key={r.name} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-[7px] text-[11px] font-semibold text-white" style={{ background: r.bg }}>{r.mark}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold">{r.name}<Badge tone={r.tone}>{r.label}</Badge></div>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{r.desc}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{r.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Bell, title: 'Always watching', desc: 'Pricing, pages, reviews and hiring tracked around the clock. You hear about changes before your prospects do.' },
  { icon: FileText, title: 'One battle card per rival', desc: 'Every signal compiled into a structured card: summary, weak spots, and five ranked plays your reps can send.' },
  { icon: TrendingUp, title: 'Ranked by what wins', desc: 'Plays are ordered by impact and pulled from real complaints, so the first move is the one most likely to close.' },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground antialiased">
      <div className="mx-auto max-w-[1180px] px-6">
        {/* NAV */}
        <nav className="sticky top-0 z-50 -mx-6 flex h-16 items-center justify-between border-b border-border bg-background/92 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-md" style={{ backgroundImage: 'var(--gradient-primary)' }} />
            <span className="font-display text-[17px] font-semibold tracking-tight">Rivalscope</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-foreground" href="#product">Product</a>
            <a className="transition-colors hover:text-foreground" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link className="hidden px-2 text-muted-foreground transition-colors hover:text-foreground sm:inline" href={AUTH}>Sign in</Link>
            <Link href={AUTH} className="hidden rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 md:inline-flex">Start free</Link>
            <MobileMenu />
          </div>
        </nav>

        {/* HERO — Linear port: left-aligned, monochrome, type-forward */}
        <header className="pb-16 pt-20 md:pb-24 md:pt-28">
          <h1 className="max-w-[760px] text-balance text-[clamp(38px,6vw,64px)] font-medium leading-[1.03] tracking-[-0.022em] text-foreground">
            The competitive intelligence system for modern sales teams
          </h1>
          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
              Track every competitor&apos;s pricing, messaging, and hiring — then hand your reps the play that wins the deal.
            </p>
            <Link href={AUTH} className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              <span className="font-medium text-foreground">New</span> Auto-generated battle cards
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="mt-9 flex items-center gap-2">
            <Link href={AUTH} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90">
              Start free <ArrowRight size={15} />
            </Link>
            <a href="mailto:support@rivalscope.dev" className="rounded-full px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground">
              Book a demo
            </a>
          </div>

          <ProductPanel />
        </header>

        {/* TRUST STRIP */}
        <section className="border-y border-border py-8">
          <Reveal>
            <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Built for teams selling against fast-moving rivals
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-base font-medium text-muted-foreground/70">
              <span>Stripe</span><span>Linear</span><span>Notion</span><span>Figma</span><span>Vercel</span><span>Ramp</span>
            </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS — feature cards */}
        <section id="how-it-works" className="scroll-mt-20 py-20">
          <Reveal>
            <h2 className="mx-auto max-w-[20ch] text-center font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              From a dozen signals to <span style={gradText}>one sales play.</span>
            </h2>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <RevealItem key={f.title}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/40">
                  <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <f.icon size={19} />
                  </span>
                  <h3 className="font-display text-[17px] font-semibold">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* PRODUCT — battle-card showcase */}
        <section id="product" className="scroll-mt-20 grid items-center gap-12 border-t border-border py-20 md:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-[clamp(28px,3vw,36px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              Every rival, on one battle card.
            </h2>
            <p className="mb-7 mt-5 max-w-[440px] text-[15px] leading-relaxed text-muted-foreground">
              Rivalscope compiles every change, complaint and signal into a structured battle card, so your reps walk in already knowing the win.
            </p>
            <Link href={AUTH} className="inline-flex items-center gap-2 text-[14px] font-medium text-primary hover:underline">
              Generate your first battle card <ArrowRight size={15} />
            </Link>
          </Reveal>
          <Reveal delay={1}>
            <LandingBattleCard />
          </Reveal>
        </section>

        {/* PRICING */}
        <section id="pricing" className="scroll-mt-20 border-t border-border py-20">
          <Reveal>
            <PricingBasic />
          </Reveal>
        </section>

        {/* CTA CLOSER */}
        <section className="border-t border-border py-24 text-center">
          <Reveal>
            <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.05] tracking-[-0.02em]">
              Stop guessing what your <span style={gradText}>competitors are doing.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[460px] text-[16px] leading-relaxed text-muted-foreground">
              Add a competitor and get your first battle card in minutes.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" variant="cta" className="gap-2" asChild><Link href={AUTH}>Start free <ArrowRight size={16} /></Link></Button>
              <Button size="lg" variant="outline" asChild><a href="mailto:support@rivalscope.dev">Book a demo</a></Button>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 Rivalscope</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <a href="mailto:support@rivalscope.dev" className="transition-colors hover:text-foreground">Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
