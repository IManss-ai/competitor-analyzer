import { DashboardData, CompetitorListData, QueueData, TrendsData, SettingsData } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api/v1${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.userId}`,
        ...options.headers,
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json();
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return this.fetch<DashboardData>('/dashboard');
  }

  // Competitors
  async getCompetitors(): Promise<CompetitorListData> {
    return this.fetch<CompetitorListData>('/competitors');
  }

  async addCompetitor(url: string, name?: string): Promise<{ id: string; url: string; name: string }> {
    return this.fetch('/competitors', {
      method: 'POST',
      body: JSON.stringify({ url, name }),
    });
  }

  async deleteCompetitor(id: string): Promise<{ ok: boolean }> {
    return this.fetch(`/competitors/${id}`, { method: 'DELETE' });
  }

  // Queue
  async getQueue(): Promise<QueueData> {
    return this.fetch<QueueData>('/queue');
  }

  async approveAction(id: string, editedText?: string): Promise<{ ok: boolean }> {
    return this.fetch(`/queue/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ edited_text: editedText }),
    });
  }

  // Trends
  async getTrends(): Promise<TrendsData> {
    return this.fetch<TrendsData>('/trends');
  }

  // Settings
  async getSettings(): Promise<SettingsData> {
    return this.fetch<SettingsData>('/settings');
  }

  // Scan
  async triggerScan(): Promise<{ ok: boolean; message: string }> {
    return this.fetch('/scan/now', { method: 'POST' });
  }

  // Billing
  async getCheckoutUrl(): Promise<{ url: string }> {
    return this.fetch('/billing/checkout-url');
  }

  async getPortalUrl(): Promise<{ url: string }> {
    return this.fetch('/billing/portal-url');
  }
}

export function createApiClient(userId: string): ApiClient {
  return new ApiClient(userId);
}

// Unauthenticated calls (for login)
export async function requestMagicLink(email: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function exchangeSessionToken(sessionToken: string): Promise<{ user_id: string; email: string } | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken }),
  });
  if (!res.ok) return null;
  return res.json();
}
