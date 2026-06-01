from fastapi import APIRouter, Request, Depends, Form, BackgroundTasks, Header, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import stripe
from app.db import get_session
from app.models import User
from app.session import require_current_user
from app.billing import create_checkout_session
from app.config import STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/billing")
templates = Jinja2Templates(directory="templates")

stripe.api_key = STRIPE_SECRET_KEY

@router.get("/checkout")
async def billing_checkout(request: Request, db=Depends(get_session), user_id=Depends(require_current_user)):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.get(User, user_uuid)
    if not user:
        return RedirectResponse(url="/auth/login")
        
    try:
        checkout_url = await create_checkout_session(user.email, str(user.id))
        return RedirectResponse(url=checkout_url)
    except Exception as e:
        return templates.TemplateResponse("settings.html", {
            "request": request,
            "user": user,
            "error": f"Stripe checkout initialization failed: {str(e)}"
        })

@router.get("/success", response_class=HTMLResponse)
async def billing_success(
    request: Request,
    session_id: str,
    background_tasks: BackgroundTasks,
    db=Depends(get_session),
    user_id=Depends(require_current_user)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.get(User, user_uuid)
    
    # Trigger an immediate on-demand scan in background for this user
    from app.routes.scan import _run_scan_background
    background_tasks.add_task(_run_scan_background, str(user.id))
    
    return templates.TemplateResponse("billing_success.html", {
        "request": request,
    })

@router.get("/cancel")
async def billing_cancel(request: Request):
    return RedirectResponse(url="/settings")

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db=Depends(get_session)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        user_id = data_object.get("metadata", {}).get("user_id")
        stripe_customer_id = data_object.get("customer")
        stripe_subscription_id = data_object.get("subscription")
        
        if user_id:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            user = db.get(User, user_uuid)
            if user:
                user.stripe_customer_id = stripe_customer_id
                user.stripe_subscription_id = stripe_subscription_id
                user.subscription_status = "trialing"
                
                # Fetch subscription to record trial end date
                try:
                    sub = stripe.Subscription.retrieve(stripe_subscription_id)
                    if sub.get("trial_end"):
                        user.trial_ends_at = datetime.fromtimestamp(sub.get("trial_end"), tz=timezone.utc)
                except Exception:
                    # Fallback to 14 days if retrieval fails
                    user.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=14)
                
                db.commit()

    elif event_type == "customer.subscription.updated":
        stripe_subscription_id = data_object.get("id")
        status = data_object.get("status")
        
        user = db.query(User).filter(User.stripe_subscription_id == stripe_subscription_id).first()
        if user:
            user.subscription_status = status
            if data_object.get("trial_end"):
                user.trial_ends_at = datetime.fromtimestamp(data_object.get("trial_end"), tz=timezone.utc)
            else:
                user.trial_ends_at = None
            db.commit()

    elif event_type == "customer.subscription.deleted":
        stripe_subscription_id = data_object.get("id")
        user = db.query(User).filter(User.stripe_subscription_id == stripe_subscription_id).first()
        if user:
            user.subscription_status = "canceled"
            db.commit()

    elif event_type == "invoice.payment_failed":
        stripe_subscription_id = data_object.get("subscription")
        user = db.query(User).filter(User.stripe_subscription_id == stripe_subscription_id).first()
        if user:
            user.subscription_status = "past_due"
            db.commit()

    return {"status": "success"}
