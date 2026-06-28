import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/reveal';
import { Button } from '@/components/ui/button';

// §4b CTA closer — serious final call. Plain foreground heading (no gradient text),
// one primary CTA + one ghost. No decorative background.

const AUTH = '/auth/login';

export function CtaCloser() {
  return (
    <section className="border-t border-border py-24 text-center">
      <Reveal>
        <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
          Stop guessing what your competitors are doing.
        </h2>
        <p className="mx-auto mt-5 max-w-[460px] text-[16px] leading-relaxed text-muted-foreground">
          Add a competitor and get your first battle card in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="cta" className="gap-2" asChild>
            <Link href={AUTH}>Start free <ArrowRight size={16} /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="mailto:support@rivalscope.dev">Book a demo</a>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
