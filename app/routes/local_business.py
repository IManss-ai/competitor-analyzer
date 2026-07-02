from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db import get_session, SessionLocal
from app.models import Competitor, SocialPost
from app.access import require_write_access
from app.routes.api_v1 import require_api_user
from app.serialization import iso_utc
import uuid
import asyncio

router = APIRouter(prefix="/api/v1/local", tags=["local-business"])


@router.patch("/competitors/{competitor_id}")
def update_local_competitor(
    competitor_id: str,
    payload: dict,
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session),
):
    """Update local business fields for a competitor."""
    user_uuid = uuid.UUID(user_id)
    comp = db.execute(
        select(Competitor).where(
            Competitor.id == uuid.UUID(competitor_id),
            Competitor.user_id == user_uuid,
        )
    ).scalar_one_or_none()

    if not comp:
        raise HTTPException(status_code=404, detail="Not found")

    # Update allowed fields
    if "google_maps_url" in payload:
        comp.google_maps_url = payload["google_maps_url"]
    if "instagram_handle" in payload:
        comp.instagram_handle = payload["instagram_handle"]
    if "facebook_page" in payload:
        comp.facebook_page = payload["facebook_page"]
    if "business_type" in payload:
        comp.business_type = payload["business_type"]

    db.commit()
    db.refresh(comp)

    return {
        "id": str(comp.id),
        "url": comp.url,
        "name": comp.name,
        "business_type": comp.business_type,
        "google_maps_url": comp.google_maps_url,
        "instagram_handle": comp.instagram_handle,
        "facebook_page": comp.facebook_page,
    }


@router.get("/competitors/{competitor_id}/social-posts")
def get_social_posts(
    competitor_id: str,
    user_id: str = Depends(require_api_user),
    db: Session = Depends(get_session),
):
    """Return last 20 SocialPost records for this competitor."""
    user_uuid = uuid.UUID(user_id)

    # Verify competitor belongs to user
    comp = db.execute(
        select(Competitor).where(
            Competitor.id == uuid.UUID(competitor_id),
            Competitor.user_id == user_uuid,
        )
    ).scalar_one_or_none()

    if not comp:
        raise HTTPException(status_code=404, detail="Not found")

    posts = db.execute(
        select(SocialPost)
        .where(SocialPost.competitor_id == comp.id)
        .order_by(SocialPost.posted_at.desc())
        .limit(20)
    ).scalars().all()

    return {
        "posts": [
            {
                "id": str(p.id),
                "platform": p.platform,
                "post_id": p.post_id,
                "content": p.content,
                "posted_at": iso_utc(p.posted_at),
                "fetched_at": iso_utc(p.fetched_at),
                "sentiment": p.sentiment,
                "engagement_hint": p.engagement_hint,
            }
            for p in posts
        ]
    }


async def _run_local_scan_background(competitor_id: str):
    """Background task: run Google Reviews + social scrape for one competitor."""
    from app.pipeline.google_reviews_scraper import scrape_google_reviews
    from app.pipeline.social_tracker import scrape_social_posts

    db = SessionLocal()
    try:
        comp = db.execute(
            select(Competitor).where(Competitor.id == uuid.UUID(competitor_id))
        ).scalar_one_or_none()

        if not comp:
            return

        if comp.google_maps_url:
            try:
                await scrape_google_reviews(str(comp.id), comp.google_maps_url, db)
            except Exception:
                pass

        if comp.instagram_handle or comp.facebook_page:
            try:
                await scrape_social_posts(
                    str(comp.id), comp.instagram_handle, comp.facebook_page, db
                )
            except Exception:
                pass
    except Exception as e:
        print(f"[background-local-scan] Exception: {e}")
    finally:
        db.close()


@router.post("/scan/{competitor_id}")
async def trigger_local_scan(
    competitor_id: str,
    user_id: str = Depends(require_write_access),
    db: Session = Depends(get_session),
):
    """Trigger an immediate Google Reviews + social scrape for one competitor."""
    user_uuid = uuid.UUID(user_id)

    # Verify competitor belongs to user
    comp = db.execute(
        select(Competitor).where(
            Competitor.id == uuid.UUID(competitor_id),
            Competitor.user_id == user_uuid,
        )
    ).scalar_one_or_none()

    if not comp:
        raise HTTPException(status_code=404, detail="Not found")

    asyncio.create_task(_run_local_scan_background(str(comp.id)))
    return {"ok": True, "message": "Local business scan started"}
