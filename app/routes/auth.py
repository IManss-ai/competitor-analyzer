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
    user_id = verify_magic_link_token(token, db)
    if not user_id:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Link expired or invalid. Please request a new one.",
        })
    response = RedirectResponse(url="/dashboard", status_code=302)
    set_session_user(response, user_id)
    return response

@router.get("/logout")
async def logout(request: Request):
    response = RedirectResponse(url="/auth/login", status_code=302)
    response.delete_cookie("session")
    return response
