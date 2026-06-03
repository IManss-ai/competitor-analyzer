from sqlalchemy import String, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base
from datetime import datetime


class Disclosure(Base):
    __tablename__ = "disclosures"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_slug: Mapped[str] = mapped_column(String(255), index=True)
    clerk_user_id: Mapped[str] = mapped_column(String(255), index=True)
    version_hash: Mapped[str] = mapped_column(String(64))
    html_content: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_user_id: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(255))
    resource_type: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[int | None] = mapped_column(nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
