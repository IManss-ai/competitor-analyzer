from fastapi import APIRouter, Request, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User
from app.session import require_current_user
from app.billing import create_checkout_session, create_portal_session
from app.config import POLAR_SAAS_PRODUCT_ID, POLAR_WEBHOOK_SECRET
from polar_sdk.webhooks import validate_event, WebhookVerificationError, WebhookUnknownTypeError
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing")
templates = Jinja2Templates(directory="templates")

@router.get("/checkout")
async def billing_checkout(
    request: Request,
    plan: str = "saas",
    db: Session = Depends(get_session),
    user_id=Depends(require_current_user)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.get(User, user_uuid)
    if not user:
        return RedirectResponse(url="/auth/login")

    if not POLAR_SAAS_PRODUCT_ID:
        return templates.TemplateResponse("settings.html", {
            "request": request,
            "user": user,
            "error": "Polar billing setup is incomplete: POLAR_SAAS_PRODUCT_ID not configured."
        })

    try:
        checkout_url = await create_checkout_session(user.email, str(user.id), plan_type=plan)
        return RedirectResponse(url=checkout_url)
    except Exception as e:
        return templates.TemplateResponse("settings.html", {
            "request": request,
            "user": user,
            "error": f"Polar checkout initialization failed: {str(e)}"
        })

@router.get("/success", response_class=HTMLResponse)
async def billing_success(request: Request):
    return templates.TemplateResponse("billing_success.html", {
        "request": request,
    })

@router.get("/portal")
async def billing_portal(
    request: Request,
    db: Session = Depends(get_session),
    user_id=Depends(require_current_user)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.get(User, user_uuid)
    if not user or not user.polar_customer_id:
        return RedirectResponse(url="/settings")

    try:
        portal_url = await create_portal_session(user.polar_customer_id)
        return RedirectResponse(url=portal_url)
    except Exception:
        return RedirectResponse(url="/settings")

@router.post("/webhook")
async def billing_webhook(request: Request, db: Session = Depends(get_session)):
    if not POLAR_WEBHOOK_SECRET:
        logger.error("Polar webhook hit but POLAR_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Webhook not configured")
    body = await request.body()
    try:
        event = validate_event(
            body=body,
            headers=dict(request.headers),
            secret=POLAR_WEBHOOK_SECRET,
        )
    except WebhookVerificationError:
        logger.warning("Polar webhook signature invalid")
        raise HTTPException(status_code=403, detail="Invalid signature")
    except WebhookUnknownTypeError as e:
        logger.info("Polar webhook unknown type: %s", e)
        return {"ok": True}

    event_type = getattr(event, "TYPE", "") or ""
    data = getattr(event, "data", None)
    if not data:
        logger.warning("Polar webhook %s missing data payload", event_type)
        return {"ok": True}

    user = None
    metadata = getattr(data, "metadata", {}) or {}
    user_id_raw = metadata.get("user_id")

    if user_id_raw:
        try:
            user = db.get(User, uuid.UUID(str(user_id_raw)))
        except (ValueError, TypeError) as e:
            logger.warning(
                "Polar webhook %s has invalid user_id in metadata: %r (%s)",
                event_type, user_id_raw, e,
            )

    customer_id = getattr(data, "customer_id", None)
    if not user and customer_id:
        user = db.execute(
            select(User).where(User.polar_customer_id == customer_id)
        ).scalar_one_or_none()

    if not user:
        logger.warning(
            "Polar webhook %s could not match a user (metadata user_id=%r, customer_id=%r)",
            event_type, user_id_raw, customer_id,
        )
        return {"ok": True}

    if customer_id:
        user.polar_customer_id = customer_id

    if event_type in ("subscription.created", "subscription.active"):
        user.subscription_status = "active"
        user.polar_subscription_id = getattr(data, "id", user.polar_subscription_id)
    elif event_type in ("subscription.canceled", "subscription.revoked"):
        user.subscription_status = "canceled"
    elif event_type == "subscription.updated":
        status_enum = getattr(data, "status", None)
        if status_enum:
            status_val = getattr(status_enum, "value", str(status_enum))
            user.subscription_status = str(status_val)
    else:
        logger.info("Polar webhook %s received but not handled for user %s", event_type, user.id)

    db.commit()
    logger.info("Polar webhook %s applied: user=%s status=%s", event_type, user.id, user.subscription_status)
    return {"status": "success"}
