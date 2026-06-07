from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User, Competitor, ChangeEvent, Snapshot, ApprovedAction, ReviewSnapshot, Review
from app.auth import generate_session_token, verify_session_token, get_or_create_user, generate_magic_link_token, send_magic_link_email
import json as _json
from app.config import RESEND_API_KEY, FROM_EMAIL, APP_BASE_URL
from datetime import datetime, timezone, timedelta, date
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


@router.post("/auth/direct-login")
async def api_direct_login(payload: dict, db: Session = Depends(get_session)):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    
    if not email or not password:
        raise HTTPException(status_code=422, detail="Email and password required")
        
    from app.auth import hash_password, check_password
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Automatically create user (Instant Sign Up)
        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.password_hash is None:
            # Connect password for user who initially logged in via magic link
            user.password_hash = hash_password(password)
            db.commit()
        elif not check_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password for this email address.")
            
    session_token = generate_session_token(str(user.id), user.email)
    return {"ok": True, "session_token": session_token}


@router.post("/auth/google-login")
async def api_google_login(payload: dict, db: Session = Depends(get_session)):
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Google email is required")
        
    user = get_or_create_user(email, db)
    session_token = generate_session_token(str(user.id), user.email)
    return {"ok": True, "session_token": session_token}



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
        select(func.count(Competitor.id)).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalar() or 0

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    changes_this_week = db.execute(
        select(func.count(ChangeEvent.id))
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .where(ChangeEvent.detected_at >= seven_days_ago)
    ).scalar() or 0

    # Query latest ReviewSnapshot avg_rating per competitor and average them
    active_competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    
    ratings = []
    competitors_health = []
    
    if active_competitors:
        from sqlalchemy import and_
        comp_ids = [c.id for c in active_competitors]
        
        # 1. Latest Snapshot per competitor
        latest_fetched_sub = (
            select(Snapshot.competitor_id, func.max(Snapshot.fetched_at).label("max_fetched"))
            .where(Snapshot.competitor_id.in_(comp_ids))
            .group_by(Snapshot.competitor_id)
            .subquery()
        )
        latest_snaps = db.execute(
            select(Snapshot)
            .join(
                latest_fetched_sub,
                and_(
                    Snapshot.competitor_id == latest_fetched_sub.c.competitor_id,
                    Snapshot.fetched_at == latest_fetched_sub.c.max_fetched
                )
            )
        ).scalars().all()
        latest_snap_map = {snap.competitor_id: snap for snap in latest_snaps}
        
        # 2. Total change count per competitor
        change_counts = db.execute(
            select(ChangeEvent.competitor_id, func.count(ChangeEvent.id))
            .where(ChangeEvent.competitor_id.in_(comp_ids))
            .group_by(ChangeEvent.competitor_id)
        ).all()
        change_count_map = {comp_id: count for comp_id, count in change_counts}
        
        # 3. Latest ReviewSnapshot per competitor
        latest_review_sub = (
            select(ReviewSnapshot.competitor_id, func.max(ReviewSnapshot.snapshot_at).label("max_snap_at"))
            .where(ReviewSnapshot.competitor_id.in_(comp_ids))
            .group_by(ReviewSnapshot.competitor_id)
            .subquery()
        )
        latest_review_snaps = db.execute(
            select(ReviewSnapshot)
            .join(
                latest_review_sub,
                and_(
                    ReviewSnapshot.competitor_id == latest_review_sub.c.competitor_id,
                    ReviewSnapshot.snapshot_at == latest_review_sub.c.max_snap_at
                )
            )
        ).scalars().all()
        review_snap_map = {r.competitor_id: r for r in latest_review_snaps}
        
        # 4. Weekly change count trend
        now = datetime.now(timezone.utc)
        weeks = []
        for i in range(3, -1, -1):
            dt = now - timedelta(weeks=i)
            iso = dt.isocalendar()
            weeks.append(f"{iso.year}-W{iso.week:02d}")
            
        weekly_counts = db.execute(
            select(ChangeEvent.competitor_id, ChangeEvent.week_label, func.count(ChangeEvent.id))
            .where(ChangeEvent.competitor_id.in_(comp_ids))
            .where(ChangeEvent.week_label.in_(weeks))
            .group_by(ChangeEvent.competitor_id, ChangeEvent.week_label)
        ).all()
        
        trend_map = {comp_id: {w: 0 for w in weeks} for comp_id in comp_ids}
        for comp_id, week_label, count in weekly_counts:
            if comp_id in trend_map and week_label in trend_map[comp_id]:
                trend_map[comp_id][week_label] = count

        for c in active_competitors:
            last_snap = latest_snap_map.get(c.id)
            last_scanned = last_snap.fetched_at.isoformat() if last_snap else None
            
            total_changes = change_count_map.get(c.id, 0)
            
            latest_review_snap = review_snap_map.get(c.id)
            avg_rating = latest_review_snap.avg_rating if latest_review_snap else None
            if avg_rating is not None:
                ratings.append(avg_rating)
                
            trend = [trend_map[c.id][w] for w in weeks]
            
            # Status badge
            status = "Active"
            if last_snap:
                if last_snap.fetch_error:
                    status = "Error"
                elif total_changes == 0:
                    status = "No changes"
            else:
                status = "No changes"
                
            competitors_health.append({
                "id": str(c.id),
                "name": c.name or c.url,
                "url": c.url,
                "last_scanned": last_scanned,
                "total_changes": total_changes,
                "avg_rating": avg_rating,
                "trend": trend,
                "status": status
            })

    avg_review_score = sum(ratings) / len(ratings) if ratings else None

    return {
        "events": events,
        "pending_count": pending_count,
        "last_scan": last_scan.isoformat() if last_scan else None,
        "competitor_count": competitor_count,
        "changes_this_week": changes_this_week,
        "avg_review_score": avg_review_score,
        "competitors_health": competitors_health,
    }


@router.get("/dashboard/feed")
def api_dashboard_feed(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session)
):
    user_uuid = uuid.UUID(user_id)
    
    rows = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .order_by(ChangeEvent.detected_at.desc())
        .offset(offset)
        .limit(limit)
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
    
    return {"events": events}


@router.get("/dashboard/activity")
def api_dashboard_activity(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    today = datetime.now().date()
    start_date = today - timedelta(days=27)
    
    change_rows = db.execute(
        select(ChangeEvent.detected_at)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .where(ChangeEvent.detected_at >= datetime.combine(start_date, datetime.min.time()))
    ).scalars().all()
    
    scan_rows = db.execute(
        select(Snapshot.fetched_at)
        .join(Competitor, Snapshot.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .where(Snapshot.fetched_at >= datetime.combine(start_date, datetime.min.time()))
    ).scalars().all()
    
    change_counts = {}
    for dt in change_rows:
        if dt:
            date_str = dt.strftime("%Y-%m-%d")
            change_counts[date_str] = change_counts.get(date_str, 0) + 1
            
    scan_counts = {}
    for dt in scan_rows:
        if dt:
            date_str = dt.strftime("%Y-%m-%d")
            scan_counts[date_str] = scan_counts.get(date_str, 0) + 1
            
    days = []
    for i in range(28):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")
        days.append({
            "date": date_str,
            "change_count": change_counts.get(date_str, 0),
            "scan_count": scan_counts.get(date_str, 0)
        })
        
    return {"days": days}



# ── Competitors ──────────────────────────────────────────────────────────────

MAX_COMPETITORS = 7

@router.get("/competitors")
def api_list_competitors(include_inactive: bool = False, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    query = select(Competitor).where(Competitor.user_id == user_uuid)
    if not include_inactive:
        query = query.where(Competitor.active == True)
    rows = db.execute(query).scalars().all()
    active_rows = [c for c in rows if c.active]
    return {
        "competitors": [
            {
                "id": str(c.id),
                "url": c.url,
                "name": c.name,
                "active": c.active,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "business_type": c.business_type,
                "google_maps_url": c.google_maps_url,
                "instagram_handle": c.instagram_handle,
                "facebook_page": c.facebook_page,
            }
            for c in rows
        ],
        "at_limit": len(active_rows) >= MAX_COMPETITORS,
    }


@router.patch("/competitors/{competitor_id}")
def api_update_competitor(competitor_id: str, payload: dict, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    c = db.execute(
        select(Competitor).where(Competitor.id == uuid.UUID(competitor_id), Competitor.user_id == user_uuid)
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    if "active" in payload:
        c.active = payload["active"]
    if "name" in payload:
        c.name = payload["name"]
    if "url" in payload:
        c.url = payload["url"]
    db.commit()
    db.refresh(c)
    return {
        "id": str(c.id),
        "url": c.url,
        "name": c.name,
        "active": c.active,
    }


SCAN_JOBS = {}


async def _run_onboarding_scan(competitor_id: str, job_id: str):
    from app.db import SessionLocal
    from app.pipeline.scanner import scan_competitor
    from app.pipeline.review_scraper import scrape_competitor_reviews
    import asyncio
    
    # 1. Fetching page
    SCAN_JOBS[job_id] = "fetching"
    await asyncio.sleep(2)
    
    db = SessionLocal()
    try:
        # 2. Analyzing changes
        SCAN_JOBS[job_id] = "analyzing"
        
        # Run competitor scan
        res = await scan_competitor(competitor_id, db)
        
        # Also scan reviews
        comp = db.get(Competitor, uuid.UUID(competitor_id))
        if comp:
            try:
                await scrape_competitor_reviews(str(comp.id), comp.url, db)
            except Exception as e:
                print(f"[onboarding-scan] Review scan failed: {e}")
                
        if res.get("error"):
            SCAN_JOBS[job_id] = "error"
        else:
            SCAN_JOBS[job_id] = "done"
    except Exception as e:
        print(f"[onboarding-scan] Scan failed: {e}")
        SCAN_JOBS[job_id] = "error"
    finally:
        db.close()


@router.get("/scan/status/{job_id}")
def api_scan_status(job_id: str):
    status = SCAN_JOBS.get(job_id, "unknown")
    return {"status": status}


@router.post("/competitors")
def api_add_competitor(payload: dict, background_tasks: BackgroundTasks, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
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
    
    # Trigger background onboarding scan
    import uuid as _uuid
    job_id = str(_uuid.uuid4())
    SCAN_JOBS[job_id] = "fetching"
    background_tasks.add_task(_run_onboarding_scan, str(competitor.id), job_id)
    
    return {
        "id": str(competitor.id),
        "url": competitor.url,
        "name": competitor.name,
        "job_id": job_id
    }



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


@router.get("/competitors/{competitor_id}/detail")
def api_competitor_detail(competitor_id: str, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    try:
        comp_uuid = uuid.UUID(competitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor UUID")
        
    comp = db.execute(
        select(Competitor).where(Competitor.id == comp_uuid, Competitor.user_id == user_uuid)
    ).scalar_one_or_none()
    
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
        
    # Get change_events for this competitor (newest first)
    from sqlalchemy.orm import aliased
    SnapshotBefore = aliased(Snapshot)
    SnapshotAfter = aliased(Snapshot)
    
    change_rows = db.execute(
        select(ChangeEvent, SnapshotBefore.raw_text, SnapshotAfter.raw_text)
        .join(SnapshotBefore, ChangeEvent.snapshot_before_id == SnapshotBefore.id)
        .join(SnapshotAfter, ChangeEvent.snapshot_after_id == SnapshotAfter.id)
        .where(ChangeEvent.competitor_id == comp_uuid)
        .order_by(ChangeEvent.detected_at.desc())
    ).all()
    
    change_events = []
    for e, before_text, after_text in change_rows:
        change_events.append({
            "id": str(e.id),
            "detected_at": e.detected_at.isoformat() if e.detected_at else None,
            "change_type": e.change_type,
            "brief_text": e.brief_text,
            "week_label": e.week_label,
            "net_char_delta": e.net_char_delta,
            "before_text": before_text,
            "after_text": after_text,
        })
        
    # Get review snapshots
    rev_snaps = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp_uuid)
        .order_by(ReviewSnapshot.snapshot_at.desc())
    ).scalars().all()
    
    review_snapshots = [
        {
            "id": str(snap.id),
            "platform": snap.platform,
            "snapshot_at": snap.snapshot_at.isoformat() if snap.snapshot_at else None,
            "avg_rating": snap.avg_rating,
            "total_reviews": snap.total_reviews,
            "complaint_count": snap.complaint_count,
            "top_complaints": _json.loads(snap.top_complaints) if snap.top_complaints else [],
        }
        for snap in rev_snaps
    ]
    
    # Get scan history (Snapshots)
    snapshots = db.execute(
        select(Snapshot)
        .where(Snapshot.competitor_id == comp_uuid)
        .order_by(Snapshot.fetched_at.desc())
    ).scalars().all()
    
    snap_change_counts = {}
    for e, _, _ in change_rows:
        snap_change_counts[str(e.snapshot_after_id)] = snap_change_counts.get(str(e.snapshot_after_id), 0) + 1
        
    scan_history = [
        {
            "id": str(s.id),
            "fetched_at": s.fetched_at.isoformat() if s.fetched_at else None,
            "char_count": s.char_count,
            "status": "error" if s.fetch_error else "success",
            "fetch_error": s.fetch_error,
            "changes_detected": snap_change_counts.get(str(s.id), 0),
        }
        for s in snapshots
    ]
    
    # Get latest battle card
    from app.routes.battlecard import generate_battlecard
    try:
        battlecard_data = generate_battlecard(competitor_id, db)
    except Exception:
        battlecard_data = None

    return {
        "competitor": {
            "id": str(comp.id),
            "url": comp.url,
            "name": comp.name,
            "active": comp.active,
            "created_at": comp.created_at.isoformat() if comp.created_at else None,
            "business_type": comp.business_type,
            "google_maps_url": comp.google_maps_url,
            "instagram_handle": comp.instagram_handle,
            "facebook_page": comp.facebook_page,
        },
        "change_events": change_events,
        "review_snapshots": review_snapshots,
        "scan_history": scan_history,
        "battlecard": battlecard_data
    }



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


@router.get("/trends/metrics")
def api_trends_metrics(user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    from datetime import timedelta
    user_uuid = uuid.UUID(user_id)
    
    # Get active competitors
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
    ).scalars().all()
    
    # 1. Weekly changes per competitor (past 12 weeks)
    now = datetime.now(timezone.utc)
    weeks_12 = []
    for i in range(11, -1, -1):
        dt = now - timedelta(weeks=i)
        iso = dt.isocalendar()
        weeks_12.append(f"{iso.year}-W{iso.week:02d}")
        
    weekly_changes = []
    for comp in competitors:
        counts = []
        for week_label in weeks_12:
            count = db.execute(
                select(func.count(ChangeEvent.id))
                .where(ChangeEvent.competitor_id == comp.id, ChangeEvent.week_label == week_label)
            ).scalar() or 0
            counts.append(count)
        weekly_changes.append({
            "id": str(comp.id),
            "name": comp.name or comp.url,
            "url": comp.url,
            "counts": counts
        })
        
    # Sort competitors by total changes descending, and keep top 5
    weekly_changes_sorted = sorted(weekly_changes, key=lambda x: sum(x["counts"]), reverse=True)
    top_5_weekly_changes = weekly_changes_sorted[:5]
    
    # 2. Change type breakdown (past 8 weeks)
    weeks_8 = []
    for i in range(7, -1, -1):
        dt = now - timedelta(weeks=i)
        iso = dt.isocalendar()
        weeks_8.append(f"{iso.year}-W{iso.week:02d}")
        
    type_breakdown = []
    for week_label in weeks_8:
        pricing_count = db.execute(
            select(func.count(ChangeEvent.id))
            .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
            .where(Competitor.user_id == user_uuid)
            .where(ChangeEvent.week_label == week_label)
            .where(ChangeEvent.change_type == "pricing_change")
        ).scalar() or 0
        feature_count = db.execute(
            select(func.count(ChangeEvent.id))
            .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
            .where(Competitor.user_id == user_uuid)
            .where(ChangeEvent.week_label == week_label)
            .where(ChangeEvent.change_type == "new_feature")
        ).scalar() or 0
        positioning_count = db.execute(
            select(func.count(ChangeEvent.id))
            .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
            .where(Competitor.user_id == user_uuid)
            .where(ChangeEvent.week_label == week_label)
            .where(ChangeEvent.change_type == "positioning_shift")
        ).scalar() or 0
        copy_count = db.execute(
            select(func.count(ChangeEvent.id))
            .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
            .where(Competitor.user_id == user_uuid)
            .where(ChangeEvent.week_label == week_label)
            .where(ChangeEvent.change_type == "minor_copy")
        ).scalar() or 0
        
        type_breakdown.append({
            "week": week_label,
            "pricing_change": pricing_count,
            "new_feature": feature_count,
            "positioning_shift": positioning_count,
            "minor_copy": copy_count
        })
        
    # 3. Review score trends (per competitor per snapshot)
    review_trends = []
    for comp in competitors:
        snaps = db.execute(
            select(ReviewSnapshot)
            .where(ReviewSnapshot.competitor_id == comp.id)
            .order_by(ReviewSnapshot.snapshot_at.asc())
        ).scalars().all()
        
        if snaps:
            history = [
                {
                    "date": snap.snapshot_at.strftime("%Y-%m-%d") if snap.snapshot_at else None,
                    "avg_rating": snap.avg_rating
                }
                for snap in snaps
            ]
            review_trends.append({
                "id": str(comp.id),
                "name": comp.name or comp.url,
                "history": history
            })
            
    return {
        "weeks": weeks_12,
        "weekly_changes": top_5_weekly_changes,
        "type_breakdown": type_breakdown,
        "review_trends": review_trends
    }



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
        "business_type": getattr(user, "business_type", None) or "saas",
        "scan_schedule": getattr(user, "scan_schedule", None) or "weekly",
        "email_notifications": getattr(user, "email_notifications", True),
        "digest_email": getattr(user, "digest_email", None) or user.email,
    }


@router.patch("/settings")
def api_update_settings(payload: dict, user_id: str = Depends(require_api_user), db: Session = Depends(get_session)):
    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if "business_type" in payload:
        user.business_type = payload["business_type"]
    if "scan_schedule" in payload:
        user.scan_schedule = payload["scan_schedule"]
    if "email_notifications" in payload:
        user.email_notifications = payload["email_notifications"]
    if "digest_email" in payload:
        user.digest_email = payload["digest_email"]
    if "password" in payload and payload["password"]:
        from app.auth import hash_password
        user.password_hash = hash_password(payload["password"])
        
    db.commit()
    return {
        "id": str(user.id),
        "email": user.email,
        "subscription_status": user.subscription_status,
        "trial_ends_at": user.trial_ends_at.isoformat() if user.trial_ends_at else None,
        "business_type": getattr(user, "business_type", None) or "saas",
        "scan_schedule": getattr(user, "scan_schedule", None) or "weekly",
        "email_notifications": getattr(user, "email_notifications", True),
        "digest_email": getattr(user, "digest_email", None) or user.email,
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
async def api_billing_checkout_url(
    plan: str = "saas",
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session)
):
    from app.billing import create_checkout_session
    from app.config import FRONTEND_URL
    user_uuid = uuid.UUID(user_id)
    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    url = await create_checkout_session(
        user.email,
        str(user.id),
        plan_type=plan,
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
    if not user or not user.polar_customer_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    url = await create_portal_session(user.polar_customer_id, return_url=f"{FRONTEND_URL}/settings")
    return {"url": url}
