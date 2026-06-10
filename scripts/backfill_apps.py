"""One-off: link every existing competitor to an App row. Safe to rerun.
Usage: ./venv/bin/python scripts/backfill_apps.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.discovery.backfill import backfill_apps_for_competitors

db = SessionLocal()
try:
    created = backfill_apps_for_competitors(db)
    print(f"backfill complete: {created} apps created")
finally:
    db.close()
