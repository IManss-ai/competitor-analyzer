'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, RefreshCw, ArrowLeft, Sparkles } from 'lucide-react';
import Topbar from '@/components/topbar';
import { isAbortError } from '@/lib/fetch-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PlanItem {
  id: string;
  rank: number;
  title: string;
  body: string | null;
  category: string | null;
  status: string;
}

interface WarRoom {
  id: string;
  name: string;
  user_product: string | null;
  competitor: { id: string; name: string; url: string };
  plan: {
    id: string;
    executive_read: string | null;
    ai_generated: boolean;
    generated_at: string | null;
    trigger_summary: string | null;
    items: PlanItem[];
  };
  geo: {
    engine: string;
    user_share: number;
    competitor_share: number;
    source: string;
    checked_at: string | null;
  };
  events: { detected_at: string | null; change_type: string | null; brief_text: string | null }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  pricing: 'PRICING',
  feature: 'FEATURE',
  content: 'CONTENT',
  reputation: 'REPUTATION',
  geo: 'AI SEARCH',
};

export default function WarRoomClient({ campaignId, userId }: { campaignId: string; userId: string }) {
  const [room, setRoom] = useState<WarRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const headers = { Authorization: `Bearer ${userId}`, 'Content-Type': 'application/json' };

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}`, { headers, signal });
      if (res.ok) setRoom(await res.json());
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [campaignId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const setStatus = async (itemId: string, status: string) => {
    if (!room) return;
    // optimistic update
    setRoom({
      ...room,
      plan: {
        ...room.plan,
        items: room.plan.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
      },
    });
    await fetch(`${API_BASE}/api/v1/plan-items/${itemId}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status }),
    });
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await fetch(`${API_BASE}/api/v1/campaigns/${campaignId}/regenerate`, { method: 'POST', headers });
      await load();
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="rs-card p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Opening war room…</div>;
  }
  if (!room) {
    return (
      <div className="rs-card p-10 text-center space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Campaign not found.</p>
        <Link href="/campaigns" className="rs-btn-ghost text-[13px]">← Back to campaigns</Link>
      </div>
    );
  }

  const doneCount = room.plan.items.filter((i) => i.status === 'done').length;

  return (
    <div>
      <Topbar title={room.name} subtitle={`War room vs ${room.competitor.url}`} />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/campaigns" className="text-xs font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={12} /> all campaigns
          </Link>
          <button className="rs-btn-ghost text-[12px]" onClick={regenerate} disabled={regenerating}>
            <RefreshCw size={12} className={`inline mr-1 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating…' : 'Regenerate plan'}
          </button>
        </div>

        {/* Executive read */}
        <section className="rs-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="rs-label">Competitive read</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 badge">
              {room.plan.ai_generated ? 'AI ANALYSIS' : 'SIGNAL-BASED'}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {room.plan.executive_read}
          </p>
          <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Trigger: {room.plan.trigger_summary} · {room.plan.generated_at ? new Date(room.plan.generated_at).toLocaleString() : ''}
          </p>
        </section>

        {/* GEO duel */}
        <section className="rs-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="rs-label flex items-center gap-1"><Sparkles size={12} /> Who does the AI recommend?</h2>
            <span className="text-[10px] font-mono badge">
              {room.geo.source === 'live' ? `LIVE · ${room.geo.engine.toUpperCase()}` : 'ESTIMATED — goes live with AI credits'}
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: room.user_product || 'You', share: room.geo.user_share, accent: true },
              { label: room.competitor.name, share: room.geo.competitor_share, accent: false },
            ].map(({ label, share, accent }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs w-32 truncate font-mono" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <div className="flex-1 h-3" style={{ background: 'var(--fill-subtle)' }}>
                  <div
                    className="h-3"
                    style={{
                      width: `${share * 10}%`,
                      background: accent ? 'var(--accent-primary)' : 'var(--text-muted)',
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--text-primary)' }}>{share}/10</span>
              </div>
            ))}
          </div>
        </section>

        {/* The plan */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="rs-label">The plan — {doneCount}/{room.plan.items.length} executed</h2>
          </div>
          {room.plan.items.map((item) => (
            <div
              key={item.id}
              className="rs-card p-4 flex gap-4"
              style={{ opacity: item.status === 'dismissed' ? 0.45 : 1 }}
            >
              <span
                className="font-mono text-sm font-bold shrink-0 w-7 h-7 flex items-center justify-center"
                style={{
                  color: item.status === 'done' ? 'var(--surface-base)' : 'var(--accent-primary)',
                  background: item.status === 'done' ? 'var(--accent-primary)' : 'transparent',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {item.status === 'done' ? <Check size={14} /> : item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: 'var(--text-primary)',
                      textDecoration: item.status === 'done' ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </p>
                  {item.category && (
                    <span className="text-[10px] font-mono badge">{CATEGORY_LABELS[item.category] || item.category.toUpperCase()}</span>
                  )}
                </div>
                {item.body && (
                  <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {item.status !== 'done' && (
                  <button title="Mark done" className="rs-btn-ghost text-[11px] px-2 py-1" onClick={() => setStatus(item.id, 'done')}>
                    <Check size={12} />
                  </button>
                )}
                {item.status === 'pending' && (
                  <button title="Dismiss" className="rs-btn-ghost text-[11px] px-2 py-1" onClick={() => setStatus(item.id, 'dismissed')}>
                    <X size={12} />
                  </button>
                )}
                {item.status !== 'pending' && (
                  <button title="Reset" className="rs-btn-ghost text-[11px] px-2 py-1" onClick={() => setStatus(item.id, 'pending')}>
                    ↺
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Their moves */}
        <section className="rs-card p-5 space-y-3">
          <h2 className="rs-label">Their moves (90 days)</h2>
          {room.events.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No detected changes yet — first scan establishes the baseline; every change after that lands here and refreshes the plan.
            </p>
          ) : (
            <div className="space-y-2">
              {room.events.map((e, idx) => (
                <div key={idx} className="flex gap-3 items-baseline">
                  <span className="text-[10px] font-mono shrink-0 w-20" style={{ color: 'var(--text-muted)' }}>
                    {e.detected_at ? new Date(e.detected_at).toLocaleDateString() : ''}
                  </span>
                  {e.change_type && <span className={`text-[10px] font-mono badge badge-${e.change_type}`}>{e.change_type}</span>}
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.brief_text || 'Change detected'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
