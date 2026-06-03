from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.disclosure import Disclosure

router = APIRouter()


@router.get("/p/{company_slug}", response_class=HTMLResponse)
async def public_disclosure(company_slug: str, db: AsyncSession = Depends(get_db)):
    """Public disclosure page — no auth required. Shows latest published disclosure."""
    result = await db.execute(
        select(Disclosure)
        .where(
            Disclosure.company_slug == company_slug,
            Disclosure.published_at.is_not(None),
        )
        .order_by(Disclosure.published_at.desc())
        .limit(1)
    )
    disclosure = result.scalar_one_or_none()
    if not disclosure:
        raise HTTPException(404, f"No published disclosure found for '{company_slug}'")
    return HTMLResponse(content=disclosure.html_content)
