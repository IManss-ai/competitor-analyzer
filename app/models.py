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
    trial_ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    business_type = Column(String, default="saas")  # "saas" | "local"
    scan_schedule = Column(String, default="weekly")  # "weekly" | "biweekly"
    email_notifications = Column(Boolean, default=True)
    digest_email = Column(String, nullable=True)


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
    net_char_delta = Column(Integer, nullable=False)  # abs(after - before)
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
    original_draft = Column(Text, nullable=False)  # GPT-4o output
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
