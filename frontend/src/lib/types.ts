// Types mirroring FastAPI /api/v1/* responses

export interface DashboardData {
  events: ChangeEvent[];
  pending_count: number;
  last_scan: string | null;
  competitor_count: number;
  changes_this_week: number;
  avg_review_score: number | null;
  competitors_health: CompetitorHealth[];
}

export interface CompetitorHealth {
  id: string;
  name: string;
  url: string;
  last_scanned: string | null;
  total_changes: number;
  avg_rating: number | null;
  trend: number[];
  status: 'Active' | 'No changes' | 'Error';
}


export interface ChangeEvent {
  id: string;
  competitor_id: string;
  competitor_name: string;
  competitor_url: string;
  detected_at: string | null;
  change_type: string;
  brief_text: string;
  week_label: string;
  net_char_delta: number;
}

export interface Competitor {
  id: string;
  url: string;
  name: string | null;
  active: boolean;
  created_at: string | null;
  business_type?: BusinessType;
  google_maps_url?: string | null;
  instagram_handle?: string | null;
  facebook_page?: string | null;
}

export interface CompetitorListData {
  competitors: Competitor[];
  at_limit: boolean;
}

export interface QueueAction {
  id: string;
  action_type: string;
  original_draft: string;
  edited_text: string | null;
  created_at: string | null;
  change_event: {
    id: string;
    brief_text: string;
    change_type: string;
    detected_at: string | null;
  };
  competitor: {
    id: string;
    name: string;
    url: string;
  };
}

export interface QueueData {
  actions: QueueAction[];
}

export interface TrendsData {
  weeks: string[];
  competitors: {
    id: string;
    name: string;
    url: string;
    counts: number[];
  }[];
}

export interface TypeBreakdownPoint {
  week: string;
  pricing_change: number;
  new_feature: number;
  positioning_shift: number;
  minor_copy: number;
}

export interface ReviewTrend {
  id: string;
  name: string;
  history: {
    date: string | null;
    avg_rating: number | null;
  }[];
}

export interface TrendsMetricsData {
  weeks: string[];
  weekly_changes: {
    id: string;
    name: string;
    url: string;
    counts: number[];
  }[];
  type_breakdown: TypeBreakdownPoint[];
  review_trends: ReviewTrend[];
}

export interface SettingsData {
  id: string;
  email: string;
  subscription_status: string;
  access_level?: 'full' | 'read_only';
  trial_ends_at: string | null;
  business_type?: BusinessType;
}

export type BusinessType = 'saas' | 'local';

// Magic onboarding — AI profile of the user's own business + discovered rivals
export interface BusinessProfile {
  name: string;
  one_liner: string;
  category: string;
  target_customer: string;
  positioning: string;
  key_features: string[];
  socials: string[];
  is_saas: boolean;
  source: 'ai' | 'fallback';
}

export interface DiscoveredCompetitor {
  name: string;
  url: string;
  why: string;
  verified: boolean;
}

export interface DiscoveredCompetitorsData {
  competitors: DiscoveredCompetitor[];
  reason: null | 'local' | 'none_suggested' | 'low_confidence';
}

export interface SessionUser {
  user_id: string;
  email: string;
  business_type?: BusinessType;
  // Signed API bearer token (app/auth.py generate_api_token). Sent as
  // `Authorization: Bearer <api_token>`. Absent on sessions created before the
  // auth-hardening upgrade — the dashboard layout forces a one-time re-login.
  api_token?: string;
}

export interface BattleCardData {
  actions: string[];
}

// Head-to-Head: comparative verdict (user's business_profile vs a competitor).
// Rides along on the battle-card response; absent/empty when the user has no
// business profile or the AI path was unavailable.
export interface HeadToHeadPoint {
  point: string;
  basis: string;
  confidence: 'observed' | 'inferred';
}

export interface HeadToHeadPlay {
  rank: number;
  title: string;
  detail: string;
}

export interface HeadToHead {
  verdict: string;
  you_win: HeadToHeadPoint[];
  you_exposed: HeadToHeadPoint[];
  plays: HeadToHeadPlay[];
}

export interface ReviewSnapshot {
  platform: string;
  avg_rating: number | null;
  total_reviews: number | null;
  complaint_count: number;
  top_complaints: string[];
  snapshot_at: string | null;
}

export interface Complaint {
  platform: string;
  rating: number | null;
  title: string | null;
  body: string;
  published_at: string | null;
}

export interface CompetitorReviewsData {
  snapshots: ReviewSnapshot[];
  recent_complaints: Complaint[];
}

export interface SocialPost {
  id: string;
  platform: 'instagram' | 'facebook';
  content: string;
  posted_at: string | null;
  sentiment: string | null;
  engagement_hint: string | null;
}

export interface LocalCompetitorData {
  competitor_id: string;
  google_maps_url: string | null;
  instagram_handle: string | null;
  facebook_page: string | null;
}
