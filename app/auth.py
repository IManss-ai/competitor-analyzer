import secrets
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User, MagicLinkToken
import httpx


def generate_magic_link_token(user_id: str, db: Session, expires_minutes: int = 30) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db_token = MagicLinkToken(
        token_hash=token_hash,
        user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    )
    db.add(db_token)
    db.commit()
    return token


def verify_magic_link_token(token: str, db: Session) -> str | None:
    """Returns user_id if valid and not expired. Consumes token (one-use)."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    db_token = (
        db.query(MagicLinkToken)
        .filter(MagicLinkToken.token_hash == token_hash)
        .first()
    )
    if not db_token:
        return None
    if now > db_token.expires_at.replace(tzinfo=timezone.utc) if db_token.expires_at.tzinfo is None else now > db_token.expires_at:
        db.delete(db_token)
        db.commit()
        return None
    user_id = str(db_token.user_id)
    db.delete(db_token)
    db.commit()
    return user_id


def get_or_create_user(email: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


async def send_magic_link_email(email: str, magic_link_url: str, resend_api_key: str, from_email: str):
    if not resend_api_key or "dummy" in resend_api_key.lower():
        print(f"\n--- [LOCAL DEV EMAIL] Magic link → {email}: {magic_link_url} ---\n")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_api_key}", "Content-Type": "application/json"},
            json={
                "from": f"Competitor Analyzer <{from_email}>",
                "to": [email],
                "subject": "Your login link — Competitor Analyzer",
                "text": f"Click here to log in (link expires in 30 minutes):\n\n{magic_link_url}\n\nIf you didn't request this, ignore this email.",
            },
        )
        resp.raise_for_status()
