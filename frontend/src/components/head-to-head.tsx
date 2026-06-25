import { Check } from 'lucide-react';
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
  const accent = tone === 'win' ? 'text-emerald-500' : 'text-amber-500';
  return (
    <li className="flex gap-2.5">
      <Check size={15} className={`mt-0.5 flex-none ${accent}`} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm leading-snug text-card-foreground">{point.point}</span>
          {point.confidence === 'inferred' && (
            <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wide text-muted-foreground">
              inferred
            </span>
          )}
        </div>
        {point.basis && (
          <p className="text-[13px] leading-snug text-muted-foreground">{point.basis}</p>
        )}
      </div>
    </li>
  );
}

export default function HeadToHead({ data, competitorName }: HeadToHeadProps) {
  if (isEmpty(data)) return null;
  const hh = data as HeadToHeadData;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Verdict */}
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          You vs. {competitorName}
        </p>
        {hh.verdict && (
          <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl">
            {hh.verdict}
          </h2>
        )}
      </div>

      {/* Win / Exposed columns */}
      {(hh.you_win?.length || hh.you_exposed?.length) ? (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <div className="bg-card p-5 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold text-emerald-500">Where you win</h3>
            {hh.you_win?.length ? (
              <ul className="space-y-3">
                {hh.you_win.map((p, i) => (
                  <PointRow key={i} point={p} tone="win" />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Enriching as we scan.</p>
            )}
          </div>
          <div className="bg-card p-5 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold text-amber-500">Where you&rsquo;re exposed</h3>
            {hh.you_exposed?.length ? (
              <ul className="space-y-3">
                {hh.you_exposed.map((p, i) => (
                  <PointRow key={i} point={p} tone="exposed" />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Enriching as we scan.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Plays */}
      {hh.plays?.length ? (
        <div className="border-t border-border bg-background/40 px-5 py-5 sm:px-6">
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
                      <p className="text-[13px] leading-snug text-muted-foreground">{play.detail}</p>
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
