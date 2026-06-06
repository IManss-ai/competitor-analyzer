"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, ArrowRight } from 'lucide-react';

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0.15 as number },
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
    badgeClass: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
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
    borderClass: "border border-cyan-500/20",
    accentClass: "text-cyan-400",
  },
];

function PricingBasic() {
  return (
    <div className="text-center">
      <motion.div {...reveal()}>
        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.0] mb-4 text-white">
          Simple pricing.<br />
          <span className="text-zinc-500">No surprises.</span>
        </h2>
        <p className="text-zinc-400 max-w-md mx-auto text-base leading-relaxed mb-14">
          Pick the plan that fits your business. Both include a 14-day free trial, no credit card required.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            {...reveal(i * 0.12)}
            className={`relative bg-[#0b0819]/50 border border-white/[0.06] backdrop-blur-md rounded-3xl p-8 text-left hover:border-white/[0.1] transition-all duration-300 shadow-xl`}
          >
            {/* Badge */}
            {tier.badge && (
              <span className={`absolute top-5 right-5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full ${tier.badgeClass}`}>
                {tier.badge}
              </span>
            )}

            {/* Header */}
            <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
            <p className="text-sm text-zinc-500 mb-6">{tier.target}</p>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-8">
              <span className={`text-5xl font-bold tracking-tight ${tier.accentClass}`}>{tier.price}</span>
              <span className="text-zinc-500 text-sm font-medium">/mo</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 size={16}  className={`flex-shrink-0 mt-0.5 ${tier.accentClass}`} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={tier.href}
              className="inline-flex items-center justify-between w-full gap-4 bg-white text-black font-semibold pl-5 pr-2 py-2.5 rounded-full cursor-pointer hover:scale-[1.01] hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all"
            >
              <span className="text-sm">{tier.cta}</span>
              <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center">
                <ArrowRight size={13}  />
              </span>
            </Link>

            {/* Trial note */}
            <p className="text-[11px] text-zinc-500 font-mono mt-4 text-center">
              14-day free trial, no credit card required
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export { PricingBasic };
