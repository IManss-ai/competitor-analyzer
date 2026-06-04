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
import uuid

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
        raise HTTPException(status_code=503, detail="Webhook not configured")
    body = await request.body()
    try:
        event = validate_event(
            payload=body,
            headers=dict(request.headers),
            secret=POLAR_WEBHOOK_SECRET,
        )
    except WebhookVerificationError:
        raise HTTPException(status_code=403, detail="Invalid signature")
    except WebhookUnknownTypeError:
        return {"ok": True}

    event_type = getattr(event, "TYPE", None)
    if not event_type:
        return {"ok": True}

    data = getattr(event, "data", None)
    if not data:
        return {"ok": True}

    # Find the user via event.data.metadata.get("user_id") or event.data.customer_id
    user = None
    metadata = getattr(data, "metadata", {}) or {}
    user_id = metadata.get("user_id")

    if user_id:
        try:
            user = db.get(User, uuid.UUID(user_id))
        except Exception:
            pass

    customer_id = getattr(data, "customer_id", None)
    if not user and customer_id:
        user = db.execute(
            select(User).where(User.polar_customer_id == customer_id)
        ).scalar_one_or_none()

    if user:
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
                # status_enum can be an Enum with .value or string
                status_val = getattr(status_enum, "value", str(status_enum))
                user.subscription_status = str(status_val)

        db.commit()

    return {"status": "success"}
