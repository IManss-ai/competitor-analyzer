import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import User
from app.routes.api_v1 import require_api_user
from app.onboarding.profiler import profile_business
from app.onboarding.discovery import discover_competitors

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])

VALID_BUSINESS_TYPES = {"saas", "local"}


@router.post("/business-type")
def set_business_type(
    payload: dict,
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session)
):
    """Set the user's business type (saas | local). Called once after first login."""
    business_type = payload.get("business_type", "").strip().lower()
    if business_type not in VALID_BUSINESS_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid business_type. Must be one of: {', '.join(sorted(VALID_BUSINESS_TYPES))}"
        )

    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.business_type = business_type
    db.commit()

    return {"ok": True, "business_type": business_type}


def _normalize_url(raw: str) -> str:
    url = (raw or "").strip()
    if not url:
        raise HTTPException(status_code=422, detail="A website URL is required.")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


@router.post("/profile")
async def profile_my_business(
    payload: dict,
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session),
):
    """Magic onboarding step 1 — scrape the user's OWN site and store an honest
    AI profile of their business. Returns the profile for review (editable)."""
    url = _normalize_url(payload.get("url", ""))

    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = await profile_business(url)

    user.business_url = url
    user.business_name = profile.get("name")
    user.business_type = "saas" if profile.get("is_saas", True) else "local"
    user.business_profile = json.dumps(profile)
    user.onboarded_at = datetime.utcnow()
    db.commit()

    return {"profile": profile, "is_saas": profile.get("is_saas", True)}


@router.post("/discover")
async def discover_my_competitors(
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session),
):
    """Magic onboarding step 2 — auto-discover the user's top real competitors
    from their stored profile. SaaS only; every URL is validated before return."""
    user = db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.business_profile:
        raise HTTPException(status_code=400, detail="Profile your business first (POST /onboarding/profile).")

    try:
        profile = json.loads(user.business_profile)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Stored business profile is invalid.")
    profile["business_url"] = user.business_url or ""

    result = await discover_competitors(profile)
    return result
