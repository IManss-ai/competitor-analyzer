from pydantic import BaseModel
from datetime import datetime


class DisclosureGenerateRequest(BaseModel):
    company_name: str
    company_slug: str
    dataset_ids: list[int]


class DisclosureResponse(BaseModel):
    id: int
    company_slug: str
    version_hash: str
    html_content: str
    generated_at: datetime
    published_at: datetime | None

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_datasets: int
    compliant_datasets: int
    non_compliant_datasets: int
    total_disclosures: int
    published_disclosures: int
    compliance_score: float  # 0.0 to 1.0
