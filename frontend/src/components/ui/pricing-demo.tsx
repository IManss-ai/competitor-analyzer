"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0 as number },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

interface PricingTier {
  name: string;
  badge?: string;
  price: string;
  target: string;
  features: string[];
  cta: string;
  href: string;
}

const tiers: PricingTier[] = [
  {
    name: "SaaS Starter",
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
    badge: "Local",
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
    <div className="text-center">
      <motion.div {...reveal()}>
        <h2 className="text-[34px] font-semibold tracking-[-0.01em] leading-[1.1] mb-5 text-foreground">
          Simple pricing.<br />
          <span className="text-muted-foreground">No surprises.</span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed mb-14">
          Pick the plan that fits your business. Start with your first battle card free — no credit card required.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            {...reveal(i * 0.12)}
          >
            <Card className="relative text-left rounded-lg shadow-sm">
              <CardContent className="p-8 flex flex-col h-full">
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute top-5 right-5">
                    <Badge variant="outline">{tier.badge}</Badge>
                  </div>
                )}

                {/* Header */}
                <h3 className="text-lg font-semibold text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{tier.target}</p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-bold tracking-tight text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm font-medium">/mo</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-muted-foreground" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className="inline-flex items-center justify-between w-full min-h-11 gap-4 bg-primary text-primary-foreground font-semibold pl-5 pr-2 py-3 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <span className="text-sm">{tier.cta}</span>
                  <span className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center">
                    <ArrowRight size={13} />
                  </span>
                </Link>

                {/* Trial note */}
                <p className="text-[11px] text-muted-foreground font-mono mt-4 text-center">
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
