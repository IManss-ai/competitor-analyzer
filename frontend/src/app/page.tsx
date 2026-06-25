import Link from 'next/link';
import { ArrowRight, Check, Bell, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingBasic } from '@/components/ui/pricing-demo';
import ThemeToggle from '@/components/theme-toggle';
import LandingBattleCard from '@/components/landing-battlecard';
import MobileMenu from '@/components/landing-nav';

// Rivalscope landing — refined "Intelligence Desk" direction (user-approved).
// Anchored to the live shadcn neutral-modern tokens (zinc graphite + single blue).
// Sentence case throughout; mono reserved for timestamps / numerals / data badges.
// No raw hex — semantic tokens only, theme-aware (dark default + light).

const AUTH = '/auth/login';

type Tone = 'pricing' | 'feature' | 'hiring';

const TONE: Record<Tone, string> = {
  pricing: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  feature: 'text-primary border-primary/30 bg-primary/10',
  hiring: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
};

const FEED: { mark: string; name: string; tone: Tone; label: string; desc: string; t: string }[] = [
  { mark: 'S', name: 'Stripe', tone: 'pricing', label: 'Pricing', desc: 'Raised Starter to $29/mo, annual moved below the fold', t: '3h' },
  { mark: 'L', name: 'Linear', tone: 'feature', label: 'Feature', desc: 'Shipped an AI assistant on the pricing page', t: '5h' },
  { mark: 'N', name: 'Notion', tone: 'hiring', label: 'Hiring', desc: 'Opened 4 enterprise AE roles in EMEA', t: '1d' },
];

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide ${TONE[tone]}`}>
      {children}
    </span>
  );
}

function IntelFeed() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="text-sm font-medium text-card-foreground">Intel feed</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Live
        </span>
      </div>
      <div className="divide-y divide-border">
        {FEED.map((r) => (
          <div key={r.name} className="flex items-start gap-3 px-5 py-3.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-md border border-border bg-secondary text-xs font-semibold text-secondary-foreground">
              {r.mark}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-card-foreground">{r.name}</span>
                <Badge tone={r.tone}>{r.label}</Badge>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{r.t}</span>
              </div>
              <p className="mt-1 truncate text-[13px] text-muted-foreground">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="font-mono text-xs text-muted-foreground">Top signal · Stripe</span>
        <span className="font-mono text-sm font-semibold text-primary">91</span>
      </div>
    </div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[15px] text-muted-foreground">
      <span className="mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-md border border-primary/30 bg-primary/10">
        <Check size={11} strokeWidth={3} className="text-primary" />
      </span>
      <span>{children}</span>
    </div>
  );
}

const FEATURES = [
  { icon: Bell, title: 'Always watching', desc: 'Pricing, pages, reviews and hiring tracked around the clock — you hear about changes before your prospects do.' },
  { icon: FileText, title: 'One battle card per rival', desc: 'Every signal compiled into a structured card: summary, weak spots, and five ranked plays your reps can send.' },
  { icon: TrendingUp, title: 'Ranked by what wins', desc: 'Plays are ordered by impact and pulled from real complaints, so the first move is the one most likely to close.' },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground antialiased">
      <div className="mx-auto max-w-[1180px] px-6">
        {/* NAV */}
        <nav className="relative flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">R</div>
            <span className="text-[17px] font-semibold tracking-tight">Rivalscope</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-foreground" href="#product">Product</a>
            <a className="transition-colors hover:text-foreground" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link className="hidden px-2 text-muted-foreground transition-colors hover:text-foreground sm:inline" href={AUTH}>Sign in</Link>
            <Button size="sm" className="hidden md:inline-flex" asChild><Link href={AUTH}>Start free</Link></Button>
            <MobileMenu />
          </div>
        </nav>

        {/* HERO — asymmetric, left-weighted */}
        <header className="grid items-center gap-12 pb-20 pt-16 md:grid-cols-[1.05fr_1fr] md:pt-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Competitive intelligence, automated
            </div>
            <h1 className="font-display text-[46px] font-normal leading-[1.04] tracking-[-0.015em] sm:text-[60px]">
              Every competitor move — and the play to win.
            </h1>
            <p className="mt-6 max-w-[480px] text-[16px] leading-relaxed text-muted-foreground">
              Rivalscope watches competitor pricing, pages, reviews and hiring around the clock,
              then drafts the battle card your team uses to close.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" variant="cta" className="min-h-11 gap-2" asChild><Link href={AUTH}>Start free <ArrowRight size={16} /></Link></Button>
              <Button size="lg" variant="outline" className="min-h-11" asChild><a href="#product">See a sample battle card</a></Button>
            </div>
            <p className="mt-5 text-[13px] text-muted-foreground">No credit card · 2-minute setup · First report in minutes</p>
          </div>
          <IntelFeed />
        </header>

        {/* TRUST STRIP */}
        <section className="border-y border-border py-8">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Built for teams selling against fast-moving rivals
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-base font-medium text-muted-foreground/70">
            <span>Stripe</span><span>Linear</span><span>Notion</span><span>Figma</span><span>Vercel</span><span>Ramp</span>
          </div>
        </section>

        {/* HOW IT WORKS — features */}
        <section id="how-it-works" className="scroll-mt-20 grid gap-8 py-20 sm:grid-cols-3">
          <h2 className="sr-only">How it works</h2>
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="mb-4 grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-primary">
                <f.icon size={17} />
              </span>
              <h3 className="mb-2 text-[15px] font-semibold">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* PRODUCT — battle-card showcase */}
        <section id="product" className="scroll-mt-20 grid items-center gap-12 border-t border-border py-20 md:grid-cols-2">
          <div>
            <h2 className="mb-5 font-display text-[36px] font-normal leading-[1.08] tracking-[-0.01em]">
              From a dozen signals to one sales play.
            </h2>
            <p className="mb-7 max-w-[440px] text-[15px] leading-relaxed text-muted-foreground">
              Rivalscope compiles every change, complaint and signal into a structured battle card,
              so your reps walk in already knowing the win.
            </p>
            <div className="space-y-3.5">
              <CheckRow>Executive summary in one scan</CheckRow>
              <CheckRow>Their weak spots, pulled from real reviews</CheckRow>
              <CheckRow>Five ranked plays, copy-to-send</CheckRow>
            </div>
            <Link href={AUTH} className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-primary hover:underline">
              Generate your first battle card <ArrowRight size={15} />
            </Link>
          </div>
          <LandingBattleCard />
        </section>

        {/* PRICING — real, wired component (keeps its own heading) */}
        <section id="pricing" className="scroll-mt-20 border-t border-border py-20">
          <PricingBasic />
        </section>

        {/* CTA CLOSER */}
        <section className="border-t border-border py-24 text-center">
          <h2 className="mx-auto max-w-[620px] font-display text-[38px] font-normal leading-[1.06] tracking-[-0.01em]">
            Stop guessing what your competitors are doing.
          </h2>
          <p className="mx-auto mt-5 max-w-[460px] text-[16px] leading-relaxed text-muted-foreground">
            Add a competitor and get your first battle card in minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" variant="cta" className="gap-2" asChild><Link href={AUTH}>Start free <ArrowRight size={16} /></Link></Button>
            <Button size="lg" variant="outline" asChild><a href="mailto:support@rivalscope.dev">Book a demo</a></Button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 Rivalscope</span>
          <div className="flex items-center gap-6">
            <a className="transition-colors hover:text-foreground" href="/privacy">Privacy</a>
            <a className="transition-colors hover:text-foreground" href="/terms">Terms</a>
            <a className="transition-colors hover:text-foreground" href="mailto:support@rivalscope.dev">Support</a>
            <a className="transition-colors hover:text-foreground" href="https://github.com/IManss-ai/competitor-analyzer" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
