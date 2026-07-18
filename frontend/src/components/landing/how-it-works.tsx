import { Reveal, RevealGroup, RevealItem } from '@/components/reveal';
import { PipelineLine } from '@/components/landing/pipeline-line';

// §1 How it works — a 3-step pipeline (Connect / Detect / Win), each step showing a
// real product fragment instead of a generic icon. Linear register: monochrome,
// hairline-divided, single --primary accent on the step label + live dot only.
// No numbered 01/02/03 markers (flagged as an AI scaffold tell).

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground/80">
      {children}
    </span>
  );
}

const STEPS = [
  {
    label: 'Connect',
    title: 'Add your rivals',
    desc: 'Paste URLs. We map the rest.',
    fragment: (
      <div className="flex flex-wrap gap-2">
        <Chip>stripe.com</Chip>
        <Chip>linear.app</Chip>
        <Chip>notion.so</Chip>
      </div>
    ),
  },
  {
    label: 'Detect',
    title: 'We watch, around the clock',
    desc: 'Every change, the moment it lands.',
    fragment: (
      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Intel feed</span>
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Live
          </span>
        </div>
        {[
          ['Stripe', 'Pricing', '3h'],
          ['Linear', 'Feature', '5h'],
        ].map(([name, kind, t]) => (
          <div key={name} className="flex items-center gap-2 border-b border-border px-3 py-2 text-[12px] last:border-0">
            <span className="font-medium text-foreground">{name}</span>
            <span className="rounded border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{kind}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Win',
    title: 'Get the play',
    desc: 'One card. Five ranked plays.',
    fragment: (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[11px] font-semibold text-primary">5</span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">Battle card ready</p>
          <p className="font-mono text-[10px] text-muted-foreground">5 ranked plays · copy to send</p>
        </div>
        <span className="ml-auto h-1.5 w-1.5 flex-none rounded-full bg-primary" />
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border py-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
        <h2 className="mt-3 max-w-[20ch] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
          From a dozen signals to one sales play.
        </h2>
      </Reveal>

      <div className="mt-12 px-1"><PipelineLine /></div>
      <RevealGroup className="mt-6 grid overflow-hidden rounded-xl border border-border sm:grid-cols-3">
        {STEPS.map((step) => (
          <RevealItem
            key={step.label}
            className="border-b border-border p-8 transition-colors duration-(--duration-base) ease-(--ease-out) last:border-b-0 hover:bg-muted/20 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <p className="font-mono text-[12px] font-medium text-primary">{step.label}</p>
            <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            <div className="mt-6">{step.fragment}</div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
