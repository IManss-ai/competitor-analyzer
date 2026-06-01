from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.db import get_session
from app.models import User
from app.session import require_current_user
import uuid

router = APIRouter(prefix="/settings")
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def settings_page(request: Request, db=Depends(get_session), user_id=Depends(require_current_user)):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = db.get(User, user_uuid)
    
    return templates.TemplateResponse("settings.html", {
        "request": request,
        "user": user,
    })
