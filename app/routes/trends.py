from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func
from app.db import get_session
from app.models import ChangeEvent, Competitor, ApprovedAction, Snapshot
from app.session import require_current_user
from datetime import datetime, timezone, timedelta
import uuid
import json

router = APIRouter()
templates = Jinja2Templates(directory="templates")


def _iso_week_label(dt: datetime) -> str:
    """Return e.g. '2026-W22' for a datetime."""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _week_start(year: int, week: int) -> datetime:
    """Return the Monday date for the given ISO year/week."""
    return datetime.fromisocalendar(year, week, 1)


@router.get("/trends", response_class=HTMLResponse)
async def trends_page(
    request: Request,
    db=Depends(get_session),
    user_id=Depends(require_current_user),
):
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

    # ── All competitors for this user ────────────────────────────────
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid)
    ).scalars().all()

    # ── All change events joined to competitor ────────────────────────
    rows = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user_uuid)
        .order_by(ChangeEvent.detected_at.asc())
    ).all()

    # ── Build 12-week window (last 12 ISO weeks) ──────────────────────
    now = datetime.now(timezone.utc)
    weeks = []
    for i in range(11, -1, -1):
        dt = now - timedelta(weeks=i)
        iso = dt.isocalendar()
        weeks.append((iso.year, iso.week, _iso_week_label(dt)))
    week_labels = [w[2] for w in weeks]          # ["2026-W11", …, "2026-W22"]
    week_set = {(w[0], w[1]) for w in weeks}

    # ── Per-week total event counts ───────────────────────────────────
    weekly_totals = {label: 0 for label in week_labels}
    for event, competitor in rows:
        iso = event.detected_at.isocalendar()
        key = (iso.year, iso.week)
        label = f"{key[0]}-W{key[1]:02d}"
        if label in weekly_totals:
            weekly_totals[label] += 1

    # ── Per-competitor breakdown: type → count ────────────────────────
    CHANGE_TYPES = ["pricing_change", "feature_add", "repositioning", "minor_copy", "no_change"]

    competitor_breakdown = {}   # {competitor_id: {type: count, "name": str, "total": int}}
    for comp in competitors:
        competitor_breakdown[str(comp.id)] = {
            "name": comp.name or comp.url,
            "url": comp.url,
            "total": 0,
            **{t: 0 for t in CHANGE_TYPES},
        }

    for event, competitor in rows:
        cid = str(competitor.id)
        if cid in competitor_breakdown:
            ct = event.change_type or "no_change"
            if ct in CHANGE_TYPES:
                competitor_breakdown[cid][ct] += 1
            competitor_breakdown[cid]["total"] += 1

    # ── Heatmap: competitor × week ────────────────────────────────────
    # {competitor_id: {week_label: count}}
    heatmap: dict[str, dict[str, int]] = {}
    for comp in competitors:
        heatmap[str(comp.id)] = {label: 0 for label in week_labels}

    for event, competitor in rows:
        iso = event.detected_at.isocalendar()
        label = f"{iso.year}-W{iso.week:02d}"
        cid = str(competitor.id)
        if label in week_labels and cid in heatmap:
            heatmap[cid][label] += 1

    # ── Pending actions count (for sidebar badge) ─────────────────────
    pending_count = db.execute(
        select(func.count(ApprovedAction.id))
        .where(ApprovedAction.user_id == user_uuid)
        .where(ApprovedAction.approved_at == None)
    ).scalar() or 0

    # ── Most active competitor ────────────────────────────────────────
    most_active = max(
        competitor_breakdown.values(),
        key=lambda c: c["total"],
        default=None,
    ) if competitor_breakdown else None

    # ── Total events ──────────────────────────────────────────────────
    total_events = sum(d["total"] for d in competitor_breakdown.values())

    # ── Significant changes (pricing/feature/repositioning) ──────────
    sig_types = {"pricing_change", "feature_add", "repositioning"}
    significant_count = sum(
        1 for event, _ in rows
        if (event.change_type or "") in sig_types
    )

    return templates.TemplateResponse("trends.html", {
        "request": request,
        "pending_count": pending_count,
        "competitors": competitors,
        "week_labels_json": json.dumps(week_labels),
        "weekly_totals_json": json.dumps([weekly_totals[l] for l in week_labels]),
        "competitor_breakdown_json": json.dumps(competitor_breakdown),
        "heatmap_json": json.dumps(heatmap),
        "total_events": total_events,
        "significant_count": significant_count,
        "most_active": most_active,
        "has_data": len(rows) > 0,
    })
