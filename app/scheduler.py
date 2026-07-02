import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from app.db import SessionLocal
from app.models import User, Competitor, ChangeEvent, ApprovedAction
from app.pipeline.scanner import scan_user_competitors
from app.pipeline.review_scraper import scrape_competitor_reviews
from app.pipeline.google_reviews_scraper import scrape_google_reviews
from app.pipeline.social_tracker import scrape_social_posts
from app.pipeline.job_tracker import scrape_job_postings
from app.mailer import send_weekly_brief
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def _scan_and_brief_user(user, db):
    """Scan one user's competitors, gather this week's changes, and email the
    brief. Raises on failure — the per-user caller isolates and logs it."""
    # 1. Run competitor scans (saves snapshots, changes, and action drafts)
    await scan_user_competitors(str(user.id), db)

    # For each active competitor, scrape reviews / jobs / social as applicable
    competitors = db.execute(
        select(Competitor).where(Competitor.user_id == user.id, Competitor.active == True)
    ).scalars().all()
    for comp in competitors:
        try:
            await scrape_competitor_reviews(str(comp.id), comp.url, db)
        except Exception as e:
            logger.warning("scheduler: review scrape failed for competitor %s: %s", comp.id, e)

        if comp.business_type == "saas" and comp.careers_url:
            try:
                await scrape_job_postings(str(comp.id), comp.careers_url, db, comp.name or "")
            except Exception as e:
                logger.warning("scheduler: job scrape failed for competitor %s: %s", comp.id, e)

        # Only for local business competitors
        if comp.business_type == "local":
            if comp.google_maps_url:
                try:
                    await scrape_google_reviews(str(comp.id), comp.google_maps_url, db)
                except Exception as e:
                    logger.warning("scheduler: google reviews scrape failed for competitor %s: %s", comp.id, e)
            if comp.instagram_handle or comp.facebook_page:
                try:
                    await scrape_social_posts(str(comp.id), comp.instagram_handle, comp.facebook_page, db)
                except Exception as e:
                    logger.warning("scheduler: social scrape failed for competitor %s: %s", comp.id, e)

    # 2. Gather the last 7 days of change events — matches the date range the
    # email claims (mailer computes now-7d). week_label equality dropped
    # Tue-Sun on-demand scans: by Monday 8am they carry the previous ISO
    # week's label.
    since = datetime.now(timezone.utc) - timedelta(days=7)
    events = db.execute(
        select(ChangeEvent, Competitor)
        .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
        .where(Competitor.user_id == user.id)
        .where(ChangeEvent.detected_at >= since)
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


async def _run_scan_and_brief(label, *extra_filters):
    """Scan + brief every active/trialing user matching extra_filters. A failure
    for one user is logged and skipped so it never blocks the others."""
    db = SessionLocal()
    try:
        stmt = select(User).where(User.subscription_status.in_(["trialing", "active"]))
        for f in extra_filters:
            stmt = stmt.where(f)
        for user in db.execute(stmt).scalars().all():
            # Paywall: ongoing weekly monitoring is a paid feature — only scan
            # full-access users (active / comped / not-yet-tested).
            from app.access import access_level
            if access_level(user) != "full":
                continue
            try:
                await _scan_and_brief_user(user, db)
            except Exception as e:
                logger.warning("scheduler: %s run failed for user %s: %s", label, user.id, e)
    finally:
        db.close()


async def run_weekly_scan_and_brief():
    """Runs every Monday at 8am UTC for every active/trialing user."""
    await _run_scan_and_brief("weekly")


async def run_midweek_scan_and_brief():
    """Runs every Thursday at 8am UTC for active/trialing users on the biweekly schedule."""
    await _run_scan_and_brief("midweek", User.scan_schedule == "biweekly")


def start_scheduler():
    scheduler.add_job(
        run_weekly_scan_and_brief,
        CronTrigger(day_of_week="mon", hour=8, minute=0, timezone="UTC"),
        id="weekly_brief",
        replace_existing=True,
    )
    scheduler.add_job(
        run_midweek_scan_and_brief,
        CronTrigger(day_of_week="thu", hour=8, minute=0, timezone="UTC"),
        id="midweek_brief",
        replace_existing=True,
    )
    scheduler.start()

