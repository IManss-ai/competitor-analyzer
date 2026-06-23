"""Single source of truth for trial / subscription access level.

Trial expiry was previously only *displayed* — nothing enforced it, so an
expired trial kept full write access and paying was pointless. This module
decides whether a user is "full" (active sub, or a trial that hasn't ended)
or "read_only" (expired/canceled/past_due/revoked or a missing trial window).

Reads stay open everywhere; the `require_write_access` dependency below gates
the value-producing / paid write endpoints with a 402.
"""
import uuid
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import User


def access_level(user: User) -> str:
    """Return "full" or "read_only" for a user.

    - "full" if the subscription is active.
    - "full" if the trial is ongoing (status "trialing" AND trial_ends_at is
      set AND in the future).
    - "read_only" otherwise (trial expired, canceled, past_due, revoked, or a
      missing trial window).
    """
    status = user.subscription_status
    if status == "active":
        return "full"
    if status == "trialing" and user.trial_ends_at is not None:
        # User.trial_ends_at defaults to a NAIVE datetime.utcnow() (models.py),
        # so it may arrive tz-naive from the DB. Comparing a naive datetime
        # against an aware one raises TypeError — normalize the stored value to
        # aware UTC before comparing against now().
        ends_at = user.trial_ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if ends_at > datetime.now(timezone.utc):
            return "full"
    return "read_only"


def is_read_only(user: User) -> bool:
    return access_level(user) == "read_only"


def require_write_access(
    authorization: str = Header(default=None),
    db: Session = Depends(get_session),
) -> str:
    """FastAPI dependency guarding paid / value-producing write endpoints.

    Drop-in for `require_api_user`: returns the user_id string so call sites can
    swap `Depends(require_api_user)` → `Depends(require_write_access)` unchanged.
    Unauthenticated requests still 401 (delegated to require_api_user);
    authenticated-but-read-only requests get 402.
    """
    # Lazy import avoids a hard circular import: api_v1 imports require_write_access
    # at module load, and importing require_api_user at the top here would close
    # the cycle.
    from app.routes.api_v1 import require_api_user

    user_id = require_api_user(authorization)
    user = db.get(User, uuid.UUID(user_id))
    if user is not None and is_read_only(user):
        raise HTTPException(
            status_code=402,
            detail="Your trial has ended — upgrade to continue.",
        )
    return user_id
