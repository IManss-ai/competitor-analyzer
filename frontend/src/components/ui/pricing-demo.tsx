"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0 as number },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

interface PricingTier {
  name: string;
  tag?: string;
  highlighted?: boolean;
  price: string;
  target: string;
  features: string[];
  cta: string;
  href: string;
}

const tiers: PricingTier[] = [
  {
    name: "SaaS Starter",
    tag: "Most teams",
    highlighted: true,
    price: "$49",
    target: "For SaaS founders and startups",
    features: [
      "Website monitoring",
      "Pricing page tracking",
      "Battle Card with AI action plans",
      "Review intelligence (G2, Trustpilot)",
      "Weekly email report",
    ],
    cta: "Start free",
    href: "/auth/login?plan=saas",
  },
  {
    name: "Local Business",
    tag: "Local",
    price: "$19",
    target: "For salons, cafes, gyms, and local shops",
    features: [
      "Google Reviews monitoring",
      "Instagram & Facebook tracking",
      "Nearby competitor alerts",
      "Local Battle Card",
      "Weekly summary email",
    ],
    cta: "Start free",
    href: "/auth/login?plan=local",
  },
];

function PricingBasic() {
  return (
    <div>
      <motion.div {...reveal()}>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Pricing</p>
        <h2 className="mt-3 text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
          Simple pricing. <span className="text-muted-foreground">No surprises.</span>
        </h2>
        <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">
          Run your first battle card free, no credit card. Upgrade anytime, billed instantly.
        </p>
      </motion.div>

      <div className="mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
        {tiers.map((tier, i) => (
          <motion.div key={tier.name} {...reveal(i * 0.12)}>
            <Card
              className={`relative h-full rounded-xl text-left shadow-none ${
                tier.highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
              }`}
            >
              <CardContent className="flex h-full flex-col p-8">
                {/* Header */}
                <div className="mb-1 flex items-center gap-2.5">
                  <h3 className="text-[17px] font-semibold text-foreground">{tier.name}</h3>
                  {tier.tag && (
                    <span
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                        tier.highlighted
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {tier.tag}
                    </span>
                  )}
                </div>
                <p className="mb-7 text-sm text-muted-foreground">{tier.target}</p>

                {/* Price — mono numerals */}
                <div className="mb-8 flex items-baseline gap-1.5">
                  <span className="font-mono text-5xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{tier.price}</span>
                  <span className="font-mono text-sm text-muted-foreground">/mo</span>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check size={15} strokeWidth={2.5} className="mt-0.5 flex-shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA — rectangular (de-pilled) */}
                <Link
                  href={tier.href}
                  className={`group/cta mt-auto inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-foreground text-background hover:opacity-90"
                      : "border border-border text-foreground hover:bg-muted/40"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight size={15} className="transition-transform group-hover/cta:translate-x-0.5" />
                </Link>

                <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
                  First battle card free · no credit card required
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export { PricingBasic };
