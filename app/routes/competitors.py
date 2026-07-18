from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from app.db import get_session
from app.models import Competitor, User
from app.session import require_current_user
from app.access import require_write_access_session
import uuid

router = APIRouter(prefix="/competitors")
templates = Jinja2Templates(directory="templates")

MAX_COMPETITORS = 7

@router.get("/", response_class=HTMLResponse)
async def list_competitors(request: Request, db=Depends(get_session), user_id=Depends(require_current_user)):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    user = db.get(User, user_uuid)
    return templates.TemplateResponse("competitors.html", {
        "request": request,
        "competitors": competitors,
        "at_limit": len(competitors) >= MAX_COMPETITORS,
        "user": user,
    })

@router.post("/add", response_class=HTMLResponse)
async def add_competitor(
    request: Request,
    url: str = Form(...),
    name: str = Form(""),
    db=Depends(get_session),
    user_id=Depends(require_write_access_session)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    existing = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    
    if len(existing) >= MAX_COMPETITORS:
        return templates.TemplateResponse("competitors.html", {
            "request": request,
            "competitors": existing,
            "at_limit": True,
            "error": f"Maximum {MAX_COMPETITORS} competitors allowed.",
        })
        
    # URL normalization
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    competitor = Competitor(user_id=user_uuid, url=url, name=name.strip() or None)
    # Organic catalog growth: every tracked URL becomes (or links to) a public
    # /apps entry. Best-effort — catalog failure must never block tracking.
    try:
        from app.discovery.backfill import get_or_create_app
        app_row, _ = get_or_create_app(db, url, name=name.strip() or None,
                                       source="user_tracked", scan_tier="full")
        competitor.app_id = app_row.id
    except Exception:
        pass  # bare Competitor still works; backfill script can link later
    db.add(competitor)
    db.commit()
    
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    
    return templates.TemplateResponse("competitors.html", {
        "request": request,
        "competitors": competitors,
        "at_limit": len(competitors) >= MAX_COMPETITORS,
    })

@router.post("/{competitor_id}/remove", response_class=HTMLResponse)
async def remove_competitor(
    request: Request,
    competitor_id: str,
    db=Depends(get_session),
    user_id=Depends(require_current_user)
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    comp_uuid = uuid.UUID(competitor_id) if isinstance(competitor_id, str) else competitor_id
    
    competitor = db.get(Competitor, comp_uuid)
    if competitor and competitor.user_id == user_uuid:
        competitor.active = False
        db.commit()
        
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    
    return templates.TemplateResponse("competitors.html", {
        "request": request,
        "competitors": competitors,
        "at_limit": len(competitors) >= MAX_COMPETITORS,
    })
