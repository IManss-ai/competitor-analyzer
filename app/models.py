from uuid import uuid4
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Text, func, UUID
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String, unique=True, nullable=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, default="trialing")  # trialing/active/canceled/past_due
    trial_ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class Competitor(Base):
    __tablename__ = "competitors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    url = Column(String, nullable=False)
    name = Column(String, nullable=True)  # optional display name
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

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
