"""Cheap scan tier for seeded apps.

COST CONTRACT (do not violate — see docs/superpowers/specs/2026-06-10-discovery-engine-design.md):
- exactly ONE DeepSeek (llm.MODEL) call per app per refresh; NEVER a heavy model
- tech detection is regex-only (free) and runs on the RAW rendered HTML
- batch size capped by SEED_SCAN_DAILY_LIMIT

DATA-HONESTY CONTRACT:
- fetch_raw_page has no mock branch: mock/dummy conditions error out instead of
  fabricating catalog data
- a curated (non-null) App.name is never overwritten by LLM output
- AppTech/AppPricing rows are only deleted when replacement rows are in hand
- a previously-'ok' app is never demoted to 'scan_failed' by a transient fetch
  failure (scan_failed hides rows from /apps/search + the sitemap)
"""
import json
import os
from datetime import datetime, timedelta

import app.llm as llm
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models import App, AppPricing, AppTech
from app.observability import note_degraded
from app.pipeline.fetcher import fetch_raw_page
from app.discovery.extractor import parse_profile_json
from app.discovery.tech_detect import detect_technologies

# Below this many chars of markdown the page is a JS shell / bot wall and the
# model would only hallucinate a profile — skip the call, mark degraded.
MIN_MARKDOWN_CHARS = 200

STALE_AFTER_DAYS = 30

EXTRACT_PROMPT = """Extract a product profile from this web page text. Return ONLY valid JSON:
{"name": "product name", "tagline": "one-line value prop or null",
 "description": "2-3 sentence neutral description or null",
 "category": "one of: productivity|devtools|marketing|finance|ecommerce|analytics|ai|design|hr|support|education|health|other",
 "tags": ["up to 6 short lowercase tags"],
 "pricing_tiers": [{"tier_name": "...", "price": 29.0 or null, "period": "monthly|yearly|one_time|free", "features": ["..."]}]}
tagline: the site's OWN one-line value proposition, max 120 characters, taken
from the page — do not invent marketing copy; null if the page has none.
pricing_tiers: include every visible tier; price = the numeric monthly amount,
null ONLY for custom/contact-us tiers; if pricing is usage-based, give the
cheapest advertised paid amount.
If a field is not present on the page, use null or []. No other text."""

# Bot walls / cookie banners leaking into a "tagline" (deterministic serializer
# won't save us from a CAPTCHA page). Lowercase substring match.
_GARBAGE_TAGLINE_MARKERS = (
    "captcha",
    "enable javascript",
    "javascript is disabled",
    "access denied",
    "access to this page has been denied",
    "verify you are a human",
    "verifying you are human",
    "are you a robot",
    "attention required",
    "we use cookies",
    "uses cookies",
    "accept cookies",
    "accept all cookies",
    "cookie settings",
    "cookie policy",
    "your privacy choices",
    "403 forbidden",
    "404 not found",
    "just a moment",
)


def is_garbage_tagline(tagline: str | None) -> bool:
    """Reject captcha/cookie-banner/bot-wall artifacts masquerading as taglines."""
    if not tagline:
        return False
    low = tagline.lower()
    return any(marker in low for marker in _GARBAGE_TAGLINE_MARKERS)


def select_apps_for_scan(db: Session) -> list[App]:
    """Apps needing enrichment, capped by SEED_SCAN_DAILY_LIMIT (default 500).

    Hollowness-based, across BOTH scan tiers (user-tracked 'full' apps deserve
    profiles too): unfinished scan states, missing tagline, no tech, or no
    pricing — plus a 30-day staleness refresh for fully-'ok' rows.
    """
    limit = int(os.getenv("SEED_SCAN_DAILY_LIMIT", "500"))
    stale_cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)
    has_tech = select(AppTech.id).where(AppTech.app_id == App.id).exists()
    has_pricing = select(AppPricing.id).where(AppPricing.app_id == App.id).exists()
    hollow_or_stale = or_(
        App.scan_status.in_(["pending", "scan_failed", "scan_degraded"]),
        App.tagline.is_(None),
        ~has_tech,
        ~has_pricing,
        App.last_scanned_at.is_(None),
        App.last_scanned_at < stale_cutoff,
    )
    return list(db.execute(
        select(App)
        .where(hollow_or_stale)
        .order_by(App.created_at)
        .limit(limit)
    ).scalars().all())


async def extract_profile(markdown: str) -> dict | None:
    """The single flash call: markdown -> parsed profile dict (or None).
    Shared by cheap_scan_app and scripts/enrich_apps.py --dry-run."""
    if not llm.ai_available():
        note_degraded("discovery.scanner", "tech_only", "dummy_key")
        return None
    try:
        client = llm.get_async_client()
        resp = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=800,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured product profiles from web page text."},
                {"role": "user", "content": f"{EXTRACT_PROMPT}\n\nPage text:\n{markdown[:6000]}"},
            ],
            extra_body=llm.THINKING_OFF,
        )
        profile = parse_profile_json(resp.choices[0].message.content)
        if profile is None:
            note_degraded("discovery.scanner", "tech_only", "unparseable_ai_output")
        return profile
    except Exception as e:
        note_degraded("discovery.scanner", "tech_only", "api_error", e)
        return None


async def cheap_scan_app(app: App, db: Session) -> bool:
    """One scrape + one flash call -> profile, pricing, tech. Returns success
    (True == scan_status ended 'ok')."""
    page_url = app.url if app.url.startswith("http") else f"https://{app.url}"
    markdown, html, err = await fetch_raw_page(page_url)
    if err or (not markdown and not html):
        if app.scan_status == "ok":
            # Never demote a previously-enriched app on a transient fetch
            # failure — scan_failed would hide it from /apps/search + sitemap.
            note_degraded("discovery.scanner", "kept_ok", "fetch_failed_previously_ok")
            return False
        app.scan_status = "scan_failed"
        app.last_scanned_at = datetime.utcnow()
        db.commit()
        return False

    # Tech detection — free, regex on RAW HTML (signatures don't survive
    # markdownification). Only replace existing rows when we have new ones.
    techs = detect_technologies(html)
    if techs:
        db.execute(delete(AppTech).where(AppTech.app_id == app.id))
        for tech in techs:
            db.add(AppTech(app_id=app.id, **tech))
    tech_found = bool(techs) or bool(db.execute(
        select(AppTech.id).where(AppTech.app_id == app.id).limit(1)
    ).first())

    profile = None
    if len(markdown) >= MIN_MARKDOWN_CHARS:
        profile = await extract_profile(markdown)
    else:
        note_degraded("discovery.scanner", "tech_only", "thin_page_markdown")

    if profile:
        # Never clobber a curated name with model output.
        if not app.name:
            app.name = profile["name"]
        tagline = profile["tagline"]
        if is_garbage_tagline(tagline):
            note_degraded("discovery.scanner", "tagline_rejected", "garbage_tagline")
            tagline = None
        if tagline is not None or app.tagline is None:
            app.tagline = tagline
        if profile["description"]:
            app.description = profile["description"]
        if profile["category"]:
            app.category = profile["category"]
        if profile["tags"]:
            app.tags = json.dumps(profile["tags"])
        # Only delete old pricing when replacement tiers are in hand.
        if profile["pricing_tiers"]:
            db.execute(delete(AppPricing).where(AppPricing.app_id == app.id))
            for tier in profile["pricing_tiers"]:
                db.add(AppPricing(
                    app_id=app.id,
                    tier_name=tier["tier_name"],
                    price=tier["price"],
                    period=tier["period"],
                    features=json.dumps(tier["features"]),
                ))

    # 'ok' only when we actually learned something (profile parsed OR tech in
    # hand); a hollow result stays re-selectable as 'scan_degraded'.
    app.scan_status = "ok" if (profile or tech_found) else "scan_degraded"
    app.last_scanned_at = datetime.utcnow()
    if app.first_scanned_at is None:
        app.first_scanned_at = app.last_scanned_at
    db.commit()
    return app.scan_status == "ok"
