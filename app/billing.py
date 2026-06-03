import stripe
from app.config import STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_BASE_URL

stripe.api_key = STRIPE_SECRET_KEY

async def create_checkout_session(user_email: str, user_id: str, success_url: str = None, cancel_url: str = None) -> str:
    """
    Create a Stripe Checkout session for $49/mo with 14-day free trial.
    Returns the checkout URL.
    """
    session = stripe.checkout.Session.create(
        customer_email=user_email,
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        subscription_data={
            "trial_period_days": 14,
            "metadata": {"user_id": user_id},
        },
        success_url=success_url or f"{APP_BASE_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=cancel_url or f"{APP_BASE_URL}/billing/cancel",
        metadata={"user_id": user_id},
    )
    return session.url

async def create_portal_session(stripe_customer_id: str, return_url: str = None) -> str:
    """Create Stripe customer portal session for billing management."""
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url or f"{APP_BASE_URL}/settings",
    )
    return session.url
