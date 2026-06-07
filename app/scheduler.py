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
from app.mailer import send_weekly_brief
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

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
                
                # For each active competitor of this user, scrape reviews
                competitors = db.execute(select(Competitor).where(Competitor.user_id == user.id, Competitor.active == True)).scalars().all()
                for comp in competitors:
                    try:
                        await scrape_competitor_reviews(str(comp.id), comp.url, db)
                    except Exception as e:
                        logger.warning("scheduler: review scrape failed for competitor %s: %s", comp.id, e)

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


async def run_midweek_scan_and_brief():
    """
    Runs every Thursday at 8am UTC.
    For each active user with biweekly schedule and active/trialing subscription:
    1. Scan all competitors
    2. Gather this week's change events
    3. Send weekly brief email
    """
    db = SessionLocal()
    try:
        active_users = db.execute(
            select(User).where(
                User.subscription_status.in_(["trialing", "active"]),
                User.scan_schedule == "biweekly"
            )
        ).scalars().all()

        for user in active_users:
            try:
                # 1. Run competitor scans (saves snapshots, changes, and action drafts)
                await scan_user_competitors(str(user.id), db)
                
                # For each active competitor of this user, scrape reviews
                competitors = db.execute(select(Competitor).where(Competitor.user_id == user.id, Competitor.active == True)).scalars().all()
                for comp in competitors:
                    try:
                        await scrape_competitor_reviews(str(comp.id), comp.url, db)
                    except Exception as e:
                        logger.warning("scheduler: review scrape failed for competitor %s: %s", comp.id, e)

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
    scheduler.add_job(
        run_midweek_scan_and_brief,
        CronTrigger(day_of_week="thu", hour=8, minute=0, timezone="UTC"),
        id="midweek_brief",
        replace_existing=True,
    )
    scheduler.start()

