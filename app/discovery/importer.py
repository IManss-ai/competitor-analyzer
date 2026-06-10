from sqlalchemy.orm import Session

from app.discovery.backfill import get_or_create_app


def import_seed_entries(db: Session, entries: list[dict]) -> int:
    """Import curated seed entries: [{url, name?, category?}]. Idempotent by
    normalized URL; never touches existing apps. Returns number created."""
    created_count = 0
    for entry in entries:
        url = (entry.get("url") or "").strip()
        if not url:
            continue
        app, created = get_or_create_app(
            db, url, name=entry.get("name"), source="seed", scan_tier="cheap",
        )
        if created:
            if entry.get("category"):
                app.category = entry["category"]
            created_count += 1
    db.commit()
    return created_count
