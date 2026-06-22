import uuid as _uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import ActionPlan, ActionPlanItem, Campaign, ChangeEvent, Competitor
from app.planner.engine import get_or_generate_plan
from app.geo.visibility import get_or_check_visibility
from app.routes.api_v1 import require_api_user
from app.serialization import iso_utc

router = APIRouter(prefix="/api/v1", tags=["campaigns"])

VALID_ITEM_STATUSES = {"pending", "done", "dismissed"}


def _own_campaign(campaign_id: str, user_id: str, db: Session) -> Campaign:
    try:
        cid = _uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign id")
    campaign = db.execute(select(Campaign).where(Campaign.id == cid)).scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if str(campaign.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your campaign")
    return campaign


@router.post("/campaigns")
def create_campaign(
    payload: dict = Body(...),
    db: Session = Depends(get_session),
    user_id: str = Depends(require_api_user),
):
    try:
        comp_uuid = _uuid.UUID(str(payload.get("competitor_id", "")))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor id")
    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    if str(comp.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your competitor")

    existing = db.execute(
        select(Campaign).where(Campaign.user_id == comp.user_id, Campaign.competitor_id == comp.id)
    ).scalar_one_or_none()
    if existing:
        if payload.get("user_product") and not existing.user_product:
            existing.user_product = str(payload["user_product"])[:120]
            db.commit()
        return {"id": str(existing.id), "name": existing.name, "created": False}

    campaign = Campaign(
        user_id=comp.user_id,
        competitor_id=comp.id,
        name=f"Beat {comp.name or comp.url}",
        user_product=str(payload.get("user_product", ""))[:120] or None,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"id": str(campaign.id), "name": campaign.name, "created": True}


@router.get("/campaigns")
def list_campaigns(db: Session = Depends(get_session), user_id: str = Depends(require_api_user)):
    rows = db.execute(
        select(Campaign, Competitor)
        .join(Competitor, Campaign.competitor_id == Competitor.id)
        .where(Campaign.user_id == _uuid.UUID(user_id), Campaign.status == "active")
        .order_by(Campaign.created_at.desc())
    ).all()
    campaigns = []
    for campaign, comp in rows:
        latest_plan = db.execute(
            select(ActionPlan)
            .where(ActionPlan.campaign_id == campaign.id)
            .order_by(ActionPlan.generated_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        campaigns.append({
            "id": str(campaign.id),
            "name": campaign.name,
            "competitor_name": comp.name or comp.url,
            "competitor_url": comp.url,
            "last_plan_at": iso_utc(latest_plan.generated_at) if latest_plan else None,
            "created_at": iso_utc(campaign.created_at),
        })
    return {"campaigns": campaigns}


@router.get("/campaigns/{campaign_id}")
def get_war_room(
    campaign_id: str,
    db: Session = Depends(get_session),
    user_id: str = Depends(require_api_user),
):
    campaign = _own_campaign(campaign_id, user_id, db)
    comp = db.execute(select(Competitor).where(Competitor.id == campaign.competitor_id)).scalar_one()

    plan = get_or_generate_plan(campaign, db)
    items = db.execute(
        select(ActionPlanItem).where(ActionPlanItem.plan_id == plan.id).order_by(ActionPlanItem.rank)
    ).scalars().all()

    geo = get_or_check_visibility(campaign, campaign.user_product or "your product", db)

    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    events = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == comp.id, ChangeEvent.detected_at >= ninety_days_ago)
        .order_by(ChangeEvent.detected_at.desc())
        .limit(20)
    ).scalars().all()

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "user_product": campaign.user_product,
        "competitor": {"id": str(comp.id), "name": comp.name or comp.url, "url": comp.url},
        "plan": {
            "id": str(plan.id),
            "executive_read": plan.executive_read,
            "ai_generated": plan.ai_generated,
            "generated_at": iso_utc(plan.generated_at),
            "trigger_summary": plan.trigger_summary,
            "items": [
                {
                    "id": str(i.id),
                    "rank": i.rank,
                    "title": i.title,
                    "body": i.body,
                    "category": i.category,
                    "status": i.status,
                }
                for i in items
            ],
        },
        "geo": {
            "engine": geo.engine,
            "user_share": geo.user_share,
            "competitor_share": geo.competitor_share,
            "source": geo.source,
            "checked_at": iso_utc(geo.checked_at),
        },
        "events": [
            {
                "detected_at": iso_utc(e.detected_at),
                "change_type": e.change_type,
                "brief_text": e.brief_text,
            }
            for e in events
        ],
    }


@router.post("/campaigns/{campaign_id}/regenerate")
def regenerate_plan(
    campaign_id: str,
    db: Session = Depends(get_session),
    user_id: str = Depends(require_api_user),
):
    campaign = _own_campaign(campaign_id, user_id, db)
    plan = get_or_generate_plan(campaign, db, force=True)
    return {"plan_id": str(plan.id), "generated_at": iso_utc(plan.generated_at)}


@router.post("/plan-items/{item_id}/status")
def set_item_status(
    item_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_session),
    user_id: str = Depends(require_api_user),
):
    status = payload.get("status")
    if status not in VALID_ITEM_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_ITEM_STATUSES)}")
    try:
        iid = _uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item id")
    item = db.execute(select(ActionPlanItem).where(ActionPlanItem.id == iid)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    plan = db.execute(select(ActionPlan).where(ActionPlan.id == item.plan_id)).scalar_one()
    campaign = db.execute(select(Campaign).where(Campaign.id == plan.campaign_id)).scalar_one()
    if str(campaign.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your plan")
    item.status = status
    db.commit()
    return {"id": str(item.id), "status": item.status}
