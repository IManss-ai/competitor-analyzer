'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords, Plus } from 'lucide-react';

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
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);
  const [selected, setSelected] = useState('');
  const [userProduct, setUserProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const headers = { Authorization: `Bearer ${userId}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/campaigns`, { headers }),
        fetch(`${API_BASE}/api/v1/competitors`, { headers }),
      ]);
      if (campRes.ok) setCampaigns((await campRes.json()).campaigns);
      if (compRes.ok) {
        const body = await compRes.json();
        setCompetitors(body.competitors || body || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

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
      <div className="rs-card p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        <Swords size={16} style={{ color: 'var(--accent-primary)' }} className="shrink-0 hidden sm:block" />
        <select className="rs-input text-sm flex-1" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Pick a competitor to beat…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.url}</option>
          ))}
        </select>
        <input
          className="rs-input text-sm flex-1"
          placeholder="Your product name (for the AI-visibility duel)"
          value={userProduct}
          onChange={(e) => setUserProduct(e.target.value)}
        />
        <button className="rs-btn-primary text-[13px] whitespace-nowrap" disabled={!selected || creating} onClick={createCampaign}>
          <Plus size={14} className="inline mr-1" />
          {creating ? 'Starting…' : 'Start campaign'}
        </button>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="rs-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="rs-card p-10 text-center space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No campaigns yet</p>
          <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            A campaign is your war room against one competitor: a live action plan, their every move, and the
            AI-recommendation score between you. Pick a competitor above to start.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="rs-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.competitor_url}</p>
              </div>
              <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {c.last_plan_at ? `plan ${new Date(c.last_plan_at).toLocaleDateString()}` : 'plan pending'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
