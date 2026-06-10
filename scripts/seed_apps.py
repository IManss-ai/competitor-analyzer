"""Seed the discovery database and run cheap scans.

Usage:
  ./venv/bin/python scripts/seed_apps.py            # import only
  ./venv/bin/python scripts/seed_apps.py --scan     # import + cheap-scan batch
Safe to rerun. Batch size capped by SEED_SCAN_DAILY_LIMIT.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.discovery.backfill import backfill_apps_for_competitors
from app.discovery.importer import import_seed_entries
from app.discovery.scanner import cheap_scan_app, select_apps_for_scan

SEED_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "seed", "curated.json")


async def main():
    db = SessionLocal()
    try:
        with open(SEED_FILE) as f:
            entries = json.load(f)
        created = import_seed_entries(db, entries)
        linked = backfill_apps_for_competitors(db)
        print(f"imported {created} seed apps; backfilled {linked} from competitors")

        if "--scan" in sys.argv:
            batch = select_apps_for_scan(db)
            print(f"scanning {len(batch)} apps (cap: SEED_SCAN_DAILY_LIMIT)")
            ok = 0
            for app in batch:
                ok += 1 if await cheap_scan_app(app, db) else 0
            print(f"scanned ok: {ok}/{len(batch)}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
