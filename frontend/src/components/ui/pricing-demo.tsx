"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight } from 'lucide-react';

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0 as number },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

interface PricingTier {
  name: string;
  badge?: string;
  badgeClass?: string;
  price: string;
  target: string;
  features: string[];
  cta: string;
  href: string;
  borderClass: string;
  accentClass: string;
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
    cta: "Start free trial",
    href: "/auth/login?plan=saas",
    borderClass: "border border-sky-500/20",
    accentClass: "text-sky-400",
  },
  {
    name: "Local Business",
    badge: "Local",
    badgeClass: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    price: "$19",
    target: "For salons, cafes, gyms, and local shops",
    features: [
      "Google Reviews monitoring",
      "Instagram & Facebook tracking",
      "Nearby competitor alerts",
      "Local Battle Card",
      "Weekly summary email",
    ],
    cta: "Start free trial",
    href: "/auth/login?plan=local",
    borderClass: "border border-sky-500/20",
    accentClass: "text-sky-400",
  },
];

function PricingBasic() {
  return (
    <div className="text-center">
      <motion.div {...reveal()}>
        <h2 className="text-[40px] lg:text-[54px] font-medium tracking-[-0.02em] leading-[1.1] mb-5 text-[var(--text-primary)]">
          Simple pricing.<br />
          <span className="text-[var(--text-muted)]">No surprises.</span>
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto text-base leading-relaxed mb-14">
          Pick the plan that fits your business. Both include a 2-day free trial, no credit card required.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            {...reveal(i * 0.12)}
            className={`relative bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md p-8 text-left hover:border-[var(--border-strong)] transition-colors duration-300`}
          >
            {/* Badge */}
            {tier.badge && (
              <span className={`absolute top-5 right-5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full ${tier.badgeClass}`}>
                {tier.badge}
              </span>
            )}

            {/* Header */}
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{tier.name}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">{tier.target}</p>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-8">
              <span className={`text-5xl font-bold tracking-tight ${tier.accentClass}`}>{tier.price}</span>
              <span className="text-[var(--text-muted)] text-sm font-medium">/mo</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 size={16}  className={`flex-shrink-0 mt-0.5 ${tier.accentClass}`} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={tier.href}
              className="inline-flex items-center justify-between w-full gap-4 bg-[var(--accent-cta)] text-[var(--accent-text)] font-semibold pl-5 pr-2 py-2.5 rounded-full cursor-pointer hover:bg-[var(--accent-cta-hover)] transition-colors"
            >
              <span className="text-sm">{tier.cta}</span>
              <span className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center">
                <ArrowRight size={13}  />
              </span>
            </Link>

            {/* Trial note */}
            <p className="text-[11px] text-[var(--text-muted)] font-mono mt-4 text-center">
              2-day free trial, no credit card required
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export { PricingBasic };
