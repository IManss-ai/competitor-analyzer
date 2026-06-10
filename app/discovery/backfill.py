from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import App, Competitor
from app.discovery.normalize import normalize_url, slugify


def unique_slug(db: Session, base: str) -> str:
    slug = base
    n = 2
    while db.execute(select(App.id).where(App.slug == slug)).scalar_one_or_none():
        slug = f"{base}-{n}"
        n += 1
    return slug


def get_or_create_app(db: Session, url: str, name: str | None = None,
                      source: str = "user_tracked", scan_tier: str = "full") -> tuple[App, bool]:
    """Find an App by normalized URL or create it. Returns (app, created)."""
    norm = normalize_url(url)
    existing = db.execute(select(App).where(App.url == norm)).scalar_one_or_none()
    if existing:
        return existing, False
    display = name or norm.split("/")[0].split(".")[0]
    app = App(
        url=norm,
        slug=unique_slug(db, slugify(display)),
        name=display,
        source=source,
        scan_tier=scan_tier,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app, True


def backfill_apps_for_competitors(db: Session) -> int:
    """Create/link an App for every competitor without one. Idempotent.
    Returns the number of Apps created."""
    created_count = 0
    unlinked = db.execute(select(Competitor).where(Competitor.app_id == None)).scalars().all()  # noqa: E711
    for comp in unlinked:
        app, created = get_or_create_app(db, comp.url, name=comp.name)
        comp.app_id = app.id
        if created:
            created_count += 1
    db.commit()
    return created_count
