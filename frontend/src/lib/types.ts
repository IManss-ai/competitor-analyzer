// Types mirroring FastAPI /api/v1/* responses

export interface DashboardData {
  events: ChangeEvent[];
  pending_count: number;
  last_scan: string | null;
  competitor_count: number;
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

export interface SettingsData {
  id: string;
  email: string;
  subscription_status: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
}

export interface SessionUser {
  user_id: string;
  email: string;
}

export interface BattleCardData {
  actions: string[];
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
