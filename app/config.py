import os

# Only load .env file locally — Railway injects env vars directly
if not os.environ.get("RAILWAY_ENVIRONMENT"):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

DATABASE_URL = os.environ["DATABASE_URL"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
JINA_API_KEY = os.environ.get("JINA_API_KEY", "")
# Polar.sh billing — set these in Railway environment variables
# POLAR_ACCESS_TOKEN: from https://polar.sh/settings/tokens
# POLAR_WEBHOOK_SECRET: from https://polar.sh/dashboard/[org]/settings/webhooks
# POLAR_SAAS_PRODUCT_ID: product ID for $49/mo plan
# POLAR_LOCAL_PRODUCT_ID: product ID for $19/mo plan
POLAR_ACCESS_TOKEN = os.environ.get("POLAR_ACCESS_TOKEN", "")
POLAR_WEBHOOK_SECRET = os.environ.get("POLAR_WEBHOOK_SECRET", "")
POLAR_SAAS_PRODUCT_ID = os.environ.get("POLAR_SAAS_PRODUCT_ID", "")
POLAR_LOCAL_PRODUCT_ID = os.environ.get("POLAR_LOCAL_PRODUCT_ID", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")
APP_SECRET_KEY = os.environ["APP_SECRET_KEY"]
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


# In production (Railway), warn loudly if transactional email can't actually
# reach real users. Resend's shared sender (onboarding@resend.dev) only
# delivers to the Resend account owner's own address, so magic-link logins and
# weekly briefs to real users silently fail until FROM_EMAIL points at an
# address on a Resend-verified domain.
if os.environ.get("RAILWAY_ENVIRONMENT"):
    if not RESEND_API_KEY:
        print("[config] WARNING: RESEND_API_KEY is unset in production — login and weekly-brief emails will not be sent.")
    elif FROM_EMAIL == "onboarding@resend.dev":
        print(
            "[config] WARNING: FROM_EMAIL is still the Resend test sender "
            "(onboarding@resend.dev); magic-link logins to real users will not "
            "deliver. Set FROM_EMAIL to an address on a Resend-verified domain."
        )
