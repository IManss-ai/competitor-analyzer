from fastapi import Request, HTTPException, status
from fastapi.responses import Response
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app.config import APP_SECRET_KEY

# Serializer for signed session cookie
serializer = URLSafeTimedSerializer(APP_SECRET_KEY, salt="session")

SESSION_COOKIE_NAME = "session"
MAX_AGE_SECONDS = 14 * 24 * 3600  # 14 days

def set_session_user(response: Response, user_id: str):
    data = {"user_id": user_id}
    token = serializer.dumps(data)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=MAX_AGE_SECONDS,
        httponly=True,
        secure=False,  # False for dev, True in prod
        samesite="lax",
    )

def get_current_user_id(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    try:
        data = serializer.loads(token, max_age=MAX_AGE_SECONDS)
        return data.get("user_id")
    except (SignatureExpired, BadSignature):
        return None

def require_current_user(request: Request) -> str:
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": "/auth/login"}
        )
    return user_id
