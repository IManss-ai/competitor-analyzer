import json
import uuid as _uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import App, AppPricing, AppTech, ChangeEvent, Competitor, ReviewSnapshot
from app.discovery.search import search_apps
from app.routes.api_v1 import require_api_user

router = APIRouter(prefix="/api/v1", tags=["discovery"])


def _optional_user(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


@router.get("/apps/search")
def api_search_apps(
    q: str | None = None,
    category: str | None = None,
    max_price: float | None = None,
    tech: str | None = None,
    actively_shipping: bool = False,
    sort: str = "relevance",
    page: int = 1,
    db: Session = Depends(get_session),
    authorization: str | None = Header(default=None),
):
    # Advanced sorting is a paid-tier hook: public gets relevance only.
    if sort != "relevance" and _optional_user(authorization) is None:
        raise HTTPException(status_code=401, detail="Sign in to use sorting")
    results, total = search_apps(
        db, q=q, category=category, max_price=max_price, tech=tech,
        actively_shipping=actively_shipping, sort=sort, page=page,
    )
    return {"results": results, "total": total, "page": page}


@router.get("/apps-sitemap")
def api_apps_sitemap(db: Session = Depends(get_session)):
    rows = db.execute(
        select(App.slug, App.last_scanned_at).where(App.scan_status != "scan_failed").order_by(App.created_at)
    ).all()
    return {"apps": [
        {"slug": r[0], "last_scanned_at": r[1].isoformat() if r[1] else None} for r in rows
    ]}


@router.get("/apps/{slug}")
def api_app_profile(slug: str, db: Session = Depends(get_session)):
    app_row = db.execute(select(App).where(App.slug == slug)).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="App not found")

    pricing = db.execute(
        select(AppPricing).where(AppPricing.app_id == app_row.id).order_by(AppPricing.price.asc().nullslast())
    ).scalars().all()
    tech = db.execute(select(AppTech).where(AppTech.app_id == app_row.id)).scalars().all()

    # Signals aggregated from linked competitors (any user tracking this app).
    comp_ids = [r[0] for r in db.execute(select(Competitor.id).where(Competitor.app_id == app_row.id))]
    review_summary = None
    change_velocity = 0
    if comp_ids:
        latest = db.execute(
            select(ReviewSnapshot)
            .where(ReviewSnapshot.competitor_id.in_(comp_ids))
            .order_by(ReviewSnapshot.snapshot_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        if latest and latest.avg_rating is not None:
            review_summary = {
                "avg_rating": latest.avg_rating,
                "total_reviews": latest.total_reviews,
                "platform": latest.platform,
            }
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        change_velocity = db.execute(
            select(func.count(ChangeEvent.id))
            .where(ChangeEvent.competitor_id.in_(comp_ids), ChangeEvent.detected_at >= ninety_days_ago)
        ).scalar_one()

    return {
        "slug": app_row.slug,
        "url": app_row.url,
        "name": app_row.name,
        "tagline": app_row.tagline,
        "description": app_row.description,
        "category": app_row.category,
        "tags": json.loads(app_row.tags) if app_row.tags else [],
        "logo_url": app_row.logo_url,
        "screenshot_url": app_row.screenshot_url,
        "last_scanned_at": app_row.last_scanned_at.isoformat() if app_row.last_scanned_at else None,
        "pricing": [
            {"tier_name": p.tier_name, "price": p.price, "currency": p.currency,
             "period": p.period, "features": json.loads(p.features) if p.features else []}
            for p in pricing
        ],
        "tech": [{"technology": t.technology, "tech_category": t.tech_category} for t in tech],
        "review_summary": review_summary,
        "change_velocity_90d": change_velocity,
    }


@router.post("/apps/{slug}/track")
def api_track_app(slug: str, db: Session = Depends(get_session), user_id: str = Depends(require_api_user)):
    app_row = db.execute(select(App).where(App.slug == slug)).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="App not found")

    user_uuid = _uuid.UUID(user_id)
    existing = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.app_id == app_row.id)
    ).scalar_one_or_none()
    if existing:
        return {"competitor_id": str(existing.id), "created": False}

    comp = Competitor(
        user_id=user_uuid,
        url=f"https://{app_row.url}",
        name=app_row.name,
        app_id=app_row.id,
    )
    db.add(comp)
    app_row.scan_tier = "full"  # promoted: a paying user now tracks it
    db.commit()
    db.refresh(comp)
    return {"competitor_id": str(comp.id), "created": True}
