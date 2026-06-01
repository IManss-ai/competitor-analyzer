import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User
import httpx

# Token store: token_hash -> {user_id, expires_at}
_magic_link_tokens: dict[str, dict] = {}

def generate_magic_link_token(user_id: str, expires_minutes: int = 30) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    _magic_link_tokens[token_hash] = {
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return token

def verify_magic_link_token(token: str) -> str | None:
    """Returns user_id if token is valid and not expired. Consumes token (one-use)."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    entry = _magic_link_tokens.pop(token_hash, None)
    if not entry:
        return None
    if datetime.now(timezone.utc) > entry["expires_at"]:
        return None
    return entry["user_id"]

def get_or_create_user(email: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

async def send_magic_link_email(email: str, magic_link_url: str, mailgun_api_key: str, mailgun_domain: str):
    # Print to console for dev environment/tests if config is dummy or empty
    if not mailgun_api_key or not mailgun_domain or "dummy" in mailgun_api_key.lower():
        print(f"\n--- [LOCAL DEV EMAIL] Magic link sent to {email}: {magic_link_url} ---\n")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.mailgun.net/v3/{mailgun_domain}/messages",
            auth=("api", mailgun_api_key),
            data={
                "from": f"Competitor Analyzer <noreply@{mailgun_domain}>",
                "to": email,
                "subject": "Your login link — Competitor Analyzer",
                "text": f"Click here to log in (link expires in 30 minutes):\n\n{magic_link_url}\n\nIf you didn't request this, ignore this email.",
            },
        )
        resp.raise_for_status()
