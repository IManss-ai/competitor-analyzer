from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Float, ForeignKey, Text, func, UUID, Index
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    polar_customer_id = Column(String, nullable=True)
    polar_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, default="trialing")  # trialing/active/canceled/past_due
    # Give every new account a real 2-day trial window. Without this the column
    # stayed NULL on signup and the dashboard showed "0 days left / Upgrade to
    # Pro" the instant a user registered.
    trial_ends_at = Column(DateTime, nullable=True, default=lambda: datetime.utcnow() + timedelta(days=2))
    # Usage-based paywall: set True once the user has had their one free test
    # (first battle card generated). Drives access_level() lock.
    free_test_used = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime, default=func.now())
    business_type = Column(String, default="saas")  # "saas" | "local"
    scan_schedule = Column(String, default="weekly")  # "weekly" | "biweekly"
    email_notifications = Column(Boolean, default=True)
    digest_email = Column(String, nullable=True)
    # Magic onboarding: the user's OWN business, scraped + AI-profiled from their URL.
    business_url = Column(String, nullable=True)
    business_name = Column(String, nullable=True)
    business_profile = Column(Text, nullable=True)     # JSON string (see app/onboarding/profiler.py)
    onboarded_at = Column(DateTime, nullable=True)     # set when magic onboarding completes
    # First-touch marketing attribution, set once at signup and never overwritten
    # (see app/auth.py apply_signup_attribution).
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)
    signup_referrer = Column(String, nullable=True)


class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    name = Column(String, nullable=True)  # optional display name
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    business_type = Column(String, default="saas")  # "saas" | "local"
    google_maps_url = Column(String, nullable=True)   # for local: full Google Maps URL
    instagram_handle = Column(String, nullable=True)  # e.g. "starbucks" (no @)
    facebook_page = Column(String, nullable=True)     # e.g. "starbucks"
    g2_url = Column(String, nullable=True)            # explicit G2 reviews URL override
    trustpilot_url = Column(String, nullable=True)    # explicit Trustpilot review URL override
    capterra_url = Column(String, nullable=True)      # explicit Capterra reviews URL override
    careers_url = Column(String, nullable=True)       # explicit careers / jobs page URL for hiring signals
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=True, index=True)  # discovery App link

class Snapshot(Base):
    __tablename__ = "snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    fetched_at = Column(DateTime, default=func.now())
    raw_text = Column(Text, nullable=False)  # full extracted text from Jina
    char_count = Column(Integer, nullable=False)
    fetch_error = Column(String, nullable=True)  # null = success

class ChangeEvent(Base):
    __tablename__ = "change_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    detected_at = Column(DateTime, default=func.now())
    snapshot_before_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id"), nullable=False)
    snapshot_after_id = Column(UUID(as_uuid=True), ForeignKey("snapshots.id"), nullable=False)
    net_char_delta = Column(Integer, nullable=False)  # chars changed (edit magnitude), always >= 0
    change_type = Column(String, nullable=True)  # set by classifier in plan 01-02
    brief_text = Column(Text, nullable=True)      # set by synthesizer in plan 01-02
    week_label = Column(String, nullable=True)    # e.g. "2025-W23"

class MagicLinkToken(Base):
    __tablename__ = "magic_link_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime, default=func.now())

class ApprovedAction(Base):
    __tablename__ = "approved_actions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    change_event_id = Column(UUID(as_uuid=True), ForeignKey("change_events.id"), nullable=False)
    action_type = Column(String, nullable=False)  # retention_email/pricing_copy/feature_response/social_draft
    original_draft = Column(Text, nullable=False)  # LLM draft output
    edited_text = Column(Text, nullable=True)      # founder's edited version (null = approved as-is)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class Review(Base):
    __tablename__ = "reviews"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    platform = Column(String, nullable=False)          # "g2" | "trustpilot" | "capterra"
    review_id = Column(String, nullable=False)         # platform's own ID (for dedup)
    author = Column(String, nullable=True)
    rating = Column(Integer, nullable=True)            # 1-5
    title = Column(String, nullable=True)
    body = Column(Text, nullable=False)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=func.now())
    sentiment = Column(String, nullable=True)          # "positive" | "negative" | "neutral"
    is_complaint = Column(Boolean, default=False)      # flagged by AI as a complaint

class ReviewSnapshot(Base):
    __tablename__ = "review_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    platform = Column(String, nullable=False)
    snapshot_at = Column(DateTime, default=func.now())
    avg_rating = Column(Float, nullable=True)          # Float from sqlalchemy
    total_reviews = Column(Integer, nullable=True)
    complaint_count = Column(Integer, default=0)
    top_complaints = Column(Text, nullable=True)       # JSON string: list of 3 complaint summaries

class SocialPost(Base):
    __tablename__ = "social_posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    platform = Column(String, nullable=False)         # "instagram" | "facebook"
    post_id = Column(String, nullable=False)          # dedup key (url or hash)
    content = Column(Text, nullable=False)
    posted_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=func.now())
    sentiment = Column(String, nullable=True)         # "positive" | "negative" | "neutral"
    engagement_hint = Column(String, nullable=True)   # likes/comments count if extractable


class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    posting_id = Column(String, nullable=False)        # stable dedup hash of title+location
    title = Column(String, nullable=False)
    location = Column(String, nullable=True)
    department = Column(String, nullable=True)
    url = Column(String, nullable=True)
    first_seen_at = Column(DateTime, default=func.now())   # when we first noticed it
    last_seen_at = Column(DateTime, default=func.now())    # bumped on each scan that still sees it
    closed_at = Column(DateTime, nullable=True)            # set when the posting disappears


class BattleCardCache(Base):
    """Last generated battle card per competitor. Battle cards are expensive
    (one Claude Sonnet call each), so they are generated at most once per
    freshness window and served from here — including for the public /share
    page, which must never trigger a paid model call."""
    __tablename__ = "battlecard_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False, unique=True, index=True)
    payload = Column(Text, nullable=False)              # full JSON battle card response
    ai_generated = Column(Boolean, default=False)       # False = heuristic fallback (eligible for AI upgrade)
    generated_at = Column(DateTime, default=func.now())


class JobSnapshot(Base):
    __tablename__ = "job_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    snapshot_at = Column(DateTime, default=func.now())
    total_jobs = Column(Integer, default=0)
    new_postings = Column(Integer, default=0)              # jobs first seen in this scan
    closed_postings = Column(Integer, default=0)           # jobs that disappeared since last scan
    strategic_signal = Column(Text, nullable=True)         # AI interpretation of the hiring pattern


class Campaign(Base):
    """A user's standing fight against one competitor: 'Campaign: beat X'.
    Action plans regenerate inside a campaign when new intel arrives."""
    __tablename__ = "campaigns"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id"), nullable=False)
    name = Column(String, nullable=False)               # "Beat Acme"
    user_product = Column(String, nullable=True)         # the user's own product name (for GEO comparison)
    status = Column(String, default="active")            # active | archived
    created_at = Column(DateTime, default=func.now())


class ActionPlan(Base):
    __tablename__ = "action_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    executive_read = Column(Text, nullable=True)         # 1-2 sentence competitive read
    ai_generated = Column(Boolean, default=False)        # False = heuristic fallback
    generated_at = Column(DateTime, default=func.now())
    trigger_summary = Column(Text, nullable=True)        # what intel triggered this plan


class ActionPlanItem(Base):
    __tablename__ = "action_plan_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("action_plans.id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False)                # 1..5, most impactful first
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)                    # concrete first step + drafted copy
    category = Column(String, nullable=True)              # pricing | feature | content | reputation | geo
    status = Column(String, default="pending")            # pending | done | dismissed


class GeoSnapshot(Base):
    """AI-engine visibility check: who does the AI recommend for this niche."""
    __tablename__ = "geo_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    engine = Column(String, nullable=False)               # perplexity | chatgpt | estimated
    user_share = Column(Integer, default=0)               # 0-10: times user recommended
    competitor_share = Column(Integer, default=0)         # 0-10: times competitor recommended
    source = Column(String, default="estimated")          # estimated | live
    checked_at = Column(DateTime, default=func.now())


class App(Base):
    """A web app that exists in the world, independent of any user. Discovery
    profiles, monitoring subscriptions (Competitor.app_id), and later verified
    revenue all hang off this entity."""
    __tablename__ = "apps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    slug = Column(String, unique=True, nullable=False, index=True)
    url = Column(String, unique=True, nullable=False, index=True)  # normalized (see app/discovery/normalize.py)
    name = Column(String, nullable=False)
    tagline = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True, index=True)
    tags = Column(Text, nullable=True)                 # JSON array of strings
    logo_url = Column(String, nullable=True)
    screenshot_url = Column(String, nullable=True)
    source = Column(String, default="seed")            # seed | user_tracked | submitted
    scan_tier = Column(String, default="cheap")        # cheap | full
    scan_status = Column(String, default="pending")    # pending | ok | scan_degraded | scan_failed
    # scan_degraded = fetch worked but no profile AND no tech were learned; row
    # stays publicly visible (search/sitemap hide only scan_failed) and stays
    # selectable for re-enrichment.
    first_scanned_at = Column(DateTime, nullable=True)
    last_scanned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    # NOTE: search_vector (tsvector) is added Postgres-only in the Alembic
    # migration; it is intentionally NOT declared here so SQLite tests work.


class AppPricing(Base):
    __tablename__ = "app_pricing"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=False, index=True)
    tier_name = Column(String, nullable=False)
    price = Column(Float, nullable=True)               # null = custom/contact-us
    currency = Column(String, default="USD")
    period = Column(String, default="monthly")         # monthly | yearly | one_time | free
    features = Column(Text, nullable=True)             # JSON array of strings
    scraped_at = Column(DateTime, default=func.now())


class AppTech(Base):
    __tablename__ = "app_tech"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=False, index=True)
    technology = Column(String, nullable=False)        # canonical key: nextjs, stripe, intercom...
    tech_category = Column(String, nullable=True)      # framework | payments | analytics | support
    detected_at = Column(DateTime, default=func.now())
    __table_args__ = (Index("ix_app_tech_unique", "app_id", "technology", unique=True),)
