'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, RefreshCw, ArrowLeft, Sparkles } from 'lucide-react';
import Topbar from '@/components/topbar';
import { isAbortError } from '@/lib/fetch-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Opening war room…
        </CardContent>
      </Card>
    );
  }
  if (!room) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-foreground">Campaign not found.</p>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/campaigns">← Back to campaigns</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const doneCount = room.plan.items.filter((i) => i.status === 'done').length;

  return (
    <div>
      <Topbar title={room.name} subtitle={`War room vs ${room.competitor.url}`} />

      <div className="space-y-6">
        {/* Nav + regen bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/campaigns"
            className="text-xs font-mono flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={12} /> all campaigns
          </Link>
          <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating…' : 'Regenerate plan'}
          </Button>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="plan">
          <TabsList>
            <TabsTrigger value="plan">The Plan</TabsTrigger>
            <TabsTrigger value="read">Competitive Read</TabsTrigger>
            <TabsTrigger value="geo">AI Duel</TabsTrigger>
            <TabsTrigger value="moves">Their Moves</TabsTrigger>
          </TabsList>

          {/* The plan tab */}
          <TabsContent value="plan" className="space-y-3 mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                The plan — {doneCount}/{room.plan.items.length} executed
              </p>
            </div>
            {room.plan.items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 flex gap-4"
                style={{ opacity: item.status === 'dismissed' ? 0.45 : 1 }}
              >
                <span
                  className="font-mono text-sm font-bold shrink-0 w-7 h-7 flex items-center justify-center rounded border border-border"
                  style={{
                    color: item.status === 'done' ? 'var(--primary-foreground)' : undefined,
                    background: item.status === 'done' ? 'var(--primary)' : undefined,
                  }}
                >
                  {item.status === 'done' ? <Check size={14} /> : item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold text-foreground"
                      style={{
                        textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </p>
                    {item.category && (
                      <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                        {CATEGORY_LABELS[item.category] || item.category.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {item.body && (
                    <p className="text-xs leading-relaxed mt-1 text-muted-foreground">{item.body}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {item.status !== 'done' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Mark done"
                      onClick={() => setStatus(item.id, 'done')}
                    >
                      <Check size={12} />
                    </Button>
                  )}
                  {item.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Dismiss"
                      onClick={() => setStatus(item.id, 'dismissed')}
                    >
                      <X size={12} />
                    </Button>
                  )}
                  {item.status !== 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Reset"
                      onClick={() => setStatus(item.id, 'pending')}
                    >
                      ↺
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Competitive read tab */}
          <TabsContent value="read" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Competitive read</CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
                    {room.plan.ai_generated ? 'AI ANALYSIS' : 'SIGNAL-BASED'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {room.plan.executive_read}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Trigger: {room.plan.trigger_summary} · {room.plan.generated_at ? new Date(room.plan.generated_at).toLocaleString() : ''}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GEO duel tab */}
          <TabsContent value="geo" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-1.5">
                    <Sparkles size={14} /> Who does the AI recommend?
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
                    {room.geo.source === 'live' ? `LIVE · ${room.geo.engine.toUpperCase()}` : 'ESTIMATED — goes live with AI credits'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: room.user_product || 'You', share: room.geo.user_share, accent: true },
                  { label: room.competitor.name, share: room.geo.competitor_share, accent: false },
                ].map(({ label, share, accent }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs w-32 truncate font-mono text-muted-foreground">{label}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all ${accent ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                        style={{ width: `${share * 10}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right text-foreground">{share}/10</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Their moves tab */}
          <TabsContent value="moves" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Their moves (90 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {room.events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No detected changes yet — first scan establishes the baseline; every change after that lands here and refreshes the plan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {room.events.map((e, idx) => (
                      <div key={idx} className="flex gap-3 items-baseline">
                        <span className="text-[10px] font-mono shrink-0 w-20 text-muted-foreground">
                          {e.detected_at ? new Date(e.detected_at).toLocaleDateString() : ''}
                        </span>
                        {e.change_type && (
                          <span className={`text-[10px] font-mono badge badge-${e.change_type}`}>
                            {e.change_type}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{e.brief_text || 'Change detected'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
