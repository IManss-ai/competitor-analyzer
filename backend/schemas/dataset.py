from pydantic import BaseModel
from datetime import datetime


class DatasetCreate(BaseModel):
    company_slug: str
    source_type: str  # "huggingface" | "manual"
    hf_dataset_id: str | None = None
    name: str
    sources_description: str | None = None
    contains_personal_data: bool | None = None
    license_type: str | None = None
    contains_ip: bool | None = None
    approximate_size: str | None = None
    acquisition_method: str | None = None
    collection_period: str | None = None
    modifications_description: str | None = None


class DatasetUpdate(BaseModel):
    sources_description: str | None = None
    contains_personal_data: bool | None = None
    license_type: str | None = None
    contains_ip: bool | None = None
    approximate_size: str | None = None
    acquisition_method: str | None = None
    collection_period: str | None = None
    modifications_description: str | None = None


class DatasetResponse(BaseModel):
    id: int
    company_slug: str
    source_type: str
    hf_dataset_id: str | None
    name: str
    sources_description: str | None
    contains_personal_data: bool | None
    license_type: str | None
    contains_ip: bool | None
    approximate_size: str | None
    acquisition_method: str | None
    collection_period: str | None
    modifications_description: str | None
    has_missing_fields: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetList(BaseModel):
    datasets: list[DatasetResponse]
    total: int
