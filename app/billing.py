import os
from app.config import POLAR_ACCESS_TOKEN, POLAR_SAAS_PRODUCT_ID, POLAR_LOCAL_PRODUCT_ID, APP_BASE_URL

def _get_polar():
    from polar_sdk import Polar
    return Polar(access_token=POLAR_ACCESS_TOKEN)

async def create_checkout_session(
    user_email: str,
    user_id: str,
    plan_type: str = "saas",
    success_url: str = None,
    cancel_url: str = None,
) -> str:
    """Create a Polar checkout session. Returns the checkout URL."""
    from polar_sdk import Polar
    from polar_sdk import models

    product_id = POLAR_LOCAL_PRODUCT_ID if plan_type == "local" else POLAR_SAAS_PRODUCT_ID
    if not product_id:
        raise ValueError(f"Polar product ID not configured for plan: {plan_type}")
    if not POLAR_ACCESS_TOKEN:
        raise ValueError("POLAR_ACCESS_TOKEN not configured")

    resolved_success_url = success_url or f"{APP_BASE_URL}/billing/success"

    with _get_polar() as polar:
        checkout = polar.checkouts.create(request=models.CheckoutCreate(
            products=[product_id],
            customer_email=user_email,
            success_url=resolved_success_url,
            metadata={"user_id": user_id, "plan_type": plan_type},
        ))
    return checkout.url

async def create_portal_session(polar_customer_id: str, return_url: str = None) -> str:
    """Create a Polar customer portal session. Returns the portal URL."""
    from polar_sdk import Polar
    from polar_sdk import models

    with _get_polar() as polar:
        session = polar.customer_sessions.create(request=models.CustomerSessionCustomerIDCreate(
            customer_id=polar_customer_id,
            return_url=return_url,
        ))
    return session.customer_portal_url
