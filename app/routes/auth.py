from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from app.db import get_session
from app.auth import get_or_create_user, generate_magic_link_token, verify_magic_link_token, send_magic_link_email
from app.config import APP_BASE_URL, RESEND_API_KEY, FROM_EMAIL
from app.session import set_session_user

router = APIRouter(prefix="/auth")
templates = Jinja2Templates(directory="templates")

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.post("/login")
async def request_magic_link(request: Request, email: str = Form(...), db=Depends(get_session)):
    user = get_or_create_user(email, db)
    token = generate_magic_link_token(str(user.id), db)
    link = f"{APP_BASE_URL}/auth/verify?token={token}"
    try:
        await send_magic_link_email(email, link, RESEND_API_KEY, FROM_EMAIL)
    except Exception:
        pass  # Prevent email enumeration by hiding failures
    return templates.TemplateResponse("login.html", {
        "request": request,
        "sent": True,
        "email": email,
    })

@router.get("/verify")
async def verify_magic_link(request: Request, token: str, db=Depends(get_session)):
    from app.config import FRONTEND_URL
    from app.auth import generate_session_token

    user_id = verify_magic_link_token(token, db)
    if not user_id:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Link expired or invalid. Please request a new one.",
        })

    # Fetch user email for the session token payload
    from app.models import User
    import uuid as _uuid
    user = db.get(User, _uuid.UUID(user_id))
    email = user.email if user else ""

    session_token = generate_session_token(user_id, email)
    callback_url = f"{FRONTEND_URL}/api/auth/callback?session_token={session_token}"
    return RedirectResponse(url=callback_url, status_code=302)

@router.get("/logout")
async def logout(request: Request):
    response = RedirectResponse(url="/auth/login", status_code=302)
    response.delete_cookie("session")
    return response
