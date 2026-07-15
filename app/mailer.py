import httpx
from app.config import RESEND_API_KEY, FROM_EMAIL, APP_BASE_URL

RESEND_API = "https://api.resend.com/emails"


def _play_to_text(play) -> str | None:
    """Coerce a playbook item to a display string for the email.

    Playbook items are usually plain strings, but the AI generation path can
    emit `{type,text}` / `{title,detail}` objects (see the battle-card field
    shapes gotcha). Without this the email would render a raw dict."""
    if isinstance(play, str):
        return play.strip() or None
    if isinstance(play, dict):
        for key in ("text", "detail", "title", "action"):
            val = play.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        # Salvage an unknown-key dict by its longest non-empty string value rather
        # than rendering a blank talking point (mirrors battlecard._item_text).
        vals = [v.strip() for v in play.values() if isinstance(v, str) and v.strip()]
        if vals:
            return max(vals, key=len)
    return None

async def send_weekly_brief(
    user_email: str,
    user_id: str,
    change_summaries: list[dict],
    pending_action_count: int,
) -> bool:
    import uuid
    from datetime import datetime, timezone, timedelta
    from app.db import SessionLocal
    from app.models import Competitor, Review
    from app.routes.battlecard import get_or_generate_battlecard
    from sqlalchemy import select, func

    db = SessionLocal()
    try:
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        except ValueError:
            user_uuid = None
            
        # 1. Date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=7)
        date_range_str = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
        
        if user_uuid:
            # 2. Competitors tracked
            competitors_tracked = db.execute(
                select(func.count(Competitor.id)).where(Competitor.user_id == user_uuid, Competitor.active == True)
            ).scalar() or 0
            
            # 3. New reviews this week
            new_reviews = db.execute(
                select(func.count(Review.id))
                .join(Competitor, Review.competitor_id == Competitor.id)
                .where(Competitor.user_id == user_uuid)
                .where(Review.fetched_at >= start_date)
            ).scalar() or 0
            
            # Get active competitors for this user
            competitors = db.execute(
                select(Competitor).where(Competitor.user_id == user_uuid, Competitor.active == True)
            ).scalars().all()
        else:
            competitors_tracked = 0
            new_reviews = 0
            competitors = []
            
        # 4. Group change summaries by competitor
        grouped_changes = {}
        for item in change_summaries:
            comp_name = item.get("competitor_name") or item.get("url") or "Unknown"
            grouped_changes.setdefault(comp_name, []).append(item)
            
        competitor_updates = []
        
        for comp in competitors:
            comp_name = comp.name or comp.url
            changes_list = grouped_changes.get(comp_name, [])
            if not changes_list and comp.url in grouped_changes:
                changes_list = grouped_changes[comp.url]
                
            # Only include if has changes
            if changes_list:
                # Fetch key talking point (first play from the battle card).
                # Cache-first helper — a paid model call only if no fresh AI card
                # exists yet. (The old code called the FastAPI route function with
                # the wrong signature, so this always threw and stayed blank.)
                # NOTE: uses allow_ai=True, so callers must only brief full-access
                # users — the scheduler gates on access_level == "full" before
                # dispatch (app/scheduler.py). Any new caller must do the same or
                # pass allow_ai=not is_read_only(user) to avoid a paid-gen leak.
                try:
                    battlecard = get_or_generate_battlecard(comp, db)
                    talking_points = battlecard.get("talking_points", [])
                    key_talking_point = _play_to_text(talking_points[0]) if talking_points else None
                except Exception:
                    key_talking_point = None
                    
                competitor_updates.append({
                    "name": comp_name,
                    "url": comp.url,
                    "favicon": f"https://www.google.com/s2/favicons?domain={comp.url.split('://')[-1].split('/')[0]}&sz=32" if comp.url else None,
                    "changes": [c.get("brief_text") or "Updated website" for c in changes_list],
                    "key_talking_point": key_talking_point,
                    "detail_url": f"{APP_BASE_URL}/competitors/{comp.id}"
                })
                
        # Subject line
        changes_detected = len(change_summaries)
        subject = f"🎯 {changes_detected} competitor changes this week: your battle cards are ready"
        
        # Fallback text email body
        text_body_lines = [
            "Weekly Intel Report",
            f"Date Range: {date_range_str}",
            f"{competitors_tracked} competitors tracked, {changes_detected} changes detected, {new_reviews} new reviews.",
            ""
        ]
        if not competitor_updates:
            text_body_lines.append("All quiet this week. Your competitors made no significant changes. We'll keep watching.")
        else:
            for up in competitor_updates:
                text_body_lines.append(f"## {up['name']}")
                for ch in up["changes"]:
                    text_body_lines.append(f"- {ch}")
                if up["key_talking_point"]:
                    text_body_lines.append(f"Key Talking Point: {up['key_talking_point']}")
                text_body_lines.append(f"View Full Battle Card: {up['detail_url']}")
                text_body_lines.append("")
                
        text_body = "\n".join(text_body_lines)
    finally:
        db.close()

    import os
    from jinja2 import Environment, FileSystemLoader
    html_body = ""
    try:
        templates_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates")
        env = Environment(loader=FileSystemLoader(templates_dir))
        template = env.get_template("email_brief.html")
        html_body = template.render(
            date_range=date_range_str,
            competitors_tracked=competitors_tracked,
            changes_detected=changes_detected,
            new_reviews=new_reviews,
            competitor_updates=competitor_updates,
            app_base_url=APP_BASE_URL,
        )
    except Exception as e:
        print(f"Failed to render HTML email brief: {e}")


    if not RESEND_API_KEY or "dummy" in RESEND_API_KEY.lower():
        print(f"\n--- [LOCAL DEV EMAIL] Battle Card → {user_email}\nSubject: {subject}\n{text_body}\n---\n")
        return True

    try:
        payload = {
            "from": f"Rivalscope <{FROM_EMAIL}>",
            "to": [user_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            payload["html"] = html_body

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_API,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
            return resp.status_code in (200, 201)
    except Exception:
        return False
