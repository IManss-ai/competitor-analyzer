from fastapi import HTTPException, Request
from jose import jwt, JWTError
import httpx
from backend.config import settings

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.clerk_jwks_url)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(request: Request) -> str:
    """Returns the Clerk user ID (sub claim) from JWT."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")
    token = auth.split(" ", 1)[1]
    try:
        jwks = await _get_jwks()
        header = jwt.get_unverified_header(token)
        key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
        payload = jwt.decode(token, key, algorithms=["RS256"])
        return payload["sub"]
    except (JWTError, StopIteration, KeyError) as e:
        raise HTTPException(401, f"Invalid token: {e}")
