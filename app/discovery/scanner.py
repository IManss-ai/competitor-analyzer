"""Cheap scan tier for seeded apps.

COST CONTRACT (do not violate — see docs/superpowers/specs/2026-06-10-discovery-engine-design.md):
- exactly ONE DeepSeek (llm.MODEL) call per app per refresh; NEVER a heavy model
- tech detection is regex-only (free)
- batch size capped by SEED_SCAN_DAILY_LIMIT
"""
import json
import os
from datetime import datetime

import app.llm as llm
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import App, AppPricing, AppTech
from app.observability import note_degraded
from app.pipeline.fetcher import fetch_page_text
from app.discovery.extractor import parse_profile_json
from app.discovery.tech_detect import detect_technologies

EXTRACT_PROMPT = """Extract a product profile from this web page text. Return ONLY valid JSON:
{"name": "product name", "tagline": "one-line value prop or null",
 "description": "2-3 sentence neutral description or null",
 "category": "one of: productivity|devtools|marketing|finance|ecommerce|analytics|ai|design|hr|support|education|health|other",
 "tags": ["up to 6 short lowercase tags"],
 "pricing_tiers": [{"tier_name": "...", "price": 29.0 or null, "period": "monthly|yearly|one_time|free", "features": ["..."]}]}
If a field is not present on the page, use null or []. No other text."""


def select_apps_for_scan(db: Session) -> list[App]:
    """Pending/stale cheap-tier apps, capped by SEED_SCAN_DAILY_LIMIT (default 500)."""
    limit = int(os.getenv("SEED_SCAN_DAILY_LIMIT", "500"))
    return list(db.execute(
        select(App)
        .where(App.scan_tier == "cheap", App.scan_status.in_(["pending", "scan_failed"]))
        .order_by(App.created_at)
        .limit(limit)
    ).scalars().all())


async def cheap_scan_app(app: App, db: Session) -> bool:
    """One scrape + one Haiku call -> profile, pricing, tech. Returns success."""
    page_url = app.url if app.url.startswith("http") else f"https://{app.url}"
    text, err = await fetch_page_text(page_url)
    if err or not text:
        app.scan_status = "scan_failed"
        app.last_scanned_at = datetime.utcnow()
        db.commit()
        return False

    # Tech detection first — free, works even if AI fails.
    db.execute(delete(AppTech).where(AppTech.app_id == app.id))
    for tech in detect_technologies(text):
        db.add(AppTech(app_id=app.id, **tech))

    profile = None
    if llm.ai_available():
        try:
            client = llm.get_async_client()
            resp = await client.chat.completions.create(
                model=llm.MODEL,
                max_tokens=800,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that extracts structured product profiles from web page text."},
                    {"role": "user", "content": f"{EXTRACT_PROMPT}\n\nPage text:\n{text[:6000]}"},
                ],
                extra_body=llm.THINKING_OFF,
            )
            profile = parse_profile_json(resp.choices[0].message.content)
            if profile is None:
                note_degraded("discovery.scanner", "tech_only", "unparseable_ai_output")
        except Exception as e:
            note_degraded("discovery.scanner", "tech_only", "api_error", e)
    else:
        note_degraded("discovery.scanner", "tech_only", "dummy_key")

    if profile:
        app.name = profile["name"]
        app.tagline = profile["tagline"]
        app.description = profile["description"]
        app.category = profile["category"]
        app.tags = json.dumps(profile["tags"])
        db.execute(delete(AppPricing).where(AppPricing.app_id == app.id))
        for tier in profile["pricing_tiers"]:
            db.add(AppPricing(
                app_id=app.id,
                tier_name=tier["tier_name"],
                price=tier["price"],
                period=tier["period"],
                features=json.dumps(tier["features"]),
            ))

    app.scan_status = "ok"
    app.last_scanned_at = datetime.utcnow()
    if app.first_scanned_at is None:
        app.first_scanned_at = app.last_scanned_at
    db.commit()
    return True
