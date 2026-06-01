from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from app.db import SessionLocal
from app.models import User, Competitor, ChangeEvent, ApprovedAction
from app.pipeline.scanner import scan_user_competitors
from app.mailer import send_weekly_brief
from datetime import datetime, timezone

scheduler = AsyncIOScheduler()

async def run_weekly_scan_and_brief():
    """
    Runs every Monday at 8am UTC.
    For each active user with active/trialing subscription:
    1. Scan all competitors
    2. Gather this week's change events
    3. Send weekly brief email
    """
    db = SessionLocal()
    try:
        active_users = db.execute(
            select(User).where(
                User.subscription_status.in_(["trialing", "active"])
            )
        ).scalars().all()

        for user in active_users:
            try:
                # 1. Run competitor scans (saves snapshots, changes, and action drafts)
                await scan_user_competitors(str(user.id), db)

                # 2. Gather this week's change events
                week_label = datetime.now(timezone.utc).strftime("%Y-W%V")
                events = db.execute(
                    select(ChangeEvent, Competitor)
                    .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
                    .where(Competitor.user_id == user.id)
                    .where(ChangeEvent.week_label == week_label)
                ).all()

                change_summaries = [
                    {
                        "competitor_name": comp.name,
                        "url": comp.url,
                        "change_type": event.change_type,
                        "brief_text": event.brief_text,
                    }
                    for event, comp in events
                ]

                # 3. Count pending actions
                pending_count = db.query(ApprovedAction).filter(
                    ApprovedAction.user_id == user.id,
                    ApprovedAction.approved_at == None,
                ).count()

                # 4. Send brief
                await send_weekly_brief(
                    user_email=user.email,
                    user_id=str(user.id),
                    change_summaries=change_summaries,
                    pending_action_count=pending_count,
                )
            except Exception:
                pass  # Skip individual failures to prevent blocking other users
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(
        run_weekly_scan_and_brief,
        CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="UTC"),
        id="weekly_brief",
        replace_existing=True,
    )
    scheduler.start()
