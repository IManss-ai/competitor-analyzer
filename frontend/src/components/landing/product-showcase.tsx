import { Reveal } from '@/components/reveal';
import LandingBattleCard from '@/components/landing-battlecard';

// §2 Product showcase — Linear principle: real product UI in framed panels, no
// decorative glow. The interactive battle card is the hero artifact; below it,
// two alternating feature rows (Stripe pattern) pair copy with a real UI fragment.

function IntelFeedMini() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-[12.5px] font-semibold text-foreground">Intel feed</span>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Live
        </span>
      </div>
      {[
        ['Stripe', 'Pricing', 'Raised Starter to $29/mo', '3h'],
        ['Linear', 'Feature', 'Shipped AI assistant on pricing', '5h'],
        ['Notion', 'Hiring', 'Opened 4 enterprise AE roles', '1d'],
      ].map(([name, kind, desc, t]) => (
        <div key={name} className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{kind}</span>
          <div className="min-w-0 flex-1">
            <span className="text-[12.5px] font-medium text-foreground">{name}</span>
            <span className="ml-2 text-[11.5px] text-muted-foreground">{desc}</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{t}</span>
        </div>
      ))}
    </div>
  );
}

function PlaysMini() {
  const plays = [
    'Lead with our flat-rate pricing vs their new custom quote',
    'Send the migration guide referencing their checkout latency',
    'Counter their AE hiring push with same-week onboarding',
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Ranked plays</p>
      <ol className="space-y-2">
        {plays.map((p, i) => (
          <li key={p} className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2">
            <span className="grid h-5 w-5 flex-none place-items-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[10px] font-semibold text-primary">{i + 1}</span>
            <span className="text-[12.5px] leading-snug text-foreground/85">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ROWS = [
  {
    title: 'A live intel feed',
    desc: 'Every change, categorized and timestamped.',
    ui: <IntelFeedMini />,
  },
  {
    title: 'Five ranked plays per card',
    desc: 'Pulled from real complaints, ordered by what closes.',
    ui: <PlaysMini />,
  },
];

export function ProductShowcase() {
  return (
    <section id="product" className="scroll-mt-20 border-t border-border py-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">The product</p>
        <h2 className="mt-3 max-w-[16ch] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
          Every rival, on one battle card.
        </h2>
        <p className="mt-6 max-w-[460px] text-sm leading-relaxed text-muted-foreground">
          Every change, complaint and signal, compiled into one card your reps can act on.
        </p>
      </Reveal>

      <Reveal delay={1} className="mt-12">
        <div className="relative mx-auto max-w-[860px]">
          {/* soft atmospheric backdrop so the card reads as a premium product shot */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-8 z-0"
            style={{ background: 'radial-gradient(55% 50% at 50% 42%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 72%)' }}
          />
          <div className="relative z-10 rounded-xl shadow-[0_50px_140px_-55px_rgba(8,9,10,0.95)]">
            <LandingBattleCard />
          </div>
        </div>
      </Reveal>

      <div className="mt-20 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
        {ROWS.map((row, i) => (
          <Reveal key={row.title}>
            <div className="grid items-center gap-8 bg-background p-8 md:grid-cols-2 md:gap-12 md:p-12">
              <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                <h3 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{row.title}</h3>
                <p className="mt-3 max-w-[420px] text-sm leading-relaxed text-muted-foreground">{row.desc}</p>
              </div>
              <div className={i % 2 === 1 ? 'md:order-1' : ''}>{row.ui}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
