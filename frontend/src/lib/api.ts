import { redirect } from 'next/navigation';
import { DashboardData, CompetitorListData, Competitor, QueueData, TrendsData, TrendsMetricsData, SettingsData, BattleCardData, CompetitorReviewsData, SocialPost, LocalCompetitorData, BusinessProfile, DiscoveredCompetitorsData } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private bearer: string;

  // Prefer the signed api_token; fall back to the raw userId only for the
  // legacy deprecation window (backend rejects it once ALLOW_LEGACY_UUID_BEARER
  // is off in production).
  constructor(userId: string, apiToken?: string) {
    this.bearer = apiToken || userId;
  }

  public async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}/api/v1${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearer}`,
        ...options.headers,
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      // Server-side only: a stale session should land on login, not an error
      // boundary. redirect() is unsupported in client event handlers, so the
      // client-side callers keep the plain throw path.
      if (res.status === 401 && typeof window === 'undefined') {
        redirect('/auth/login');
      }
      throw new ApiError(res.status, body);
    }
    return res.json();
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    return this.fetch<DashboardData>('/dashboard');
  }

  // Competitors
  async getCompetitors(includeInactive: boolean = false): Promise<CompetitorListData> {
    const query = includeInactive ? '?include_inactive=true' : '';
    return this.fetch<CompetitorListData>(`/competitors${query}`);
  }

  async addCompetitor(url: string, name?: string): Promise<{ id: string; url: string; name: string }> {
    return this.fetch('/competitors', {
      method: 'POST',
      body: JSON.stringify({ url, name }),
    });
  }

  async updateCompetitor(id: string, payload: Partial<Competitor>): Promise<Competitor> {
    return this.fetch<Competitor>(`/competitors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
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

  async getTrendsMetrics(): Promise<TrendsMetricsData> {
    return this.fetch<TrendsMetricsData>('/trends/metrics');
  }

  // Settings
  async getSettings(): Promise<SettingsData> {
    return this.fetch<SettingsData>('/settings');
  }

  // Scan
  async triggerScan(): Promise<{ ok: boolean; message: string }> {
    return this.fetch('/scan/now', { method: 'POST' });
  }

  async triggerReviewScan(): Promise<{ ok: boolean; message: string }> {
    return this.fetch('/scan/reviews', { method: 'POST' });
  }

  // Battle Cards
  async getBattlecard(competitorId: string): Promise<BattleCardData> {
    return this.fetch<BattleCardData>(`/battlecards/generate/${competitorId}`);
  }

  // Reviews
  async getCompetitorReviews(competitorId: string): Promise<CompetitorReviewsData> {
    return this.fetch<CompetitorReviewsData>(`/competitors/${competitorId}/reviews`);
  }

  // Competitor Detail
  async getCompetitorDetail(competitorId: string): Promise<any> {
    return this.fetch<any>(`/competitors/${competitorId}/detail`);
  }


  // Magic onboarding
  async profileBusiness(url: string): Promise<{ profile: BusinessProfile; is_saas: boolean }> {
    return this.fetch('/onboarding/profile', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async discoverCompetitors(): Promise<DiscoveredCompetitorsData> {
    return this.fetch<DiscoveredCompetitorsData>('/onboarding/discover', {
      method: 'POST',
    });
  }

  // Local Business
  async setBusinessType(businessType: 'saas' | 'local'): Promise<void> {
    await this.fetch('/onboarding/business-type', {
      method: 'POST',
      body: JSON.stringify({ business_type: businessType }),
    });
  }

  async updateLocalCompetitor(competitorId: string, data: Partial<LocalCompetitorData>): Promise<void> {
    await this.fetch(`/local/competitors/${competitorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getLocalSocialPosts(competitorId: string): Promise<{ posts: SocialPost[] }> {
    return this.fetch<{ posts: SocialPost[] }>(`/local/competitors/${competitorId}/social-posts`);
  }

  async triggerLocalScan(competitorId: string): Promise<void> {
    await this.fetch(`/local/scan/${competitorId}`, { method: 'POST' });
  }

  // Billing
  async getCheckoutUrl(plan: 'saas' | 'local' = 'saas'): Promise<{ url: string }> {
    return this.fetch(`/billing/checkout-url?plan=${plan}`);
  }

  async getPortalUrl(): Promise<{ url: string }> {
    return this.fetch('/billing/portal-url');
  }
}

export function createApiClient(userId: string, apiToken?: string): ApiClient {
  return new ApiClient(userId, apiToken);
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

export async function exchangeSessionToken(sessionToken: string): Promise<{ user_id: string; email: string; api_token: string } | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken }),
  });
  if (!res.ok) return null;
  return res.json();
}
