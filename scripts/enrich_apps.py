"""Enrich the public /apps catalog (tagline/description/category/pricing/tech).

Usage:
  ./venv/bin/python scripts/enrich_apps.py             # enrich hollow/stale apps
  ./venv/bin/python scripts/enrich_apps.py --force     # re-enrich every app
  ./venv/bin/python scripts/enrich_apps.py --slug X    # single app (debug)
  ./venv/bin/python scripts/enrich_apps.py --dry-run   # fetch + extract, print, NO writes

Safe to rerun: enriched rows fall out of the hollowness selector, App fields are
overwritten in place, AppPricing/AppTech are replaced only when new rows are in
hand. Batch capped by SEED_SCAN_DAILY_LIMIT (default 500).

HARD GUARDS (data honesty — the catalog is a public marketing surface):
- refuses to run when SCRAPER_URL is unset/'dummy' (mock fetcher fabricates
  fake $19/$49 pricing)
- refuses to run without a real DEEPSEEK key (llm.ai_available()), which would
  silently produce tech-only rows
"""
import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.llm as llm
from app.config import SCRAPER_URL
from app.db import SessionLocal
from app.discovery.scanner import (
    cheap_scan_app,
    extract_profile,
    select_apps_for_scan,
)
from app.discovery.tech_detect import detect_technologies
from app.pipeline.fetcher import fetch_raw_page


def _abort_if_unsafe() -> None:
    problems = []
    if (not SCRAPER_URL) or SCRAPER_URL == "dummy":
        problems.append(
            "SCRAPER_URL is unset/'dummy' — the mock fetcher fabricates fake pricing; "
            "run this only where the Playwright sidecar is reachable (prod container: "
            "SCRAPER_URL=http://localhost:3001)."
        )
    if not llm.ai_available():
        problems.append(
            "DEEPSEEK_API_KEY is missing/dummy (llm.ai_available() is False) — enrichment "
            "would silently degrade to tech-only rows. Set a real key first."
        )
    if problems:
        print("ABORT: refusing to enrich the public catalog:")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)


async def _dry_run_app(app) -> None:
    page_url = app.url if app.url.startswith("http") else f"https://{app.url}"
    markdown, html, err = await fetch_raw_page(page_url)
    if err:
        print(f"[dry-run] {app.slug}: FETCH FAILED: {err}")
        return
    techs = [t["technology"] for t in detect_technologies(html)]
    profile = await extract_profile(markdown) if len(markdown) >= 200 else None
    print(f"[dry-run] {app.slug}: markdown={len(markdown)} chars, tech={techs}")
    print(json.dumps(profile, indent=2) if profile else "  (no profile parsed)")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true",
                        help="re-enrich every app, not just hollow/stale ones (still capped)")
    parser.add_argument("--slug", help="enrich a single app by slug")
    parser.add_argument("--dry-run", action="store_true",
                        help="fetch + extract and print the profile JSON; write nothing")
    args = parser.parse_args()

    _abort_if_unsafe()

    from sqlalchemy import select as sa_select
    from app.models import App

    db = SessionLocal()
    try:
        if args.slug:
            app_row = db.execute(sa_select(App).where(App.slug == args.slug)).scalar_one_or_none()
            if not app_row:
                print(f"ABORT: no app with slug '{args.slug}'")
                sys.exit(1)
            batch = [app_row]
        elif args.force:
            limit = int(os.getenv("SEED_SCAN_DAILY_LIMIT", "500"))
            batch = list(db.execute(sa_select(App).order_by(App.created_at).limit(limit)).scalars().all())
        else:
            batch = select_apps_for_scan(db)

        print(f"enriching {len(batch)} apps (cap: SEED_SCAN_DAILY_LIMIT"
              f"{', dry-run' if args.dry_run else ''})")

        scanned = enriched = degraded = failed = 0
        for app_row in batch:
            scanned += 1
            if args.dry_run:
                await _dry_run_app(app_row)
                continue
            ok = await cheap_scan_app(app_row, db)
            if ok:
                enriched += 1
            elif app_row.scan_status == "scan_degraded":
                degraded += 1
            else:
                failed += 1
            print(f"  [{scanned}/{len(batch)}] {app_row.slug}: {app_row.scan_status}"
                  f" tagline={'yes' if app_row.tagline else 'no'}")

        if args.dry_run:
            print(f"summary: scanned={scanned} (dry-run — nothing written)")
        else:
            print(f"summary: scanned={scanned} enriched={enriched} degraded={degraded} failed={failed}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
