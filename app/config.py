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
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "onboarding@resend.dev")
APP_SECRET_KEY = os.environ["APP_SECRET_KEY"]
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
