from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User
from app.routes.api_v1 import require_api_user
import uuid

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
