from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base
from datetime import datetime


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_slug: Mapped[str] = mapped_column(String(255), index=True)
    clerk_user_id: Mapped[str] = mapped_column(String(255), index=True)
    source_type: Mapped[str] = mapped_column(String(50))  # "huggingface" | "manual"
    hf_dataset_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    name: Mapped[str] = mapped_column(String(500))
    sources_description: Mapped[str | None] = mapped_column(nullable=True)
    contains_personal_data: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contains_ip: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    approximate_size: Mapped[str | None] = mapped_column(String(255), nullable=True)
    acquisition_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    collection_period: Mapped[str | None] = mapped_column(String(255), nullable=True)
    modifications_description: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def has_missing_fields(self) -> bool:
        required = [
            self.sources_description,
            self.contains_personal_data,
            self.license_type,
            self.contains_ip,
            self.approximate_size,
            self.acquisition_method,
            self.collection_period,
        ]
        return any(f is None for f in required)
