'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords, Plus } from 'lucide-react';
import { isAbortError } from '@/lib/fetch-utils';
import { useApiToken } from '@/lib/use-api-token';
import { useMounted } from '@/lib/use-mounted';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CampaignRow {
  id: string;
  name: string;
  competitor_name: string;
  competitor_url: string;
  last_plan_at: string | null;
  created_at: string | null;
}

interface CompetitorOption {
  id: string;
  name: string | null;
  url: string;
}

export default function CampaignsClient({ userId }: { userId: string }) {
  const apiToken = useApiToken();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);
  const [selected, setSelected] = useState('');
  const [userProduct, setUserProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  // Gate clock/locale-derived dates so SSR matches first client render (#418).
  const mounted = useMounted();

  const headers = { Authorization: `Bearer ${apiToken ?? userId}`, 'Content-Type': 'application/json' };

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [campRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/campaigns`, { headers, signal }),
        fetch(`${API_BASE}/api/v1/competitors`, { headers, signal }),
      ]);
      if (campRes.ok) setCampaigns((await campRes.json()).campaigns);
      if (compRes.ok) {
        const body = await compRes.json();
        setCompetitors(body.competitors || body || []);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const createCampaign = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ competitor_id: selected, user_product: userProduct || undefined }),
      });
      if (res.ok) {
        const body = await res.json();
        window.location.href = `/campaigns/${body.id}`;
      }
    } finally {
      setCreating(false);
    }
  };

  const tracked = new Set(campaigns.map((c) => c.competitor_name));
  const available = competitors.filter((c) => !tracked.has(c.name || c.url));

  return (
    <div className="space-y-6">
      {/* Start a campaign */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Swords size={16} className="shrink-0 hidden sm:block text-primary" />
            <select
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Pick a competitor to beat…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.url}</option>
              ))}
            </select>
            <Input
              className="text-sm flex-1"
              placeholder="Your product name (for the AI-visibility duel)"
              value={userProduct}
              onChange={(e) => setUserProduct(e.target.value)}
            />
            <Button disabled={!selected || creating} onClick={createCampaign} className="whitespace-nowrap">
              <Plus size={14} />
              {creating ? 'Starting…' : 'Start campaign'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign list */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">No campaigns yet</p>
            <p className="text-xs max-w-sm mx-auto text-muted-foreground">
              A campaign is your war room against one competitor: a live action plan, their every move, and the
              AI-recommendation score between you. Pick a competitor above to start.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-4 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{c.competitor_url}</p>
              </div>
              <span className="text-xs font-mono shrink-0 text-muted-foreground">
                {mounted ? (c.last_plan_at ? `plan ${new Date(c.last_plan_at).toLocaleDateString()}` : 'plan pending') : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
