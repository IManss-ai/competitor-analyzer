from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.dataset import Dataset
from backend.models.disclosure import Disclosure
from backend.schemas.disclosure import DashboardStats
from backend.auth.clerk import get_current_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    ds_result = await db.execute(
        select(Dataset).where(Dataset.clerk_user_id == user_id)
    )
    all_datasets = ds_result.scalars().all()
    total = len(all_datasets)
    compliant = sum(1 for d in all_datasets if not d.has_missing_fields)
    non_compliant = total - compliant

    disc_result = await db.execute(
        select(Disclosure).where(Disclosure.clerk_user_id == user_id)
    )
    all_disclosures = disc_result.scalars().all()
    total_disc = len(all_disclosures)
    published = sum(1 for d in all_disclosures if d.published_at is not None)

    score = compliant / total if total > 0 else 0.0

    return DashboardStats(
        total_datasets=total,
        compliant_datasets=compliant,
        non_compliant_datasets=non_compliant,
        total_disclosures=total_disc,
        published_disclosures=published,
        compliance_score=score,
    )
