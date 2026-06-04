from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User, Competitor, ChangeEvent, Snapshot, ApprovedAction, ReviewSnapshot, Review
from app.auth import generate_session_token, verify_session_token, get_or_create_user, generate_magic_link_token, send_magic_link_email
import json as _json
from app.config import RESEND_API_KEY, FROM_EMAIL, APP_BASE_URL
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/v1")


# ── Auth dependency ──────────────────────────────────────────────────────────

def require_api_user(authorization: str = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = authorization.split(" ", 1)[1]
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")
    return user_id


# ── Auth endpoints ───────────────────────────────────────────────────────────

@router.post("/auth/login")
async def api_login(payload: dict, db: Session = Depends(get_session)):
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Email required")
    user = get_or_create_user(email, db)
    token = generate_magic_link_token(str(user.id), db)
    link = f"{APP_BASE_URL}/auth/verify?token={token}"
    try:
        await send_magic_link_email(email, link, RESEND_API_KEY, FROM_EMAIL)
    except Exception:
        pass
    return {"ok": True}


@router.post("/auth/exchange")
def api_exchange(payload: dict):
    session_token = payload.get("session_token", "")
    data = verify_session_token(session_token)
    if not data:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return {
        "user_id": data["user_id"],
        "email": data["email"],
    }


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def api_dashboard(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)

    rows = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .order_by(ChangeEvent.detected_at.desc())
    ).all()

    events = [
        {
            "id": str(e.id),
            "competitor_id": str(e.competitor_id),
            "competitor_name": c.name,
            "competitor_url": c.url,
            "detected_at": e.detected_at.isoformat() if e.detected_at else None,
            "change_type": e.change_type,
            "brief_text": e.brief_text,
            "week_label": e.week_label,
            "net_char_delta": e.net_char_delta,
        }
        for e, c in rows
    ]

    pending_count = db.execute(
        select(func.count(ApprovedAction.id))
        .where(ApprovedAction.user_id == user_uuid)
        .where(ApprovedAction.approved_at.is_(None))
    ).scalar() or 0

    last_scan = db.execute(
        select(Snapshot.fetched_at)
        .join(Competitor)
        .where(Competitor.user_id == user_uuid)
        .order_by(Snapshot.fetched_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    competitor_count = db.execute(
        select(func.count(Competitor.id)).where(Competitor.user_id == user_uuid)
    ).scalar() or 0

    return {
        "events": events,
        "pending_count": pending_count,
        "last_scan": last_scan.isoformat() if last_scan else None,
        "competitor_count": competitor_count,
    }


# ── Competitors ──────────────────────────────────────────────────────────────

MAX_COMPETITORS = 7

@router.get("/competitors")
def api_list_competitors(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    rows = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    return {
        "competitors": [
            {"id": str(c.id), "url": c.url, "name": c.name, "active": c.active, "created_at": c.created_at.isoformat() if c.created_at else None}
            for c in rows
        ],
        "at_limit": len(rows) >= MAX_COMPETITORS,
    }


@router.post("/competitors")
def api_add_competitor(payload: dict, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    existing = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    if len(existing) >= MAX_COMPETITORS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_COMPETITORS} competitors allowed.")
    url = payload.get("url", "").strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    name = payload.get("name", "").strip() or None
    competitor = Competitor(user_id=user_uuid, url=url, name=name)
    db.add(competitor)
    db.commit()
    db.refresh(competitor)
    return {"id": str(competitor.id), "url": competitor.url, "name": competitor.name}


@router.delete("/competitors/{competitor_id}")
def api_delete_competitor(competitor_id: str, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    c = db.execute(
        select(Competitor).where(Competitor.id == uuid.UUID(competitor_id), Competitor.user_id == user_uuid)
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    c.active = False
    db.commit()
    return {"ok": True}


# ── Queue ────────────────────────────────────────────────────────────────────

@router.get("/competitors/{competitor_id}/reviews")
def api_competitor_reviews(competitor_id: str, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    comp = db.execute(
        select(Competitor).where(Competitor.id == uuid.UUID(competitor_id), Competitor.user_id == user_uuid)
    ).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Not found")
        
    snapshots = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp.id)
        .order_by(ReviewSnapshot.snapshot_at.desc())
    ).scalars().all()
    
    # keep only latest per platform
    latest_snapshots = {}
    for snap in snapshots:
        if snap.platform not in latest_snapshots:
            latest_snapshots[snap.platform] = {
                "platform": snap.platform,
                "avg_rating": snap.avg_rating,
                "total_reviews": snap.total_reviews,
                "complaint_count": snap.complaint_count,
                "top_complaints": _json.loads(snap.top_complaints) if snap.top_complaints else [],
                "snapshot_at": snap.snapshot_at.isoformat() if snap.snapshot_at else None
            }
            
    recent_complaints = db.execute(
        select(Review)
        .where(Review.competitor_id == comp.id, Review.is_complaint == True)
        .order_by(Review.published_at.desc())
        .limit(10)
    ).scalars().all()
    
    return {
        "snapshots": list(latest_snapshots.values()),
        "recent_complaints": [
            {
                "platform": r.platform,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "published_at": r.published_at.isoformat() if r.published_at else None
            }
            for r in recent_complaints
        ]
    }


@router.get("/queue")
def api_queue(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    rows = db.execute(
        select(ApprovedAction, ChangeEvent, Competitor)
        .join(ChangeEvent, ApprovedAction.change_event_id == ChangeEvent.id)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(ApprovedAction.user_id == user_uuid)
        .where(ApprovedAction.approved_at.is_(None))
        .order_by(ApprovedAction.created_at.desc())
    ).all()
    return {
        "actions": [
            {
                "id": str(a.id),
                "action_type": a.action_type,
                "original_draft": a.original_draft,
                "edited_text": a.edited_text,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "change_event": {
                    "id": str(e.id),
                    "brief_text": e.brief_text,
                    "change_type": e.change_type,
                    "detected_at": e.detected_at.isoformat() if e.detected_at else None,
                },
                "competitor": {"id": str(c.id), "name": c.name, "url": c.url},
            }
            for a, e, c in rows
        ]
    }


@router.post("/queue/{action_id}/approve")
def api_approve_action(action_id: str, payload: dict = None, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    action = db.execute(
        select(ApprovedAction).where(ApprovedAction.id == uuid.UUID(action_id), ApprovedAction.user_id == user_uuid)
    ).scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Not found")
    action.approved_at = datetime.now(timezone.utc)
    if payload and payload.get("edited_text") is not None:
        action.edited_text = payload["edited_text"]
    db.commit()
    return {"ok": True}


# ── Trends ───────────────────────────────────────────────────────────────────

@router.get("/trends")
def api_trends(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    from datetime import timedelta

    user_uuid = uuid.UUID(user_id)
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid)
    ).scalars().all()

    rows = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .order_by(ChangeEvent.detected_at.asc())
    ).all()

    now = datetime.now(timezone.utc)
    weeks = []
    for i in range(11, -1, -1):
        dt = now - timedelta(weeks=i)
        iso = dt.isocalendar()
        weeks.append(f"{iso.year}-W{iso.week:02d}")

    comp_data = []
    for comp in competitors:
        counts = []
        for week_label in weeks:
            count = sum(
                1 for e, c in rows
                if str(c.id) == str(comp.id) and e.week_label == week_label
            )
            counts.append(count)
        comp_data.append({"id": str(comp.id), "name": comp.name, "url": comp.url, "counts": counts})

    return {"weeks": weeks, "competitors": comp_data}


# ── Settings ─────────────────────────────────────────────────────────────────

@router.get("/settings")
def api_settings(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "subscription_status": user.subscription_status,
        "trial_ends_at": user.trial_ends_at.isoformat() if user.trial_ends_at else None,
        "stripe_customer_id": user.stripe_customer_id,
    }


# ── Scan ─────────────────────────────────────────────────────────────────────

@router.post("/scan/now")
async def api_scan_now(user_id: str = Depends(require_api_user)):
    from app.routes.scan import _run_scan_background
    import asyncio
    asyncio.create_task(_run_scan_background(user_id))
    return {"ok": True, "message": "Scan started"}


@router.post("/scan/reviews")
async def api_scan_reviews(user_id: str = Depends(require_api_user)):
    from app.pipeline.review_scraper import scrape_competitor_reviews
    from app.db import SessionLocal
    import asyncio
    
    async def _run_review_scan(uid: str):
        db = SessionLocal()
        try:
            user_uuid = uuid.UUID(uid)
            competitors = db.execute(
                select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
            ).scalars().all()
            for comp in competitors:
                try:
                    await scrape_competitor_reviews(str(comp.id), comp.url, db)
                except Exception:
                    pass
        finally:
            db.close()
            
    asyncio.create_task(_run_review_scan(user_id))
    return {"ok": True, "message": "Review scan started"}


# ── Billing ───────────────────────────────────────────────────────────────────

@router.get("/billing/checkout-url")
async def api_billing_checkout_url(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    from app.billing import create_checkout_session
    from app.config import FRONTEND_URL
    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    url = await create_checkout_session(
        user.email,
        str(user.id),
        success_url=f"{FRONTEND_URL}/billing/success",
        cancel_url=f"{FRONTEND_URL}/settings",
    )
    return {"url": url}


@router.get("/billing/portal-url")
async def api_billing_portal_url(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    from app.billing import create_portal_session
    from app.config import FRONTEND_URL
    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user or not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    url = await create_portal_session(user.stripe_customer_id, return_url=f"{FRONTEND_URL}/settings")
    return {"url": url}
