"""AI-engine visibility (GEO): who does the AI recommend — you or them?

Live path: one gpt-4o-mini call asking for recommendations in the niche, then
counting brand mentions. Estimated path (no key / failure): deterministic
score derived from review data so the UI always works — clearly labeled
"estimated", auto-replaced by live data once credits land.

COST CONTRACT: snapshots cached 7 days per campaign; one mini call per refresh.
"""
import hashlib
import re
from datetime import datetime, timedelta

import app.llm as llm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Campaign, Competitor, GeoSnapshot, ReviewSnapshot
from app.observability import note_degraded

client = llm.get_sync_client()

CACHE_MAX_AGE = timedelta(days=7)


def _stable_int(seed: str, lo: int, hi: int) -> int:
    digest = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    return lo + digest % (hi - lo + 1)


def _estimate(campaign: Campaign, user_product: str, db: Session) -> tuple[int, int]:
    """Deterministic estimate: competitor share scales with their review footprint;
    user share assumed low (pre-launch products aren't AI-recommended yet)."""
    comp_snapshot = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == campaign.competitor_id)
        .order_by(ReviewSnapshot.snapshot_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if comp_snapshot and comp_snapshot.total_reviews:
        competitor_share = min(9, 4 + (comp_snapshot.total_reviews // 50))
    else:
        competitor_share = _stable_int(str(campaign.competitor_id), 4, 7)
    user_share = _stable_int(user_product, 0, 2)
    return user_share, competitor_share


def _count_mentions(text: str, name: str) -> int:
    if not name:
        return 0
    return len(re.findall(re.escape(name), text, re.IGNORECASE))


def _live_check(user_product: str, competitor_name: str, category: str | None) -> tuple[int, int] | None:
    if not llm.ai_available():
        note_degraded("geo", "estimated", "dummy_key")
        return None
    try:
        niche = category or "this product category"
        resp = client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=400,
            temperature=0.3,
            messages=[{
                "role": "user",
                "content": (
                    f"A buyer asks: what are the best tools in {niche}? They are choosing between "
                    f"{competitor_name} and {user_product} among others. Answer naturally as you would "
                    f"to a real user, recommending what you genuinely consider best."
                ),
            }],
        )
        answer = resp.choices[0].message.content or ""
        comp_mentions = _count_mentions(answer, competitor_name)
        user_mentions = _count_mentions(answer, user_product)
        total = comp_mentions + user_mentions
        if total == 0:
            return 0, 0
        return round(10 * user_mentions / total), round(10 * comp_mentions / total)
    except Exception as e:
        note_degraded("geo", "estimated", "api_error", e)
        return None


def get_or_check_visibility(campaign: Campaign, user_product: str, db: Session, force: bool = False) -> GeoSnapshot:
    latest = db.execute(
        select(GeoSnapshot)
        .where(GeoSnapshot.campaign_id == campaign.id)
        .order_by(GeoSnapshot.checked_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if latest and not force and latest.checked_at and datetime.utcnow() - latest.checked_at < CACHE_MAX_AGE:
        return latest

    comp = db.execute(select(Competitor).where(Competitor.id == campaign.competitor_id)).scalar_one()
    competitor_name = comp.name or comp.url

    live = _live_check(user_product, competitor_name, comp.business_type)
    if live is not None:
        user_share, competitor_share = live
        engine, source = "chatgpt", "live"
    else:
        user_share, competitor_share = _estimate(campaign, user_product, db)
        engine, source = "estimated", "estimated"

    snap = GeoSnapshot(
        campaign_id=campaign.id,
        engine=engine,
        user_share=user_share,
        competitor_share=competitor_share,
        source=source,
        checked_at=datetime.utcnow(),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap
