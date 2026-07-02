"""Single source of truth for paywall access level.

Usage-based: a user gets the full product for ONE test, then locks to
"read_only" until they pay. Reads stay open everywhere; require_write_access
gates the value/write endpoints with a 402. Inert unless PAYWALL_ENABLED.
"""
import uuid

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import PAYWALL_ENABLED, COMPED_EMAILS
from app.db import get_session
from app.models import User
from app.session import require_current_user


def access_level(user: User) -> str:
    """Return "full" or "read_only" for a user.

    - "full" if the paywall is disabled (feature flag off).
    - "full" if the subscription is active (paid).
    - "full" if the email is comped (founder / staff).
    - "full" if the user has NOT yet used their one free test.
    - "read_only" otherwise (free test used, not paying).
    """
    if not PAYWALL_ENABLED:
        return "full"
    if user.subscription_status == "active":
        return "full"
    if user.email and user.email.lower() in COMPED_EMAILS:
        return "full"
    # A user who subscribed via Polar (has a billing relationship) is a paying
    # customer, not a free-tester — never lock them, even while their Polar
    # subscription is still in its trial (status mirrors Polar = "trialing").
    # A CANCELED sub has status "canceled" and correctly falls through to lock.
    if user.subscription_status == "trialing" and (
        getattr(user, "polar_customer_id", None) or getattr(user, "polar_subscription_id", None)
    ):
        return "full"
    if not getattr(user, "free_test_used", False):
        return "full"
    return "read_only"


def is_read_only(user: User) -> bool:
    return access_level(user) == "read_only"


def _raise_if_locked(user: User | None) -> None:
    if user is not None and is_read_only(user):
        raise HTTPException(
            status_code=402,
            detail="Your free test is done — upgrade to Pro to continue.",
        )


def require_write_access(
    authorization: str = Header(default=None),
    db: Session = Depends(get_session),
) -> str:
    """FastAPI dependency guarding paid / value-producing write endpoints.

    Drop-in for ``require_api_user``: returns the user_id string so call sites
    can swap ``Depends(require_api_user)`` -> ``Depends(require_write_access)``
    unchanged. Unauthenticated requests still 401 (delegated to
    require_api_user); authenticated-but-locked requests get 402.

    tests/test_write_gate_coverage.py enforces that every mutating endpoint
    carries this gate (or the session-cookie variant below) unless explicitly
    allowlisted there — new paid endpoints are gated by default.
    """
    # Lazy import avoids a circular import: api_v1 imports require_write_access
    # at module load.
    from app.routes.api_v1 import require_api_user

    user_id = require_api_user(authorization)
    _raise_if_locked(db.get(User, uuid.UUID(user_id)))
    return user_id


def require_write_access_session(
    user_id: str = Depends(require_current_user),
    db: Session = Depends(get_session),
) -> str:
    """Session-cookie twin of ``require_write_access`` for the legacy HTML
    routes (scan/queue/competitors forms). Drop-in for ``require_current_user``:
    unauthenticated requests still redirect to login (delegated), locked users
    get 402 before any paid work.
    """
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    _raise_if_locked(db.get(User, user_uuid))
    return user_id
