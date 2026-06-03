from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from backend.database import get_db
from backend.models.dataset import Dataset
from backend.models.disclosure import Disclosure
from backend.schemas.disclosure import DisclosureGenerateRequest, DisclosureResponse
from backend.auth.clerk import get_current_user
from backend.services.disclosure_generator import DisclosureGenerator
from backend.services.pdf_generator import PDFGenerator

router = APIRouter()
generator = DisclosureGenerator()
pdf_gen = PDFGenerator()


@router.post("/generate", response_model=DisclosureResponse, status_code=201)
async def generate_disclosure(
    payload: DisclosureGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Dataset).where(
            Dataset.id.in_(payload.dataset_ids),
            Dataset.clerk_user_id == user_id,
        )
    )
    datasets = result.scalars().all()
    if not datasets:
        raise HTTPException(404, "No datasets found")

    dataset_dicts = [
        {
            "name": ds.name,
            "source_type": ds.source_type,
            "sources_description": ds.sources_description,
            "contains_personal_data": ds.contains_personal_data,
            "license_type": ds.license_type,
            "contains_ip": ds.contains_ip,
            "approximate_size": ds.approximate_size,
            "acquisition_method": ds.acquisition_method,
            "collection_period": ds.collection_period,
            "modifications_description": ds.modifications_description,
        }
        for ds in datasets
    ]

    html_content, version_hash = generator.generate_html(
        company_name=payload.company_name,
        company_slug=payload.company_slug,
        datasets=dataset_dicts,
    )

    disclosure = Disclosure(
        company_slug=payload.company_slug,
        clerk_user_id=user_id,
        version_hash=version_hash,
        html_content=html_content,
    )
    db.add(disclosure)
    await db.commit()
    await db.refresh(disclosure)
    return disclosure


@router.get("", response_model=list[DisclosureResponse])
async def list_disclosures(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Disclosure).where(Disclosure.clerk_user_id == user_id)
    )
    return result.scalars().all()


@router.post("/{disclosure_id}/publish", response_model=DisclosureResponse)
async def publish_disclosure(
    disclosure_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Disclosure).where(
            Disclosure.id == disclosure_id,
            Disclosure.clerk_user_id == user_id,
        )
    )
    disclosure = result.scalar_one_or_none()
    if not disclosure:
        raise HTTPException(404, "Disclosure not found")
    disclosure.published_at = datetime.utcnow()
    await db.commit()
    await db.refresh(disclosure)
    return disclosure


@router.get("/{disclosure_id}/pdf")
async def download_pdf(
    disclosure_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(Disclosure).where(
            Disclosure.id == disclosure_id,
            Disclosure.clerk_user_id == user_id,
        )
    )
    disclosure = result.scalar_one_or_none()
    if not disclosure:
        raise HTTPException(404, "Disclosure not found")
    pdf_bytes = pdf_gen.generate(disclosure.html_content)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="disclosure-{disclosure_id}.pdf"'},
    )
