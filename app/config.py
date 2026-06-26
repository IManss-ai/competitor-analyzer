import os

# Only load .env file locally — Railway injects env vars directly
if not os.environ.get("RAILWAY_ENVIRONMENT"):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

DATABASE_URL = os.environ["DATABASE_URL"]
# AI provider — DeepSeek (OpenAI-compatible). Old OpenAI/Anthropic keys no longer required.
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
SCRAPER_URL = os.environ.get("SCRAPER_URL", "")
# Polar.sh billing — set these in Railway environment variables
# POLAR_ACCESS_TOKEN: from https://polar.sh/settings/tokens
# POLAR_WEBHOOK_SECRET: from https://polar.sh/dashboard/[org]/settings/webhooks
# POLAR_SAAS_PRODUCT_ID: product ID for $49/mo plan
# POLAR_LOCAL_PRODUCT_ID: product ID for $19/mo plan
# POLAR_SERVER: "sandbox" (testing) | "production" (launch) — routes the SDK to
# sandbox-api.polar.sh vs api.polar.sh without code edits. Token + product IDs
# must match the selected server.
POLAR_SERVER = os.environ.get("POLAR_SERVER", "production")
POLAR_ACCESS_TOKEN = os.environ.get("POLAR_ACCESS_TOKEN", "")
POLAR_WEBHOOK_SECRET = os.environ.get("POLAR_WEBHOOK_SECRET", "")
POLAR_SAAS_PRODUCT_ID = os.environ.get("POLAR_SAAS_PRODUCT_ID", "")
POLAR_LOCAL_PRODUCT_ID = os.environ.get("POLAR_LOCAL_PRODUCT_ID", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")
APP_SECRET_KEY = os.environ["APP_SECRET_KEY"]
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# ── Paywall (usage-based one-test model) ───────────────────────────────────
# Feature flag — ships dark. When false, access_level() always returns "full".
PAYWALL_ENABLED = os.environ.get("PAYWALL_ENABLED", "false").lower() == "true"
# Comma-separated emails that are never locked (founder / staff), lower-cased.
# Founder is hard-defaulted so we can never accidentally lock ourselves out.
_comped_raw = os.environ.get("COMPED_EMAILS", "")
COMPED_EMAILS = {e.strip().lower() for e in _comped_raw.split(",") if e.strip()}
COMPED_EMAILS.add("nodes.kazakhstan@gmail.com")


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
