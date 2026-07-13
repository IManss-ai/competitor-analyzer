'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { fadeUpVariants, staggerContainerVariants } from '@/lib/animations';

// Interactive battle-card showcase for the landing #product section.
// Restyled to the live shadcn neutral-modern landing aesthetic:
// rounded-xl card, hairline borders, bg-background/40 inner panels,
// sentence-case headers, mono reserved for numerals/timestamps/badges.
// Restrained 3-tone badge palette (amber / primary / emerald) — no raw hex,
// semantic tokens only, theme-aware.

type Tone = 'pricing' | 'feature' | 'messaging';

const TONE: Record<Tone, string> = {
  pricing: 'text-amber-500 border-amber-500/30 bg-amber-500/10',
  feature: 'text-primary border-primary/30 bg-primary/10',
  messaging: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
};

type Comp = 'stripe' | 'paypal' | 'square';

type Card = {
  company: string;
  mark: string;
  date: string;
  changes: { tone: Tone; label: string; text: string }[];
  complaints: { text: string; source: string }[];
  signals: { bold: string; rest: string }[];
  moves: string[];
};

const BATTLE_CARDS_DATA: Record<Comp, Card> = {
  stripe: {
    company: 'Stripe',
    mark: 'S',
    date: 'Updated today',
    changes: [
      { tone: 'pricing', label: 'Pricing', text: 'Removed enterprise flat-rates. Custom contract quote now required.' },
      { tone: 'feature', label: 'Feature', text: 'Released Checkout v4.1 with optimized redirect latency.' },
      { tone: 'messaging', label: 'Messaging', text: 'Hero shifted from “Payments infrastructure” to “Financial operations for global companies”.' },
    ],
    complaints: [
      { text: '“Support responses took 4 days. Blocked our payment gateway migration.”', source: 'Trustpilot · 1 star · 2 days ago' },
      { text: '“Completely opaque enterprise pricing after their recent site update.”', source: 'Trustpilot · 2 stars · 5 days ago' },
    ],
    signals: [
      { bold: '4 enterprise sales roles', rest: ' posted in UK & EMEA, major market expansion incoming.' },
      { bold: 'VP of payments partnerships', rest: ' hired, preparing a channel partner program.' },
    ],
    moves: [
      'Lead EMEA conversations with your flat-rate pricing advantage.',
      'Add “24h instant Slack/phone support” to your landing hero.',
      'Ship a “Stripe comparison & migration guide” to capture enterprise churn.',
    ],
  },
  paypal: {
    company: 'PayPal',
    mark: 'P',
    date: 'Updated yesterday',
    changes: [
      { tone: 'pricing', label: 'Pricing', text: 'Raised merchant card processing fee from 2.9% to 3.49%.' },
      { tone: 'feature', label: 'Feature', text: 'Integrated bio-auth verification inside the checkout iframe.' },
      { tone: 'messaging', label: 'Messaging', text: 'Hero refocused on “Instant conversion optimization” over “Send money”.' },
    ],
    complaints: [
      { text: '“Sandbox API endpoints time out continuously during test runs.”', source: 'Developer Forum · 3 days ago' },
      { text: '“Merchant fees rose unexpectedly with no clear email warning.”', source: 'Reddit · 1 day ago' },
    ],
    signals: [
      { bold: 'Patent filed', rest: ' for a mobile biometric tokenization system, signaling a mobile SDK focus.' },
      { bold: 'Developer advocate', rest: ' hired in APAC, recruiting developer-portal testers.' },
    ],
    moves: [
      'Target their developers with a 99.9% sandbox uptime guarantee.',
      'Highlight “No hidden percentage increases, just simple flat rates” in checkout.',
      'Publish “Why sandbox speed is critical for product launch”.',
    ],
  },
  square: {
    company: 'Square',
    mark: 'Q',
    date: 'Updated 2 days ago',
    changes: [
      { tone: 'pricing', label: 'Pricing', text: 'Moved flat-rate POS subscription to dynamic pricing.' },
      { tone: 'feature', label: 'Feature', text: 'Launched POS v3 firmware with offline sync for retail terminals.' },
      { tone: 'messaging', label: 'Messaging', text: 'Hero changed from “Simple local commerce” to “The complete software & hardware platform”.' },
    ],
    complaints: [
      { text: '“Terminals disconnect from local Wi-Fi during peak sales hours.”', source: 'App Store · 2 stars · 6 hours ago' },
      { text: '“Contract lock-ins make it impossible to upgrade outdated hardware.”', source: 'Capterra · 3 stars · 4 days ago' },
    ],
    signals: [
      { bold: 'UK retail director', rest: ' hired to launch hardware distribution partnerships.' },
      { bold: 'New POS firmware', rest: ' registered in the FCC database with 5G fallback.' },
    ],
    moves: [
      'Offer UK shops zero-contract terminal rentals to win locked-in users.',
      'Advertise dual-band Wi-Fi backup to counter connection drops.',
      'Pitch a contract-free hardware replacement program.',
    ],
  },
};

const COMPS: Comp[] = ['stripe', 'paypal', 'square'];

function TagBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide ${TONE[tone]}`}>
      {children}
    </span>
  );
}

function Quadrant({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="mb-2.5 text-xs font-medium text-card-foreground">{title}</div>
      {children}
    </div>
  );
}

export default function LandingBattleCard() {
  const [active, setActive] = useState<Comp>('stripe');
  const card = BATTLE_CARDS_DATA[active];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header: competitor identity + tab switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-md border border-border bg-secondary text-xs font-semibold text-secondary-foreground">
            {card.mark}
          </span>
          <span className="text-sm font-medium text-card-foreground">Battle card · {card.company}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/40 p-0.5">
          {COMPS.map((comp) => {
            const isActive = comp === active;
            return (
              <button
                key={comp}
                type="button"
                onClick={() => setActive(comp)}
                aria-pressed={isActive}
                className={`inline-flex min-h-11 items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors md:min-h-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {comp}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quadrants stagger-assemble once on first view (container not keyed, so tab
          switches don't replay it). Tab change = fast 160ms CSS fade on the inner
          keyed wrappers. MotionConfig snaps the assemble to final for reduced-motion. */}
      <motion.div
        className="space-y-3 p-4"
        variants={staggerContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      >
        {/* Detected changes */}
        <motion.div variants={fadeUpVariants}>
        <div key={active} className="[animation:fadeIn_var(--duration-base,160ms)_var(--ease-out,ease-out)]">
        <Quadrant title="Detected changes">
          <ul className="space-y-2.5">
            {card.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <TagBadge tone={c.tone}>{c.label}</TagBadge>
                <span className="text-[13px] leading-snug text-muted-foreground">{c.text}</span>
              </li>
            ))}
          </ul>
        </Quadrant>
        </div>
        </motion.div>

        {/* User complaints + Strategic signals */}
        <motion.div variants={fadeUpVariants}>
        <div key={active} className="grid gap-3 sm:grid-cols-2 [animation:fadeIn_var(--duration-base,160ms)_var(--ease-out,ease-out)]">
          <Quadrant title="User complaints">
            <ul className="space-y-2.5">
              {card.complaints.map((c, i) => (
                <li key={i}>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{c.text}</p>
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">{c.source}</span>
                </li>
              ))}
            </ul>
          </Quadrant>

          <Quadrant title="Strategic signals">
            <ul className="space-y-2.5 text-[13px] text-muted-foreground">
              {card.signals.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">›</span>
                  <span className="leading-snug">
                    <span className="font-medium text-card-foreground">{s.bold}</span>
                    {s.rest}
                  </span>
                </li>
              ))}
            </ul>
          </Quadrant>
        </div>
        </motion.div>

        {/* Top plays / Playbook */}
        <motion.div variants={fadeUpVariants}>
        <div key={active} className="[animation:fadeIn_var(--duration-base,160ms)_var(--ease-out,ease-out)]">
        <Quadrant title="Top plays">
          <ol className="space-y-2">
            {card.moves.map((move, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug text-card-foreground">
                <span className="mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-md border border-primary/30 bg-primary/10">
                  <Check size={11} strokeWidth={3} className="text-primary" />
                </span>
                <span>{move}</span>
              </li>
            ))}
          </ol>
        </Quadrant>
        </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
