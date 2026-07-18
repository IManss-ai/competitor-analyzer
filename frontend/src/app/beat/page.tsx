import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Beat your competitor: a concrete action plan in 24h | Rivalscope',
  description:
    'Give us your site and your top competitor. Get a concrete, ranked plan to win: pricing moves, feature counters, and copy you can ship this week. $29, delivered in 24 hours.',
  openGraph: {
    title: 'Beat your competitor: a concrete action plan in 24h',
    description:
      'A concrete, ranked plan to beat your top competitor, researched, written, and delivered in 24 hours. $29.',
    siteName: 'Rivalscope',
    images: ['/og-image.png'],
  },
};

// Set NEXT_PUBLIC_BEAT_CHECKOUT_URL in Vercel to the live Polar/Stripe checkout
// link. Until it's set, the CTA falls back to a mailto so the page is never a
// dead end.
const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_BEAT_CHECKOUT_URL ||
  'mailto:support@rivalscope.dev?subject=Beat%20my%20competitor%20(%2429%20plan)&body=My%20site%3A%0AMy%20top%20competitor%3A';

const SAMPLE_PLAYS = [
  {
    rank: 1,
    title: 'Counter their price raise within the week',
    body:
      'They moved Pro from $29 to $39 on May 28 and buried annual pricing. Add a "locked-in pricing" banner to your pricing page this week. Drafted line: "Our price is our price. No surprise raises, ever." Target their reviewers who mention cost.',
  },
  {
    rank: 2,
    title: 'Attack the complaint cluster: onboarding',
    body:
      '11 of their last 30 Trustpilot reviews mention setup taking days. Record a 90-second "live in 5 minutes" onboarding video, pin it on your homepage, and reply (politely) under comparison threads.',
  },
  {
    rank: 3,
    title: 'Ship the integration their users beg for',
    body:
      'Their public roadmap has had "Slack integration" in development for 7 months; 9 review mentions. If yours ships in 2 weeks, you own the comparison page for it. Draft announcement copy included.',
  },
  {
    rank: 4,
    title: 'Own the AI answer for your category',
    body:
      'Asked "best tool for [category]", Perplexity recommends them 7/10 times and you 0/10. Their docs and comparison pages are the sources cited. Publish the two comparison pages outlined in this plan to enter those citations.',
  },
  {
    rank: 5,
    title: 'Convert their churners at the exit door',
    body:
      'Their cancellation flow has no save offer (we tested it). Run a narrow search ad on "[competitor] cancel / export data" keywords. Drafted ad copy included. Cheap clicks, highest-intent traffic that exists.',
  },
];

export default function BeatPage() {
  return (
    <div className="min-h-screen px-4 py-12" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Hero */}
        <header className="space-y-4 text-center">
          <p className="rs-label">Rivalscope · Action Plan</p>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            Beat your top competitor.
            <br />
            Concrete plan, 24 hours, $29.
          </h1>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Give us your site and your biggest competitor. We scan their pages, reviews, hiring, and what AI engines
            say about you both, then a real strategist turns it into 5 ranked moves you can execute this week.
            You get a plan you can run, not another dashboard to check.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a href={CHECKOUT_URL} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90">
              Get my plan · $29
            </a>
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
            Delivered within 24h · Money-back if you call it generic
          </p>
        </header>

        {/* How it works */}
        <section className="grid sm:grid-cols-3 gap-3">
          {[
            ['1. Tell us who', 'Your URL + your competitor’s URL at checkout. That’s all we need.'],
            ['2. We dig', 'Page changes, pricing history, review complaints, hiring signals, AI-engine recommendations.'],
            ['3. You get the plan', '5 ranked plays with first steps and drafted copy, reviewed by a human before it ships.'],
          ].map(([title, body]) => (
            <div key={title} className="rs-card p-4 space-y-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{body}</p>
            </div>
          ))}
        </section>

        {/* Sample plan */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="rs-label">What you actually get: sample plan</h2>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Anonymized from a real analysis. Yours is researched fresh for your matchup.
            </p>
          </div>
          <div className="rs-card p-6 space-y-6">
            <div className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-mono mb-1" style={{ color: 'var(--muted-foreground)' }}>COMPETITIVE READ</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                Your competitor is moving upmarket: price raise, enterprise language, slower shipping. That opens a
                60-day window to own the self-serve segment they&apos;re abandoning.
              </p>
            </div>
            {SAMPLE_PLAYS.map((play) => (
              <div key={play.rank} className="flex gap-4">
                <span
                  className="font-mono text-sm font-bold shrink-0 w-6 h-6 flex items-center justify-center"
                  style={{ color: 'var(--primary)', border: '1px solid var(--border)' }}
                >
                  {play.rank}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{play.title}</p>
                  <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--muted-foreground)' }}>{play.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA repeat */}
        <section className="text-center space-y-3">
          <a href={CHECKOUT_URL} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90">
            Get my plan · $29
          </a>
          <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Want this on autopilot? The full Rivalscope platform watches your competitors 24/7 and fires a plan
            whenever they make a move. <Link href="/" className="underline">See the platform</Link> or{' '}
            <Link href="/apps" className="underline">browse the app database</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
