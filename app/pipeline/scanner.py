import uuid
from datetime import datetime, timezone
from app.models import Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.pipeline.fetcher import fetch_page_text, extract_main_content
from app.pipeline.differ import is_meaningful_change
from app.pipeline.classifier import classify_change
from app.pipeline.synthesizer import synthesize_brief
from app.pipeline.action_generator import generate_actions_for_change
from sqlalchemy import select

def get_week_label(dt: datetime) -> str:
    return dt.strftime("%Y-W%V")

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

    if error:
        db.commit()
        return {"competitor_id": str(competitor.id), "url": competitor.url, "error": error}

    # Get previous snapshot for diffing
    prev_snapshot = (
        db.execute(
            select(Snapshot)
            .where(Snapshot.competitor_id == competitor.id)
            .where(Snapshot.id != new_snapshot.id)
            .order_by(Snapshot.fetched_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )

    if not prev_snapshot:
        db.commit()
        return {"competitor_id": str(competitor.id), "url": competitor.url, "first_scan": True}

    # Compute diff
    changed, delta = is_meaningful_change(prev_snapshot.raw_text, main_content)

    if changed:
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

    db.commit()
    return {
        "competitor_id": str(competitor.id),
        "url": competitor.url,
        "change_detected": changed,
        "net_delta": delta,
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
