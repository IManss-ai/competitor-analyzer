import { Reveal } from '@/components/reveal';

// §4a Trust strip — restrained monochrome logo cloud (static, not a marquee — a
// marquee reads as gimmicky for a serious tool). Muted brand wordmarks, mono eyebrow.

const BRANDS = ['Stripe', 'Linear', 'Notion', 'Figma', 'Vercel', 'Ramp'];

export function LogoCloud() {
  return (
    <section className="border-t border-border py-12">
      <Reveal>
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Built for teams selling against fast-moving rivals
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-[15px] font-medium text-muted-foreground/55">
          {BRANDS.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
