import json
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.models import App, AppPricing, AppTech, ChangeEvent, Competitor

MAX_PAGE_SIZE = 50


def _text_predicate(db: Session, q: str):
    """Postgres: full-text via the generated search_vector column.
    SQLite (dev/tests): LIKE fallback over the same fields."""
    if db.get_bind().dialect.name == "postgresql":
        # Full-text (ranked, stemmed) OR a substring match on name/tagline so
        # mid-word type-ahead works: plainto_tsquery matches whole lexemes only,
        # so "head" would miss "Headspace". ILIKE covers the prefix/substring
        # case without feeding raw user syntax into to_tsquery (injection-safe).
        like = f"%{q.lower()}%"
        return or_(
            text("apps.search_vector @@ plainto_tsquery('english', :q)").bindparams(q=q),
            func.lower(App.name).like(like),
            func.lower(func.coalesce(App.tagline, "")).like(like),
        )
    like = f"%{q.lower()}%"
    return or_(
        func.lower(App.name).like(like),
        func.lower(func.coalesce(App.tagline, "")).like(like),
        func.lower(func.coalesce(App.description, "")).like(like),
        func.lower(func.coalesce(App.tags, "")).like(like),
    )


def app_facets(db: Session) -> dict:
    """Live facet counts for the /apps filter UI: category and technology
    values with app counts. Same visibility rule as search (scan_failed rows
    excluded). Cheap at catalog scale (<100 rows); computed live, no denorm."""
    visible = App.scan_status != "scan_failed"
    cat_rows = db.execute(
        select(App.category, func.count(App.id))
        .where(visible, App.category.isnot(None))
        .group_by(App.category)
        .order_by(func.count(App.id).desc(), App.category)
    ).all()
    tech_rows = db.execute(
        select(AppTech.technology, func.count(AppTech.app_id))
        .join(App, AppTech.app_id == App.id)
        .where(visible)
        .group_by(AppTech.technology)
        .order_by(func.count(AppTech.app_id).desc(), AppTech.technology)
    ).all()
    return {
        "categories": [{"value": r[0], "count": r[1]} for r in cat_rows],
        "tech": [{"value": r[0], "count": r[1]} for r in tech_rows],
    }


def search_apps(
    db: Session,
    q: str | None = None,
    category: str | None = None,
    max_price: float | None = None,
    tech: str | None = None,
    actively_shipping: bool = False,
    sort: str = "relevance",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """Faceted app search. Returns (result rows, total count)."""
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)

    stmt = select(App).where(App.scan_status != "scan_failed")
    if q:
        stmt = stmt.where(_text_predicate(db, q))
    if category:
        stmt = stmt.where(App.category == category.lower())
    if max_price is not None:
        stmt = stmt.where(
            select(AppPricing.id)
            .where(AppPricing.app_id == App.id, AppPricing.price != None, AppPricing.price <= max_price)  # noqa: E711
            .exists()
        )
    if tech:
        stmt = stmt.where(
            select(AppTech.id)
            .where(AppTech.app_id == App.id, AppTech.technology == tech.lower())
            .exists()
        )
    if actively_shipping:
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        change_count = (
            select(func.count(ChangeEvent.id))
            .join(Competitor, ChangeEvent.competitor_id == Competitor.id)
            .where(Competitor.app_id == App.id, ChangeEvent.detected_at >= ninety_days_ago)
            .scalar_subquery()
        )
        stmt = stmt.where(change_count >= 3)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    if sort == "newest":
        stmt = stmt.order_by(App.created_at.desc())
    else:
        # relevance/default: enriched profiles (tagline/category present) first —
        # bare rows auto-created by users tracking arbitrary URLs would otherwise
        # lead the public index purely because they were scanned most recently —
        # then most-recently-refreshed.
        enriched = or_(App.tagline.isnot(None), App.category.isnot(None))
        stmt = stmt.order_by(enriched.desc(), App.last_scanned_at.desc().nullslast(), App.created_at.desc())

    apps = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    if not apps:
        return [], total

    app_ids = [a.id for a in apps]
    prices: dict = {}
    for row in db.execute(
        select(AppPricing.app_id, func.min(AppPricing.price))
        .where(AppPricing.app_id.in_(app_ids), AppPricing.price != None)  # noqa: E711
        .group_by(AppPricing.app_id)
    ):
        prices[row[0]] = row[1]
    techs: dict = {}
    for row in db.execute(select(AppTech.app_id, AppTech.technology).where(AppTech.app_id.in_(app_ids))):
        techs.setdefault(row[0], []).append(row[1])

    results = [
        {
            "slug": a.slug,
            "name": a.name,
            "tagline": a.tagline,
            "category": a.category,
            "logo_url": a.logo_url,
            "price_from": prices.get(a.id),
            "tech": techs.get(a.id, []),
            "tags": json.loads(a.tags) if a.tags else [],
        }
        for a in apps
    ]
    return results, total
