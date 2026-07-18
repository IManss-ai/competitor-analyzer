import { Check, TriangleAlert } from 'lucide-react';
import type { HeadToHead as HeadToHeadData, HeadToHeadPoint } from '@/lib/types';

interface HeadToHeadProps {
  data?: HeadToHeadData | null;
  competitorName: string;
}

function isEmpty(data?: HeadToHeadData | null): boolean {
  if (!data) return true;
  return (
    !data.verdict &&
    !data.you_win?.length &&
    !data.you_exposed?.length &&
    !data.plays?.length
  );
}

function PointRow({ point, tone }: { point: HeadToHeadPoint; tone: 'win' | 'exposed' }) {
  const accent = tone === 'win' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const Icon = tone === 'win' ? Check : TriangleAlert;
  return (
    <li className="flex gap-2">
      <Icon size={15} className={`mt-0.5 flex-none ${accent}`} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm leading-snug text-card-foreground">{point.point}</span>
          {point.confidence === 'inferred' && (
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs leading-none tracking-wide text-primary">
              inferred
            </span>
          )}
        </div>
        {point.basis && (
          <p className="text-sm leading-snug text-muted-foreground">{point.basis}</p>
        )}
      </div>
    </li>
  );
}

export default function HeadToHead({ data, competitorName }: HeadToHeadProps) {
  if (isEmpty(data)) return null;
  const hh = data as HeadToHeadData;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-(--shadow-card)">
      {/* Verdict */}
      <div className="relative border-b border-border px-6 py-6 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Head-to-head · You vs. {competitorName}
        </p>
        {hh.verdict && (
          <h2 className="font-display mt-2 text-3xl leading-[1.12] tracking-[-0.01em] text-foreground sm:text-3xl">
            {hh.verdict}
          </h2>
        )}
      </div>

      {/* Win / Exposed columns */}
      {(hh.you_win?.length || hh.you_exposed?.length) ? (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-card p-6 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Where you win</h3>
            {hh.you_win?.length ? (
              <ul className="space-y-3">
                {hh.you_win.map((p, i) => (
                  <PointRow key={i} point={p} tone="win" />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Enriching as we scan.</p>
            )}
          </div>
          <div className="bg-card p-6 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold text-rose-700 dark:text-rose-400">Where you&rsquo;re exposed</h3>
            {hh.you_exposed?.length ? (
              <ul className="space-y-3">
                {hh.you_exposed.map((p, i) => (
                  <PointRow key={i} point={p} tone="exposed" />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Enriching as we scan.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Plays */}
      {hh.plays?.length ? (
        <div className="border-t border-border bg-background/40 px-6 py-6 sm:px-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Plays to run</h3>
          <ol className="space-y-3">
            {hh.plays
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((play, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex-none font-mono text-sm font-semibold text-primary">
                    {play.rank}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-card-foreground">{play.title}</p>
                    {play.detail && (
                      <p className="text-sm leading-snug text-muted-foreground">{play.detail}</p>
                    )}
                  </div>
                </li>
              ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
