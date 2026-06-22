'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Shield, ExternalLink, Plus } from 'lucide-react';
import BattleCard from '@/components/battle-card';
import { Competitor } from '@/lib/types';
import { competitorDomain } from '@/lib/utils';

interface BattlecardsClientProps {
  competitors: Competitor[];
  userId: string;
}

export default function BattlecardsClient({ competitors, userId }: BattlecardsClientProps) {
  if (competitors.length === 0) {
    return (
      <div className="rs-card p-10 flex flex-col items-center text-center">
        <div
          className="w-12 h-12 rounded flex items-center justify-center mb-4"
          style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
        >
          <Shield size={22} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          No competitors to analyze yet
        </h3>
        <p className="text-sm mb-5 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Add a competitor and run a scan — then generate an AI battle card that aggregates
          page changes, customer complaints, and strategic signals.
        </p>
        <Link
          href="/competitors"
          className="rs-btn-primary text-[13px] inline-flex items-center gap-2"
        >
          <Plus size={14} />
          Add competitors
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {competitors.map((comp, index) => {
        const hostname = competitorDomain(comp.url);

        return (
          <motion.div
            key={comp.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px 400px 0px" }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="group relative"
          >
            <div className="rs-card p-5 relative overflow-hidden flex flex-col justify-between h-full">
              {/* Top row */}
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded bg-[var(--fill-subtle)] border border-[var(--border-default)] flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-tight mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {comp.name || hostname}
                  </h3>
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono transition-colors truncate max-w-full hover:text-[var(--accent-primary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {comp.url}
                    <ExternalLink size={12} className="flex-shrink-0" />
                  </a>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                    Last 7 days
                  </div>
                  <div className="text-sm font-medium font-mono" style={{ color: 'var(--text-secondary)' }}>
                    Changes · complaints · signals
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <BattleCard
                    competitorId={comp.id}
                    competitorName={comp.name || hostname}
                    userId={userId}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
