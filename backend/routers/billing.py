from fastapi import APIRouter, Depends, HTTPException, Request
from backend.auth.clerk import get_current_user
from backend.config import settings

router = APIRouter()


@router.post("/create-checkout")
async def create_checkout(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    import stripe
    body = await request.json()
    plan = body.get("plan", "basic")  # "basic" | "unlimited"
    price_id = (
        settings.stripe_price_basic if plan == "basic" else settings.stripe_price_unlimited
    )
    try:
        stripe.api_key = settings.stripe_secret_key
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url="http://localhost:3000/billing?success=1",
            cancel_url="http://localhost:3000/billing?cancelled=1",
            metadata={"clerk_user_id": user_id},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(500, f"Stripe error: {e}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    import stripe
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        stripe.api_key = settings.stripe_secret_key
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {e}")
    if event["type"] == "checkout.session.completed":
        pass  # TODO: Update user subscription in DB
    return {"received": True}
