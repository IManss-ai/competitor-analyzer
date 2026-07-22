import asyncio
import uuid
from datetime import datetime, timezone
from app.models import Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.observability import note_degraded
from app.pipeline.fetcher import fetch_page_text, extract_main_content, is_structured_markdown
from app.pipeline.differ import is_meaningful_change
from app.pipeline.classifier import classify_change
from app.pipeline.synthesizer import synthesize_brief, summarize_competitor_profile
from app.pipeline.action_generator import generate_actions_for_change
from sqlalchemy import select

def get_week_label(dt: datetime) -> str:
    # ISO year, not calendar year (%Y): around New Year they differ, and every
    # reader builds comparison labels from isocalendar() (trends, api_v1).
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _make_initial_event(db, competitor, snapshot, net_char_delta: int, brief: str):
    """Create the 'initial_scan' intel event for a competitor that has none yet.
    There is no prior snapshot to diff against, so before/after both reference the
    new snapshot (satisfies the NOT NULL FK without a schema migration)."""
    event = ChangeEvent(
        competitor_id=competitor.id,
        snapshot_before_id=snapshot.id,
        snapshot_after_id=snapshot.id,
        net_char_delta=net_char_delta,
        change_type="initial_scan",
        brief_text=brief,
        week_label=get_week_label(datetime.now(timezone.utc)),
    )
    db.add(event)
    db.flush()
    return event

async def scan_competitor(competitor_id: str, db) -> dict:
    """
    Fetch current page, compare to last snapshot, store new snapshot.
    Returns summary dict: {competitor_id, url, change_detected, net_delta, error}
    """
    comp_uuid = uuid.UUID(competitor_id) if isinstance(competitor_id, str) else competitor_id
    competitor = db.get(Competitor, comp_uuid)
    if not competitor or not competitor.active:
        return {"competitor_id": competitor_id, "skipped": True}

    # Get existing snapshot count
    from sqlalchemy import func
    snapshot_count = db.execute(
        select(func.count(Snapshot.id)).where(Snapshot.competitor_id == competitor.id)
    ).scalar() or 0

    # Fetch current content
    raw_text, error = await fetch_page_text(competitor.url, snapshot_count=snapshot_count)
    main_content = extract_main_content(raw_text) if not error else ""
    char_count = len(main_content)

    # Save new snapshot
    new_snapshot = Snapshot(
        competitor_id=competitor.id,
        raw_text=main_content,
        char_count=char_count,
        fetch_error=error,
    )
    db.add(new_snapshot)
    db.flush()

    # Does this competitor already have any intel events? Drives whether we still
    # owe them an initial profile — covers the first scan, scrape failures, and
    # competitors added before initial profiles existed (backfilled on next scan).
    existing_event_count = db.execute(
        select(func.count(ChangeEvent.id)).where(ChangeEvent.competitor_id == competitor.id)
    ).scalar() or 0

    if error:
        # Couldn't read the page. The first time, still surface a "now tracking" entry
        # so the Intel Feed isn't silently empty after the user adds the competitor.
        if existing_event_count == 0:
            _make_initial_event(
                db, competitor, new_snapshot, net_char_delta=0,
                brief=(
                    f"Now tracking {competitor.name or competitor.url}. We couldn't fully read "
                    f"their page on the first pass. We'll keep retrying and surface pricing, "
                    f"feature, and review changes here as they appear."
                ),
            )
        db.commit()
        return {
            "competitor_id": str(competitor.id),
            "url": competitor.url,
            "error": error,
            "first_scan": existing_event_count == 0,
        }

    # Get previous snapshot for diffing. Error/empty snapshots are NOT valid
    # baselines: after a transient fetch failure the next good scan would diff
    # the full page against '' and fabricate a full-page ChangeEvent (plus the
    # paid classifier/synthesizer/action calls behind it).
    prev_snapshot = (
        db.execute(
            select(Snapshot)
            .where(Snapshot.competitor_id == competitor.id)
            .where(Snapshot.id != new_snapshot.id)
            .where(Snapshot.fetch_error.is_(None))
            .where(Snapshot.raw_text != "")
            .order_by(Snapshot.fetched_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )

    # is_meaningful_change runs a CPU-bound difflib pass; a pathological page
    # (LLM run-on) could block the event loop for seconds, so offload it.
    if prev_snapshot and (
        is_structured_markdown(prev_snapshot.raw_text) != is_structured_markdown(main_content)
    ):
        # Serialization flip: one side is sidecar structured markdown, the
        # other is direct-HTTP prose (sidecar blip) — same page, different
        # serializer. Diffing across the flip reads as a phantom full-page
        # change, so treat this scan as a baseline reset instead.
        note_degraded("scanner", "baseline_reset", "serialization_flip")
        changed, delta = False, 0
    elif prev_snapshot:
        changed, delta = await asyncio.to_thread(
            is_meaningful_change, prev_snapshot.raw_text, main_content
        )
    else:
        changed, delta = False, char_count

    if prev_snapshot and changed:
        event = ChangeEvent(
            competitor_id=competitor.id,
            snapshot_before_id=prev_snapshot.id,
            snapshot_after_id=new_snapshot.id,
            net_char_delta=delta,
            week_label=get_week_label(datetime.now(timezone.utc)),
        )
        db.add(event)
        db.flush()

        change_type = await classify_change(prev_snapshot.raw_text, main_content)
        event.change_type = change_type

        if change_type not in ("minor_copy", "no_change"):
            brief = await synthesize_brief(
                competitor_name=competitor.name,
                competitor_url=competitor.url,
                text_before=prev_snapshot.raw_text,
                text_after=main_content,
                change_type=change_type,
            )
            event.brief_text = brief

            if brief:
                action_drafts = await generate_actions_for_change(
                    change_type=change_type,
                    competitor_name=competitor.name,
                    competitor_url=competitor.url,
                    brief_text=brief,
                )
                for action_type, draft_text in action_drafts:
                    action = ApprovedAction(
                        user_id=competitor.user_id,
                        change_event_id=event.id,
                        action_type=action_type,
                        original_draft=draft_text,
                        edited_text=None,
                        approved_at=None,
                    )
                    db.add(action)
    elif existing_event_count == 0:
        # No intel for this competitor yet (first scan, or one added before initial
        # profiles existed) and no meaningful diff to report — surface their CURRENT
        # profile so the Intel Feed shows real info immediately instead of sitting empty.
        brief = await summarize_competitor_profile(
            competitor_name=competitor.name,
            competitor_url=competitor.url,
            content=main_content,
        )
        _make_initial_event(db, competitor, new_snapshot, net_char_delta=char_count, brief=brief)

    db.commit()
    return {
        "competitor_id": str(competitor.id),
        "url": competitor.url,
        "change_detected": bool(prev_snapshot and changed),
        "net_delta": delta,
        "first_scan": not prev_snapshot,
    }

async def scan_user_competitors(user_id: str, db) -> list[dict]:
    """
    Scan all active competitors for a user. Called by weekly cron and on-demand scan.
    Skips failed competitors (appends error to result, continues others).
    """
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    competitors = db.execute(
        select(Competitor).where(
            Competitor.user_id == user_uuid,
            Competitor.active == True,
        )
    ).scalars().all()

    results = []
    for comp in competitors:
        result = await scan_competitor(str(comp.id), db)
        results.append(result)
    return results
