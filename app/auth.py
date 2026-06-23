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
                "from": f"Rivalscope <{from_email}>",
                "to": [email],
                "subject": "Your login link — Rivalscope",
                "text": f"Click here to log in (link expires in 30 minutes):\n\n{magic_link_url}\n\nIf you didn't request this, ignore this email.",
            },
        )
        resp.raise_for_status()


# --- Session token for Next.js frontend handoff ---
from itsdangerous import URLSafeTimedSerializer as _USTS
from app.config import APP_SECRET_KEY as _SK

_session_serializer = _USTS(_SK, salt="nextjs-session-handoff")

def generate_session_token(user_id: str, email: str) -> str:
    """Short-lived token (5 min) passed to Next.js after magic link verify."""
    return _session_serializer.dumps({"user_id": user_id, "email": email})

def verify_session_token(token: str) -> dict | None:
    """Returns {user_id, email} or None if expired/invalid."""
    try:
        return _session_serializer.loads(token, max_age=300)  # 5 minutes
    except Exception:
        return None


# --- Long-lived signed API bearer token (real authentication for the API) ---
# Replaces the raw user_id as the API credential. Distinct salt from the 5-minute
# login handoff so the two token types are not interchangeable. Carries only the
# user_id; signature + expiry mean a forged or expired token is rejected.
_api_serializer = _USTS(_SK, salt="api-bearer-token")
API_TOKEN_MAX_AGE = 30 * 24 * 60 * 60  # 30 days

def generate_api_token(user_id: str) -> str:
    return _api_serializer.dumps({"user_id": str(user_id)})

def verify_api_token(token: str) -> str | None:
    """Return the user_id for a valid, unexpired api_token, else None."""
    try:
        data = _api_serializer.loads(token, max_age=API_TOKEN_MAX_AGE)
    except Exception:
        return None
    return data.get("user_id") if isinstance(data, dict) else None


def resolve_bearer_user_id(token: str) -> str | None:
    """Single source of truth for turning a bearer token into a user_id.

    Preferred: a signed api_token (signature + expiry). Legacy: a raw user_id
    UUID, accepted ONLY when ALLOW_LEGACY_UUID_BEARER is set (deprecation window;
    off in production by default). Returns None if neither applies. Every path
    that authenticates a bearer must go through this so the hole is closed in one
    place. See docs/.../2026-06-23-AUTH-HARDENING-SPEC.md.
    """
    user_id = verify_api_token(token)
    if user_id:
        return user_id
    from app.config import ALLOW_LEGACY_UUID_BEARER
    if ALLOW_LEGACY_UUID_BEARER:
        try:
            uuid.UUID(token)
            return token
        except (ValueError, AttributeError, TypeError):
            return None
    return None


def hash_password(password: str) -> str:
    """Hash password using SHA-256 with a static salt for dependency-free security."""
    salt = "competitor-analyzer-salt-2026-salt"
    return hashlib.sha256((password + salt).encode()).hexdigest()


def check_password(password: str, hashed: str | None) -> bool:
    """Verify if password matches the hashed version."""
    if not hashed:
        return False
    return hash_password(password) == hashed

