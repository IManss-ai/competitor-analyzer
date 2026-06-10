# Discovery Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A searchable public database of web apps (the "App" entity) with profile pages, a cheap-tier crawler, faceted search, and a "Track this app" funnel into the existing Rivalscope monitoring product.

**Architecture:** Additive layer on the existing FastAPI + SQLAlchemy backend and Next.js 14 frontend. New `apps`/`app_pricing`/`app_tech` tables plus a nullable `competitors.app_id` FK. A `app/discovery/` package owns normalization, extraction, tech detection, scanning, importing, and search. One new router `app/routes/discovery.py`. Frontend adds `/discover`, `/apps/[slug]`, and sitemap entries on the current v3 theme.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, unittest (NOT pytest — this repo uses `./venv/bin/python -m unittest`), httpx, anthropic (`claude-haiku-4-5` only — NO Sonnet anywhere in this plan), Next.js 14 App Router, Tailwind v4 with CSS-var tokens.

**Conventions you must follow:**
- Tests: unittest classes, in-memory SQLite via `StaticPool`, `app.dependency_overrides[get_session]`, exactly like `tests/test_battlecard_local.py`.
- Run tests: `./venv/bin/python -m unittest tests.test_<module> -v` (single file) or `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` (all).
- Every AI/scrape fallback calls `note_degraded(module, source, reason, exc)` from `app/observability.py`.
- Frontend: theme-aware CSS-var tokens only (`--text-*`, `--surface-*`, `--border-*`, `--accent-*`, `.rs-card`, `.rs-btn-primary`). NEVER hardcoded grays/`text-white`/dark hex. Read `DESIGN.md` before frontend tasks.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: URL normalization + slug utilities

**Files:**
- Create: `app/discovery/__init__.py` (empty)
- Create: `app/discovery/normalize.py`
- Test: `tests/test_discovery_normalize.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_normalize.py
import unittest
from app.discovery.normalize import normalize_url, slugify


class TestNormalizeUrl(unittest.TestCase):
    def test_strips_scheme_www_and_trailing_slash(self):
        self.assertEqual(normalize_url("https://www.Acme.io/"), "acme.io")

    def test_adds_missing_scheme_then_normalizes(self):
        self.assertEqual(normalize_url("acme.io"), "acme.io")

    def test_keeps_path_but_strips_query_and_fragment(self):
        self.assertEqual(normalize_url("http://acme.io/pricing/?ref=x#top"), "acme.io/pricing")

    def test_equivalent_urls_normalize_identically(self):
        variants = ["https://www.acme.io", "http://acme.io/", "acme.io"]
        self.assertEqual(len({normalize_url(v) for v in variants}), 1)


class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Acme App!"), "acme-app")

    def test_collapses_separators(self):
        self.assertEqual(slugify("a  --  b"), "a-b")

    def test_empty_falls_back(self):
        self.assertEqual(slugify("???"), "app")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_normalize -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.discovery'`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/normalize.py
import re
from urllib.parse import urlparse


def normalize_url(url: str) -> str:
    """Canonical form for dedup: lowercase host, no scheme/www/query/fragment,
    no trailing slash. 'https://www.Acme.io/' -> 'acme.io'."""
    url = (url or "").strip()
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "https://" + url
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parsed.path.rstrip("/")
    return f"{host}{path}"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug or "app"
```

Also create empty `app/discovery/__init__.py`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_normalize -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/__init__.py app/discovery/normalize.py tests/test_discovery_normalize.py
git commit -m "feat(discovery): URL normalization and slug utilities

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: App, AppPricing, AppTech models + competitors.app_id

**Files:**
- Modify: `app/models.py` (append after `BattleCardCache`, and add one column to `Competitor`)
- Test: `tests/test_discovery_models.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_discovery_models.py
import unittest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, AppPricing, AppTech, Competitor, User


class TestDiscoveryModels(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

    def test_app_with_pricing_and_tech(self):
        app = App(slug="acme", url="acme.io", name="Acme", category="productivity")
        self.db.add(app)
        self.db.commit()
        self.db.add_all([
            AppPricing(app_id=app.id, tier_name="Pro", price=29.0, period="monthly"),
            AppTech(app_id=app.id, technology="nextjs", tech_category="framework"),
        ])
        self.db.commit()
        loaded = self.db.execute(select(App).where(App.slug == "acme")).scalar_one()
        self.assertEqual(loaded.scan_tier, "cheap")
        self.assertEqual(loaded.scan_status, "pending")

    def test_competitor_links_to_app(self):
        user = User(email="m@example.com")
        app = App(slug="rival", url="rival.io", name="Rival")
        self.db.add_all([user, app])
        self.db.commit()
        comp = Competitor(user_id=user.id, url="https://rival.io", app_id=app.id)
        self.db.add(comp)
        self.db.commit()
        self.assertEqual(comp.app_id, app.id)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./venv/bin/python -m unittest tests.test_discovery_models -v`
Expected: FAIL with `ImportError: cannot import name 'App'`

- [ ] **Step 3: Add the models**

In `app/models.py`, add to the `Competitor` class (after `careers_url`):

```python
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=True, index=True)  # discovery App link
```

Append at the end of the file:

```python
class App(Base):
    """A web app that exists in the world, independent of any user. Discovery
    profiles, monitoring subscriptions (Competitor.app_id), and later verified
    revenue all hang off this entity."""
    __tablename__ = "apps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    slug = Column(String, unique=True, nullable=False, index=True)
    url = Column(String, unique=True, nullable=False, index=True)  # normalized (see app/discovery/normalize.py)
    name = Column(String, nullable=False)
    tagline = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True, index=True)
    tags = Column(Text, nullable=True)                 # JSON array of strings
    logo_url = Column(String, nullable=True)
    screenshot_url = Column(String, nullable=True)
    source = Column(String, default="seed")            # seed | user_tracked | submitted
    scan_tier = Column(String, default="cheap")        # cheap | full
    scan_status = Column(String, default="pending")    # pending | ok | scan_failed
    first_scanned_at = Column(DateTime, nullable=True)
    last_scanned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    # NOTE: search_vector (tsvector) is added Postgres-only in the Alembic
    # migration; it is intentionally NOT declared here so SQLite tests work.


class AppPricing(Base):
    __tablename__ = "app_pricing"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=False, index=True)
    tier_name = Column(String, nullable=False)
    price = Column(Float, nullable=True)               # null = custom/contact-us
    currency = Column(String, default="USD")
    period = Column(String, default="monthly")         # monthly | yearly | one_time | free
    features = Column(Text, nullable=True)             # JSON array of strings
    scraped_at = Column(DateTime, default=func.now())


class AppTech(Base):
    __tablename__ = "app_tech"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=False, index=True)
    technology = Column(String, nullable=False)        # canonical key: nextjs, stripe, intercom...
    tech_category = Column(String, nullable=True)      # framework | payments | analytics | support
    detected_at = Column(DateTime, default=func.now())
    __table_args__ = (Index("ix_app_tech_unique", "app_id", "technology", unique=True),)
```

- [ ] **Step 4: Run tests to verify they pass, plus the whole suite**

Run: `./venv/bin/python -m unittest tests.test_discovery_models -v` → PASS
Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → all PASS (existing tests must not break)

- [ ] **Step 5: Commit**

```bash
git add app/models.py tests/test_discovery_models.py
git commit -m "feat(discovery): App, AppPricing, AppTech models + competitors.app_id

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Alembic migration (schema + Postgres-only FTS)

**Files:**
- Create: `alembic/versions/<generated>_add_discovery_tables.py`

- [ ] **Step 1: Generate the migration**

Run: `./venv/bin/alembic revision --autogenerate -m "add_discovery_tables"`
Expected: a new file in `alembic/versions/`.

- [ ] **Step 2: Replace its body with a hand-cleaned version**

KNOWN GOTCHA: autogenerate on this repo's SQLite dev DB emits spurious `alter_column` NUMERIC→UUID noise for every existing table. Delete ALL of that. The final migration must contain ONLY:

```python
def upgrade() -> None:
    op.create_table(
        'apps',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('tagline', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('screenshot_url', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('scan_tier', sa.String(), nullable=True),
        sa.Column('scan_status', sa.String(), nullable=True),
        sa.Column('first_scanned_at', sa.DateTime(), nullable=True),
        sa.Column('last_scanned_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_apps_slug'), 'apps', ['slug'], unique=True)
    op.create_index(op.f('ix_apps_url'), 'apps', ['url'], unique=True)
    op.create_index(op.f('ix_apps_category'), 'apps', ['category'], unique=False)

    op.create_table(
        'app_pricing',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('app_id', sa.UUID(), nullable=False),
        sa.Column('tier_name', sa.String(), nullable=False),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('period', sa.String(), nullable=True),
        sa.Column('features', sa.Text(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_app_pricing_app_id'), 'app_pricing', ['app_id'], unique=False)

    op.create_table(
        'app_tech',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('app_id', sa.UUID(), nullable=False),
        sa.Column('technology', sa.String(), nullable=False),
        sa.Column('tech_category', sa.String(), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_app_tech_app_id'), 'app_tech', ['app_id'], unique=False)
    op.create_index('ix_app_tech_unique', 'app_tech', ['app_id', 'technology'], unique=True)

    with op.batch_alter_table('competitors') as batch_op:
        batch_op.add_column(sa.Column('app_id', sa.UUID(), nullable=True))
        batch_op.create_index(op.f('ix_competitors_app_id'), ['app_id'], unique=False)
        batch_op.create_foreign_key('fk_competitors_app_id', 'apps', ['app_id'], ['id'])

    # Postgres-only full-text search column + GIN index (production).
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "ALTER TABLE apps ADD COLUMN search_vector tsvector GENERATED ALWAYS AS "
            "(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(tagline,'') || ' ' "
            "|| coalesce(description,'') || ' ' || coalesce(tags,''))) STORED"
        )
        op.execute("CREATE INDEX ix_apps_search_vector ON apps USING GIN (search_vector)")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_apps_search_vector")
        op.execute("ALTER TABLE apps DROP COLUMN IF EXISTS search_vector")
    with op.batch_alter_table('competitors') as batch_op:
        batch_op.drop_constraint('fk_competitors_app_id', type_='foreignkey')
        batch_op.drop_index(op.f('ix_competitors_app_id'))
        batch_op.drop_column('app_id')
    op.drop_index('ix_app_tech_unique', table_name='app_tech')
    op.drop_index(op.f('ix_app_tech_app_id'), table_name='app_tech')
    op.drop_table('app_tech')
    op.drop_index(op.f('ix_app_pricing_app_id'), table_name='app_pricing')
    op.drop_table('app_pricing')
    op.drop_index(op.f('ix_apps_category'), table_name='apps')
    op.drop_index(op.f('ix_apps_url'), table_name='apps')
    op.drop_index(op.f('ix_apps_slug'), table_name='apps')
    op.drop_table('apps')
```

(`down_revision` must be `'82f2df6eaed1'` — verify with `./venv/bin/alembic heads` before editing.)

- [ ] **Step 3: Apply locally and verify**

Run: `./venv/bin/alembic upgrade head && ./venv/bin/alembic current`
Expected: new revision shown as `(head)`, no errors.
Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → all PASS

- [ ] **Step 4: Commit**

```bash
git add alembic/versions/*add_discovery_tables.py
git commit -m "feat(discovery): migration for apps/app_pricing/app_tech + competitors.app_id

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Backfill — link existing competitors to Apps

**Files:**
- Create: `app/discovery/backfill.py`
- Create: `scripts/backfill_apps.py`
- Test: `tests/test_discovery_backfill.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_discovery_backfill.py
import unittest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, Competitor, User
from app.discovery.backfill import backfill_apps_for_competitors


class TestBackfill(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="bf@example.com")
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _add_comp(self, url, name=None):
        comp = Competitor(user_id=self.user.id, url=url, name=name)
        self.db.add(comp)
        self.db.commit()
        return comp

    def test_creates_app_and_links_competitor(self):
        comp = self._add_comp("https://www.acme.io/", name="Acme")
        created = backfill_apps_for_competitors(self.db)
        self.assertEqual(created, 1)
        self.db.refresh(comp)
        app = self.db.execute(select(App)).scalar_one()
        self.assertEqual(comp.app_id, app.id)
        self.assertEqual(app.url, "acme.io")
        self.assertEqual(app.source, "user_tracked")
        self.assertEqual(app.scan_tier, "full")

    def test_same_url_two_users_share_one_app(self):
        self._add_comp("https://acme.io")
        self._add_comp("http://www.acme.io/")
        backfill_apps_for_competitors(self.db)
        apps = self.db.execute(select(App)).scalars().all()
        self.assertEqual(len(apps), 1)

    def test_idempotent(self):
        self._add_comp("https://acme.io", name="Acme")
        backfill_apps_for_competitors(self.db)
        created_again = backfill_apps_for_competitors(self.db)
        self.assertEqual(created_again, 0)

    def test_slug_collision_gets_suffix(self):
        self._add_comp("https://acme.io", name="Acme")
        self._add_comp("https://acme.dev", name="Acme")
        backfill_apps_for_competitors(self.db)
        slugs = sorted(a.slug for a in self.db.execute(select(App)).scalars().all())
        self.assertEqual(slugs[0], "acme")
        self.assertTrue(slugs[1].startswith("acme-"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./venv/bin/python -m unittest tests.test_discovery_backfill -v`
Expected: FAIL with `ModuleNotFoundError` for `app.discovery.backfill`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/backfill.py
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
```

```python
# scripts/backfill_apps.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_backfill -v` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/backfill.py scripts/backfill_apps.py tests/test_discovery_backfill.py
git commit -m "feat(discovery): backfill links existing competitors to App rows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Profile extraction normalizer

**Files:**
- Create: `app/discovery/extractor.py`
- Test: `tests/test_discovery_extractor.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_extractor.py
import json
import unittest
from app.discovery.extractor import parse_profile_json


class TestParseProfileJson(unittest.TestCase):
    def test_valid_payload(self):
        raw = json.dumps({
            "name": "Acme", "tagline": "Ship faster", "description": "A tool.",
            "category": "productivity", "tags": ["saas", "teams"],
            "pricing_tiers": [
                {"tier_name": "Pro", "price": 29, "period": "monthly", "features": ["a"]},
                {"tier_name": "Enterprise", "price": None, "period": "monthly", "features": []},
            ],
        })
        profile = parse_profile_json(raw)
        self.assertEqual(profile["name"], "Acme")
        self.assertEqual(len(profile["pricing_tiers"]), 2)
        self.assertIsNone(profile["pricing_tiers"][1]["price"])

    def test_fenced_json(self):
        raw = '```json\n{"name": "Acme", "tags": []}\n```'
        self.assertEqual(parse_profile_json(raw)["name"], "Acme")

    def test_partial_payload_fills_defaults(self):
        profile = parse_profile_json('{"name": "Acme"}')
        self.assertEqual(profile["tags"], [])
        self.assertEqual(profile["pricing_tiers"], [])
        self.assertIsNone(profile["category"])

    def test_garbage_returns_none(self):
        self.assertIsNone(parse_profile_json("I am not JSON at all"))

    def test_bad_tier_rows_are_dropped_not_fatal(self):
        raw = json.dumps({"name": "Acme", "pricing_tiers": [
            {"tier_name": "Pro", "price": "twenty"},     # unparseable price -> price None, kept
            "not-a-dict",                                  # dropped
            {"price": 5},                                  # no tier_name -> dropped
        ]})
        tiers = parse_profile_json(raw)["pricing_tiers"]
        self.assertEqual(len(tiers), 1)
        self.assertIsNone(tiers[0]["price"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_extractor -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/extractor.py
import json

_ALLOWED_PERIODS = {"monthly", "yearly", "one_time", "free"}


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif raw.startswith("```"):
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    return raw.strip()


def _clean_tier(tier) -> dict | None:
    if not isinstance(tier, dict) or not tier.get("tier_name"):
        return None
    price = tier.get("price")
    try:
        price = float(price) if price is not None else None
    except (TypeError, ValueError):
        price = None
    period = tier.get("period") if tier.get("period") in _ALLOWED_PERIODS else "monthly"
    features = tier.get("features") if isinstance(tier.get("features"), list) else []
    return {
        "tier_name": str(tier["tier_name"])[:80],
        "price": price,
        "period": period,
        "features": [str(f)[:200] for f in features][:12],
    }


def parse_profile_json(raw: str) -> dict | None:
    """Normalize the cheap-scan model output into a safe profile dict.
    Salvages partial payloads; returns None only if nothing parses."""
    try:
        data = json.loads(_strip_fences(raw))
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict) or not data.get("name"):
        return None
    tiers = data.get("pricing_tiers") if isinstance(data.get("pricing_tiers"), list) else []
    return {
        "name": str(data["name"])[:120],
        "tagline": str(data["tagline"])[:200] if data.get("tagline") else None,
        "description": str(data["description"])[:2000] if data.get("description") else None,
        "category": str(data["category"])[:60].lower() if data.get("category") else None,
        "tags": [str(t)[:40].lower() for t in data.get("tags", []) if isinstance(t, (str, int))][:10]
                if isinstance(data.get("tags"), list) else [],
        "pricing_tiers": [t for t in (_clean_tier(x) for x in tiers) if t][:8],
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_extractor -v` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/extractor.py tests/test_discovery_extractor.py
git commit -m "feat(discovery): profile extraction normalizer salvages partial AI output

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Tech-stack detection (zero AI)

**Files:**
- Create: `app/discovery/tech_detect.py`
- Test: `tests/test_discovery_tech_detect.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_tech_detect.py
import unittest
from app.discovery.tech_detect import detect_technologies

NEXT_STRIPE_HTML = """
<html><head>
<script src="/_next/static/chunks/main.js"></script>
<script src="https://js.stripe.com/v3/"></script>
<script>window.intercomSettings = {app_id: "abc"};</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
</head><body></body></html>
"""


class TestDetectTechnologies(unittest.TestCase):
    def test_detects_known_signatures(self):
        found = {t["technology"] for t in detect_technologies(NEXT_STRIPE_HTML)}
        self.assertIn("nextjs", found)
        self.assertIn("stripe", found)
        self.assertIn("intercom", found)
        self.assertIn("google-analytics", found)

    def test_each_result_has_category(self):
        for t in detect_technologies(NEXT_STRIPE_HTML):
            self.assertIn(t["tech_category"], {"framework", "payments", "analytics", "support", "marketing"})

    def test_empty_html(self):
        self.assertEqual(detect_technologies(""), [])

    def test_no_duplicates(self):
        html = NEXT_STRIPE_HTML + NEXT_STRIPE_HTML
        techs = [t["technology"] for t in detect_technologies(html)]
        self.assertEqual(len(techs), len(set(techs)))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_tech_detect -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/tech_detect.py
import re

# (technology, category, regex on raw HTML). Order = display order.
_SIGNATURES: list[tuple[str, str, str]] = [
    ("nextjs", "framework", r"/_next/static|__NEXT_DATA__"),
    ("react", "framework", r"react(-dom)?(\.production)?(\.min)?\.js|data-reactroot"),
    ("vue", "framework", r"vue(\.runtime)?(\.global)?(\.prod)?\.js|data-v-app"),
    ("angular", "framework", r"ng-version="),
    ("svelte", "framework", r"svelte-[a-z0-9]{6}"),
    ("webflow", "framework", r"assets\.website-files\.com"),
    ("wordpress", "framework", r"wp-content/|wp-includes/"),
    ("framer", "framework", r"framerusercontent\.com"),
    ("stripe", "payments", r"js\.stripe\.com|checkout\.stripe\.com"),
    ("paddle", "payments", r"cdn\.paddle\.com|paddle_button"),
    ("lemonsqueezy", "payments", r"lemonsqueezy\.com"),
    ("polar", "payments", r"polar\.sh"),
    ("google-analytics", "analytics", r"googletagmanager\.com/gtag|google-analytics\.com"),
    ("plausible", "analytics", r"plausible\.io/js"),
    ("posthog", "analytics", r"posthog\.com|posthog\.init"),
    ("mixpanel", "analytics", r"cdn\.mxpnl\.com|mixpanel\.init"),
    ("segment", "analytics", r"cdn\.segment\.com"),
    ("hotjar", "analytics", r"static\.hotjar\.com"),
    ("intercom", "support", r"intercomSettings|widget\.intercom\.io"),
    ("crisp", "support", r"client\.crisp\.chat"),
    ("zendesk", "support", r"static\.zdassets\.com"),
    ("hubspot", "marketing", r"js\.hs-scripts\.com|hubspot\.com"),
    ("mailchimp", "marketing", r"chimpstatic\.com|list-manage\.com"),
]


def detect_technologies(html: str) -> list[dict]:
    """Regex-signature tech detection from raw page HTML. Zero AI cost."""
    if not html:
        return []
    found = []
    seen = set()
    for tech, category, pattern in _SIGNATURES:
        if tech not in seen and re.search(pattern, html, re.IGNORECASE):
            seen.add(tech)
            found.append({"technology": tech, "tech_category": category})
    return found
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_tech_detect -v` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/tech_detect.py tests/test_discovery_tech_detect.py
git commit -m "feat(discovery): regex tech-stack detection, zero AI cost

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Cheap scanner (one Haiku call per app, hard guardrails)

**Files:**
- Create: `app/discovery/scanner.py`
- Test: `tests/test_discovery_scanner.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_scanner.py
import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, AppPricing, AppTech
from app.discovery.scanner import cheap_scan_app, select_apps_for_scan

PROFILE_JSON = json.dumps({
    "name": "Acme", "tagline": "Ship faster", "description": "A tool.",
    "category": "productivity", "tags": ["saas"],
    "pricing_tiers": [{"tier_name": "Pro", "price": 29, "period": "monthly", "features": []}],
})


class TestCheapScanner(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.app_row = App(slug="acme", url="acme.io", name="acme", scan_status="pending")
        self.db.add(self.app_row)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _mock_anthropic(self, text):
        client = MagicMock()
        msg = MagicMock()
        msg.content = [MagicMock(text=text)]
        client.messages.create = AsyncMock(return_value=msg)
        return client

    @patch("app.discovery.scanner.anthropic.AsyncAnthropic")
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_successful_scan_populates_profile(self, mock_fetch, mock_cls):
        mock_fetch.return_value = ("<html>js.stripe.com page text</html>", None)
        mock_cls.return_value = self._mock_anthropic(PROFILE_JSON)
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "real"}):
            ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        self.assertEqual(self.app_row.name, "Acme")
        self.assertEqual(self.app_row.tagline, "Ship faster")
        self.assertIsNotNone(self.app_row.last_scanned_at)
        tiers = self.db.execute(select(AppPricing)).scalars().all()
        self.assertEqual(len(tiers), 1)
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    @patch("app.discovery.scanner.anthropic.AsyncAnthropic")
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_uses_haiku_never_sonnet(self, mock_fetch, mock_cls):
        mock_fetch.return_value = ("page", None)
        client = self._mock_anthropic(PROFILE_JSON)
        mock_cls.return_value = client
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "real"}):
            await cheap_scan_app(self.app_row, self.db)
        model = client.messages.create.call_args.kwargs["model"]
        self.assertIn("haiku", model)
        self.assertNotIn("sonnet", model)

    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_fetch_failure_marks_scan_failed(self, mock_fetch):
        mock_fetch.return_value = ("", "boom")
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "real"}):
            ok = await cheap_scan_app(self.app_row, self.db)
        self.assertFalse(ok)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "scan_failed")

    @patch("app.discovery.scanner.anthropic.AsyncAnthropic")
    @patch("app.discovery.scanner.fetch_page_text", new_callable=AsyncMock)
    async def test_garbage_ai_output_still_records_tech(self, mock_fetch, mock_cls):
        mock_fetch.return_value = ("<script src='https://js.stripe.com/v3/'></script>", None)
        mock_cls.return_value = self._mock_anthropic("not json")
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "real"}):
            ok = await cheap_scan_app(self.app_row, self.db)
        self.assertTrue(ok)  # degraded but not failed
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_status, "ok")
        techs = {t.technology for t in self.db.execute(select(AppTech)).scalars().all()}
        self.assertIn("stripe", techs)

    def test_select_apps_for_scan_honors_daily_limit(self):
        for i in range(5):
            self.db.add(App(slug=f"a{i}", url=f"a{i}.io", name=f"a{i}", scan_status="pending"))
        self.db.commit()
        with patch.dict("os.environ", {"SEED_SCAN_DAILY_LIMIT": "3"}):
            batch = select_apps_for_scan(self.db)
        self.assertEqual(len(batch), 3)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_scanner -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/scanner.py
"""Cheap scan tier for seeded apps.

COST CONTRACT (do not violate — see docs/superpowers/specs/2026-06-10-discovery-engine-design.md):
- exactly ONE claude-haiku-4-5 call per app per refresh; NEVER Sonnet
- tech detection is regex-only (free)
- batch size capped by SEED_SCAN_DAILY_LIMIT
"""
import json
import os
from datetime import datetime

import anthropic
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
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key and api_key != "dummy_anthropic_key":
        try:
            client = anthropic.AsyncAnthropic(api_key=api_key)
            resp = await client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=800,
                messages=[{"role": "user", "content": f"{EXTRACT_PROMPT}\n\nPage text:\n{text[:6000]}"}],
            )
            profile = parse_profile_json(resp.content[0].text)
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
```

- [ ] **Step 4: Run tests to verify they pass, plus full suite**

Run: `./venv/bin/python -m unittest tests.test_discovery_scanner -v` → all PASS
Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/scanner.py tests/test_discovery_scanner.py
git commit -m "feat(discovery): cheap scan tier — one Haiku call per app, daily cap

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Seed importer + curated seed data + CLI

**Files:**
- Create: `app/discovery/importer.py`
- Create: `data/seed/curated.json`
- Create: `scripts/seed_apps.py`
- Test: `tests/test_discovery_importer.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_importer.py
import unittest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App
from app.discovery.importer import import_seed_entries

ENTRIES = [
    {"url": "https://www.acme.io/", "name": "Acme", "category": "productivity"},
    {"url": "https://tool.dev", "name": "Tool"},
]


class TestSeedImporter(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.db.close()

    def test_imports_entries_as_cheap_seed_apps(self):
        created = import_seed_entries(self.db, ENTRIES)
        self.assertEqual(created, 2)
        app = self.db.execute(select(App).where(App.slug == "acme")).scalar_one()
        self.assertEqual(app.url, "acme.io")
        self.assertEqual(app.source, "seed")
        self.assertEqual(app.scan_tier, "cheap")
        self.assertEqual(app.category, "productivity")

    def test_rerun_is_idempotent(self):
        import_seed_entries(self.db, ENTRIES)
        created_again = import_seed_entries(self.db, ENTRIES)
        self.assertEqual(created_again, 0)
        self.assertEqual(len(self.db.execute(select(App)).scalars().all()), 2)

    def test_existing_user_tracked_app_not_downgraded(self):
        self.db.add(App(slug="acme", url="acme.io", name="Acme",
                        source="user_tracked", scan_tier="full"))
        self.db.commit()
        import_seed_entries(self.db, ENTRIES)
        app = self.db.execute(select(App).where(App.url == "acme.io")).scalar_one()
        self.assertEqual(app.scan_tier, "full")
        self.assertEqual(app.source, "user_tracked")

    def test_invalid_entries_skipped(self):
        created = import_seed_entries(self.db, [{"name": "no url"}, {"url": ""}])
        self.assertEqual(created, 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_importer -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/importer.py
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
```

```json
// data/seed/curated.json — starter list, grow this file over time (target 1-2k)
[
  {"url": "https://linear.app", "name": "Linear", "category": "productivity"},
  {"url": "https://notion.so", "name": "Notion", "category": "productivity"},
  {"url": "https://posthog.com", "name": "PostHog", "category": "analytics"},
  {"url": "https://plausible.io", "name": "Plausible", "category": "analytics"},
  {"url": "https://cal.com", "name": "Cal.com", "category": "productivity"},
  {"url": "https://resend.com", "name": "Resend", "category": "devtools"},
  {"url": "https://railway.app", "name": "Railway", "category": "devtools"},
  {"url": "https://supabase.com", "name": "Supabase", "category": "devtools"},
  {"url": "https://crisp.chat", "name": "Crisp", "category": "support"},
  {"url": "https://buttondown.com", "name": "Buttondown", "category": "marketing"}
]
```
(JSON files cannot contain comments — omit the `//` line in the real file.)

```python
# scripts/seed_apps.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_importer -v` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/importer.py data/seed/curated.json scripts/seed_apps.py tests/test_discovery_importer.py
git commit -m "feat(discovery): seed importer, curated starter list, seeding CLI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Search module

**Files:**
- Create: `app/discovery/search.py`
- Test: `tests/test_discovery_search.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_search.py
import json
import unittest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import App, AppPricing, AppTech, ChangeEvent, Competitor, Snapshot, User
from app.discovery.search import search_apps


class TestSearchApps(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.a1 = App(slug="acme", url="acme.io", name="Acme", tagline="Ship projects faster",
                      category="productivity", tags=json.dumps(["saas"]), scan_status="ok")
        self.a2 = App(slug="metrics", url="metrics.io", name="Metrics", tagline="Analytics for teams",
                      category="analytics", scan_status="ok")
        self.db.add_all([self.a1, self.a2])
        self.db.commit()
        self.db.add_all([
            AppPricing(app_id=self.a1.id, tier_name="Pro", price=29.0, period="monthly"),
            AppPricing(app_id=self.a2.id, tier_name="Growth", price=99.0, period="monthly"),
            AppTech(app_id=self.a1.id, technology="stripe", tech_category="payments"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _result_slugs(self, **kwargs):
        results, total = search_apps(self.db, **kwargs)
        return [r["slug"] for r in results], total

    def test_text_query_matches_tagline(self):
        slugs, total = self._result_slugs(q="analytics")
        self.assertEqual(slugs, ["metrics"])
        self.assertEqual(total, 1)

    def test_category_filter(self):
        slugs, _ = self._result_slugs(category="productivity")
        self.assertEqual(slugs, ["acme"])

    def test_max_price_filter(self):
        slugs, _ = self._result_slugs(max_price=50)
        self.assertEqual(slugs, ["acme"])

    def test_tech_filter(self):
        slugs, _ = self._result_slugs(tech="stripe")
        self.assertEqual(slugs, ["acme"])

    def test_actively_shipping_filter(self):
        user = User(email="s@example.com")
        self.db.add(user)
        self.db.commit()
        comp = Competitor(user_id=user.id, url="https://acme.io", app_id=self.a1.id)
        self.db.add(comp)
        self.db.commit()
        snap = Snapshot(competitor_id=comp.id, raw_text="x", char_count=1)
        self.db.add(snap)
        self.db.commit()
        for _ in range(3):
            self.db.add(ChangeEvent(
                competitor_id=comp.id, snapshot_before_id=snap.id, snapshot_after_id=snap.id,
                net_char_delta=200, detected_at=datetime.utcnow() - timedelta(days=5),
            ))
        self.db.commit()
        slugs, _ = self._result_slugs(actively_shipping=True)
        self.assertEqual(slugs, ["acme"])

    def test_pagination(self):
        for i in range(25):
            self.db.add(App(slug=f"x{i}", url=f"x{i}.io", name=f"X{i}", scan_status="ok"))
        self.db.commit()
        page1, total = search_apps(self.db, page=1, page_size=20)
        page2, _ = search_apps(self.db, page=2, page_size=20)
        self.assertEqual(len(page1), 20)
        self.assertEqual(total, 27)
        self.assertEqual(len(page2), 7)

    def test_result_shape(self):
        results, _ = search_apps(self.db, q="acme")
        r = results[0]
        for key in ["slug", "name", "tagline", "category", "logo_url", "price_from", "tech", "tags"]:
            self.assertIn(key, r)
        self.assertEqual(r["price_from"], 29.0)
        self.assertIn("stripe", r["tech"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_search -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

```python
# app/discovery/search.py
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
        return text("apps.search_vector @@ plainto_tsquery('english', :q)").bindparams(q=q)
    like = f"%{q.lower()}%"
    return or_(
        func.lower(App.name).like(like),
        func.lower(func.coalesce(App.tagline, "")).like(like),
        func.lower(func.coalesce(App.description, "")).like(like),
        func.lower(func.coalesce(App.tags, "")).like(like),
    )


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
    else:  # relevance/default: most-recently-refreshed first
        stmt = stmt.order_by(App.last_scanned_at.desc().nullslast(), App.created_at.desc())

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./venv/bin/python -m unittest tests.test_discovery_search -v` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/discovery/search.py tests/test_discovery_search.py
git commit -m "feat(discovery): faceted search with Postgres FTS + SQLite fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Discovery API router

**Files:**
- Create: `app/routes/discovery.py`
- Modify: `main.py` (register router — find the existing `app.include_router(...)` lines and add one)
- Test: `tests/test_discovery_api.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_discovery_api.py
import json
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app as fastapi_app
from app.db import Base, get_session
from app.models import App, AppPricing, Competitor, User


class TestDiscoveryApi(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        fastapi_app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(fastapi_app, raise_server_exceptions=False)
        self.db = self.SessionLocal()

        self.user = User(email="d@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.app_row = App(slug="acme", url="acme.io", name="Acme",
                           tagline="Ship faster", category="productivity", scan_status="ok")
        self.db.add(self.app_row)
        self.db.commit()
        self.db.add(AppPricing(app_id=self.app_row.id, tier_name="Pro", price=29.0, period="monthly"))
        self.db.commit()
        self.auth = {"Authorization": f"Bearer {self.user.id}"}

    def tearDown(self):
        self.db.close()
        fastapi_app.dependency_overrides.clear()

    def test_search_is_public(self):
        resp = self.client.get("/api/v1/apps/search?q=acme")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["results"][0]["slug"], "acme")

    def test_search_sort_requires_auth(self):
        resp = self.client.get("/api/v1/apps/search?sort=newest")
        self.assertEqual(resp.status_code, 401)
        resp = self.client.get("/api/v1/apps/search?sort=newest", headers=self.auth)
        self.assertEqual(resp.status_code, 200)

    def test_profile_returns_pricing(self):
        resp = self.client.get("/api/v1/apps/acme")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["name"], "Acme")
        self.assertEqual(body["pricing"][0]["price"], 29.0)
        self.assertIn("review_summary", body)
        self.assertIn("change_velocity_90d", body)

    def test_profile_unknown_slug_404(self):
        self.assertEqual(self.client.get("/api/v1/apps/nope").status_code, 404)

    def test_track_requires_auth(self):
        self.assertEqual(self.client.post("/api/v1/apps/acme/track").status_code, 401)

    def test_track_creates_linked_competitor_and_promotes_tier(self):
        resp = self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        comp = self.db.execute(select(Competitor).where(Competitor.user_id == self.user.id)).scalar_one()
        self.assertEqual(comp.app_id, self.app_row.id)
        self.db.refresh(self.app_row)
        self.assertEqual(self.app_row.scan_tier, "full")

    def test_track_twice_does_not_duplicate(self):
        self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        resp = self.client.post("/api/v1/apps/acme/track", headers=self.auth)
        self.assertEqual(resp.status_code, 200)
        comps = self.db.execute(select(Competitor).where(Competitor.user_id == self.user.id)).scalars().all()
        self.assertEqual(len(comps), 1)

    def test_sitemap_lists_slugs(self):
        resp = self.client.get("/api/v1/apps-sitemap")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["apps"][0]["slug"], "acme")

    @patch("app.routes.battlecard.anthropic.Anthropic")
    def test_public_discovery_makes_zero_paid_model_calls(self, mock_anthropic):
        """Cost regression — same class of bug as the June 2026 credit drain."""
        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "real", "OPENAI_API_KEY": "real"}):
            self.client.get("/api/v1/apps/search?q=acme")
            self.client.get("/api/v1/apps/acme")
            self.client.get("/api/v1/apps-sitemap")
        mock_client.messages.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./venv/bin/python -m unittest tests.test_discovery_api -v`
Expected: FAIL (404s — router doesn't exist)

- [ ] **Step 3: Write the router**

```python
# app/routes/discovery.py
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import App, AppPricing, AppTech, ChangeEvent, Competitor, ReviewSnapshot
from app.discovery.search import search_apps
from app.routes.api_v1 import require_api_user

router = APIRouter(prefix="/api/v1", tags=["discovery"])


def _optional_user(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.split(" ", 1)[1]


@router.get("/apps/search")
def api_search_apps(
    q: str | None = None,
    category: str | None = None,
    max_price: float | None = None,
    tech: str | None = None,
    actively_shipping: bool = False,
    sort: str = "relevance",
    page: int = 1,
    db: Session = Depends(get_session),
    authorization: str | None = __import__("fastapi").Header(default=None),
):
    # Advanced sorting is a paid-tier hook: public gets relevance only.
    if sort != "relevance" and _optional_user(authorization) is None:
        raise HTTPException(status_code=401, detail="Sign in to use sorting")
    results, total = search_apps(
        db, q=q, category=category, max_price=max_price, tech=tech,
        actively_shipping=actively_shipping, sort=sort, page=page,
    )
    return {"results": results, "total": total, "page": page}


@router.get("/apps/{slug}")
def api_app_profile(slug: str, db: Session = Depends(get_session)):
    app_row = db.execute(select(App).where(App.slug == slug)).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="App not found")

    pricing = db.execute(
        select(AppPricing).where(AppPricing.app_id == app_row.id).order_by(AppPricing.price.asc().nullslast())
    ).scalars().all()
    tech = db.execute(select(AppTech).where(AppTech.app_id == app_row.id)).scalars().all()

    # Signals aggregated from linked competitors (any user tracking this app).
    comp_ids = [r[0] for r in db.execute(select(Competitor.id).where(Competitor.app_id == app_row.id))]
    review_summary = None
    change_velocity = 0
    if comp_ids:
        latest = db.execute(
            select(ReviewSnapshot)
            .where(ReviewSnapshot.competitor_id.in_(comp_ids))
            .order_by(ReviewSnapshot.snapshot_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        if latest and latest.avg_rating is not None:
            review_summary = {
                "avg_rating": latest.avg_rating,
                "total_reviews": latest.total_reviews,
                "platform": latest.platform,
            }
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        change_velocity = db.execute(
            select(func.count(ChangeEvent.id))
            .where(ChangeEvent.competitor_id.in_(comp_ids), ChangeEvent.detected_at >= ninety_days_ago)
        ).scalar_one()

    return {
        "slug": app_row.slug,
        "url": app_row.url,
        "name": app_row.name,
        "tagline": app_row.tagline,
        "description": app_row.description,
        "category": app_row.category,
        "tags": json.loads(app_row.tags) if app_row.tags else [],
        "logo_url": app_row.logo_url,
        "screenshot_url": app_row.screenshot_url,
        "last_scanned_at": app_row.last_scanned_at.isoformat() if app_row.last_scanned_at else None,
        "pricing": [
            {"tier_name": p.tier_name, "price": p.price, "currency": p.currency,
             "period": p.period, "features": json.loads(p.features) if p.features else []}
            for p in pricing
        ],
        "tech": [{"technology": t.technology, "tech_category": t.tech_category} for t in tech],
        "review_summary": review_summary,
        "change_velocity_90d": change_velocity,
    }


@router.post("/apps/{slug}/track")
def api_track_app(slug: str, db: Session = Depends(get_session), user_id: str = Depends(require_api_user)):
    import uuid as _uuid
    app_row = db.execute(select(App).where(App.slug == slug)).scalar_one_or_none()
    if not app_row:
        raise HTTPException(status_code=404, detail="App not found")

    user_uuid = _uuid.UUID(user_id)
    existing = db.execute(
        select(Competitor).where(Competitor.user_id == user_uuid, Competitor.app_id == app_row.id)
    ).scalar_one_or_none()
    if existing:
        return {"competitor_id": str(existing.id), "created": False}

    comp = Competitor(
        user_id=user_uuid,
        url=f"https://{app_row.url}",
        name=app_row.name,
        app_id=app_row.id,
    )
    db.add(comp)
    app_row.scan_tier = "full"  # promoted: a paying user now tracks it
    db.commit()
    db.refresh(comp)
    return {"competitor_id": str(comp.id), "created": True}


@router.get("/apps-sitemap")
def api_apps_sitemap(db: Session = Depends(get_session)):
    rows = db.execute(
        select(App.slug, App.last_scanned_at).where(App.scan_status != "scan_failed").order_by(App.created_at)
    ).all()
    return {"apps": [
        {"slug": r[0], "last_scanned_at": r[1].isoformat() if r[1] else None} for r in rows
    ]}
```

NOTE on the `authorization` param: replace the inline `__import__("fastapi").Header(...)` hack with a proper import — add `Header` to the fastapi import line at the top (`from fastapi import APIRouter, Depends, Header, HTTPException`) and declare `authorization: str | None = Header(default=None)`. The plan shows it inline only so the snippet is copy-paste complete.

In `main.py`, next to the existing router includes (search for `include_router`), add:

```python
from app.routes.discovery import router as discovery_router
app.include_router(discovery_router)
```

IMPORTANT: register `discovery_router` AFTER `api_v1`'s router. `/api/v1/apps/{slug}` is a catch-all under `/api/v1/apps/` — confirm no existing route collides (there is none today; `grep -n '"/apps' app/routes/api_v1.py` must return nothing).

- [ ] **Step 4: Run tests to verify they pass, plus full suite**

Run: `./venv/bin/python -m unittest tests.test_discovery_api -v` → all PASS
Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → all PASS

- [ ] **Step 5: Commit**

```bash
git add app/routes/discovery.py main.py tests/test_discovery_api.py
git commit -m "feat(discovery): public search/profile/sitemap API + authenticated track endpoint

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Frontend — /apps/[slug] public profile page

**Files:**
- Create: `frontend/src/app/apps/[slug]/page.tsx`
- Reference: `frontend/src/app/share/[id]/page.tsx` (same SSR + generateMetadata + cache pattern), `DESIGN.md` (tokens)

- [ ] **Step 1: Read DESIGN.md and the share page** (theme rules; SSR fetch pattern with `react cache()` + `revalidate` — NEVER `no-store`).

- [ ] **Step 2: Create the page**

```tsx
// frontend/src/app/apps/[slug]/page.tsx
import { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fetchApp = cache(async function fetchApp(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const app = await fetchApp(slug);
  if (!app) return { title: 'App Not Found — Rivalscope' };
  const title = `${app.name} — pricing, tech stack & signals | Rivalscope`;
  const description = app.tagline || app.description || `Intelligence profile for ${app.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'Rivalscope', images: ['/og-image.png'] },
  };
}

function PricingTable({ pricing }: { pricing: { tier_name: string; price: number | null; period: string }[] }) {
  if (!pricing.length) return null;
  return (
    <section className="rs-card p-6">
      <h2 className="rs-label mb-4">Pricing</h2>
      <div className="space-y-2">
        {pricing.map((p) => (
          <div key={p.tier_name} className="flex items-baseline justify-between border-b pb-2"
               style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.tier_name}</span>
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              {p.price === null ? 'Custom' : `$${p.price}/${p.period === 'yearly' ? 'yr' : 'mo'}`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AppProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const app = await fetchApp(slug);

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <div className="rs-card p-8 max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>App not found</h1>
          <Link href="/discover" className="rs-btn-primary text-[13px]">Browse the database</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--surface-base)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="rs-card p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{app.name}</h1>
              {app.tagline && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{app.tagline}</p>}
            </div>
            <Link href={`/auth/login?track=${app.slug}`} className="rs-btn-primary text-[13px] whitespace-nowrap">
              Track this app
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {app.category && <span className="badge">{app.category}</span>}
            {app.tags.map((t: string) => <span key={t} className="badge">{t}</span>)}
          </div>
          {app.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{app.description}</p>
          )}
          <a href={`https://${app.url}`} target="_blank" rel="noopener noreferrer"
             className="text-xs font-mono underline" style={{ color: 'var(--accent-primary)' }}>
            {app.url} ↗
          </a>
        </header>

        <PricingTable pricing={app.pricing} />

        {app.tech.length > 0 && (
          <section className="rs-card p-6">
            <h2 className="rs-label mb-4">Tech stack</h2>
            <div className="flex flex-wrap gap-2">
              {app.tech.map((t: { technology: string }) => (
                <span key={t.technology} className="badge">{t.technology}</span>
              ))}
            </div>
          </section>
        )}

        <section className="rs-card p-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="rs-label mb-2">Reviews</h2>
            <p className="font-mono text-xl" style={{ color: 'var(--text-primary)' }}>
              {app.review_summary ? `${app.review_summary.avg_rating}/5` : '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {app.review_summary ? `${app.review_summary.total_reviews} reviews (${app.review_summary.platform})` : 'No review data yet'}
            </p>
          </div>
          <div>
            <h2 className="rs-label mb-2">Shipping velocity</h2>
            <p className="font-mono text-xl" style={{ color: 'var(--text-primary)' }}>{app.change_velocity_90d}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>page changes in the last 90 days</p>
          </div>
        </section>

        <footer className="text-center text-xs space-y-2" style={{ color: 'var(--text-muted)' }}>
          <p>
            Is this your app?{' '}
            <a href="mailto:claim@rivalscope.app?subject=Claim my app" className="underline">
              Claim this profile
            </a>
          </p>
          <p>Powered by <Link href="/" className="underline">Rivalscope</Link></p>
        </footer>
      </div>
    </div>
  );
}
```

(If `.badge` / `.rs-label` class names differ in `globals.css`, use whatever the current v3 equivalents are — check `frontend/src/app/globals.css` first.)

- [ ] **Step 3: Verify it builds**

Run: `cd frontend && npm run build`
Expected: build succeeds, `/apps/[slug]` listed as dynamic route.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/apps/[slug]/page.tsx"
git commit -m "feat(discovery): public app profile page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Frontend — /discover search page

**Files:**
- Create: `frontend/src/app/discover/page.tsx` (server shell + metadata)
- Create: `frontend/src/app/discover/discover-client.tsx` (search UI)

- [ ] **Step 1: Create the server shell**

```tsx
// frontend/src/app/discover/page.tsx
import { Metadata } from 'next';
import DiscoverClient from './discover-client';

export const metadata: Metadata = {
  title: 'Discover web apps — Rivalscope',
  description: 'Search a database of web apps and SaaS by category, pricing, tech stack, and shipping velocity.',
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
```

- [ ] **Step 2: Create the client UI**

```tsx
// frontend/src/app/discover/discover-client.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CATEGORIES = ['productivity', 'devtools', 'marketing', 'finance', 'ecommerce',
                    'analytics', 'ai', 'design', 'hr', 'support', 'education', 'health', 'other'];

interface Result {
  slug: string; name: string; tagline: string | null; category: string | null;
  logo_url: string | null; price_from: number | null; tech: string[]; tags: string[];
}

export default function DiscoverClient() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (maxPrice) params.set('max_price', maxPrice);
      const res = await fetch(`${API_BASE}/api/v1/apps/search?${params}`);
      if (res.ok) {
        const body = await res.json();
        setResults(body.results);
        setTotal(body.total);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [q, category, maxPrice]);

  useEffect(() => { runSearch(1); }, [category, maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--surface-base)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Discover</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Search web apps by category, pricing, and tech stack.
          </p>
        </header>

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runSearch(1); }}>
          <input
            className="rs-input flex-1" placeholder="Search apps…"
            value={q} onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="rs-btn-primary text-[13px]" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select className="rs-input text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rs-input text-sm" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any price</option>
            <option value="10">Under $10/mo</option>
            <option value="25">Under $25/mo</option>
            <option value="50">Under $50/mo</option>
            <option value="100">Under $100/mo</option>
          </select>
        </div>

        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {total} app{total === 1 ? '' : 's'}
        </p>

        <div className="space-y-2">
          {results.map((r) => (
            <Link key={r.slug} href={`/apps/${r.slug}`} className="rs-card p-4 flex items-center justify-between gap-4 block">
              <div className="min-w-0">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                {r.tagline && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{r.tagline}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {r.category && <span className="badge">{r.category}</span>}
                <span>{r.price_from !== null ? `from $${r.price_from}/mo` : '—'}</span>
              </div>
            </Link>
          ))}
          {!loading && results.length === 0 && (
            <div className="rs-card p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No apps match. Try a broader search.
            </div>
          )}
        </div>

        {total > 20 && (
          <div className="flex justify-center gap-2">
            <button className="rs-btn-ghost text-[13px]" disabled={page <= 1} onClick={() => runSearch(page - 1)}>← Prev</button>
            <button className="rs-btn-ghost text-[13px]" disabled={page * 20 >= total} onClick={() => runSearch(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `cd frontend && npm run build`
Expected: build succeeds, `/discover` route present.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/discover/
git commit -m "feat(discovery): public /discover search page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: SEO — sitemap + dashboard nav entry

**Files:**
- Create or Modify: `frontend/src/app/sitemap.ts` (check if it exists first: `ls frontend/src/app/sitemap.ts`)
- Modify: `frontend/src/components/sidebar.tsx` (add Discover nav item next to existing nav links)

- [ ] **Step 1: Sitemap**

If `sitemap.ts` exists, merge app profile entries into the returned array; otherwise create:

```ts
// frontend/src/app/sitemap.ts
import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SITE = 'https://competitor-analyzer-zeta.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/discover`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const res = await fetch(`${API_BASE}/api/v1/apps-sitemap`, { next: { revalidate: 86400 } });
    if (!res.ok) return staticPages;
    const body = await res.json();
    const appPages = body.apps.map((a: { slug: string; last_scanned_at: string | null }) => ({
      url: `${SITE}/apps/${a.slug}`,
      lastModified: a.last_scanned_at ? new Date(a.last_scanned_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    return [...staticPages, ...appPages];
  } catch {
    return staticPages;
  }
}
```

- [ ] **Step 2: Sidebar nav item**

In `frontend/src/components/sidebar.tsx`, find the existing nav links array/list (search for `Intel Feed` or `href="/dashboard"`) and add a Discover entry following the exact same component pattern used by its siblings, pointing to `/discover`. Use an existing icon import style (e.g. `Compass` from `lucide-react`).

- [ ] **Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: build succeeds; `sitemap.xml` route emitted.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/sitemap.ts frontend/src/components/sidebar.tsx
git commit -m "feat(discovery): sitemap with app profiles + Discover nav

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Ship + seed production

- [ ] **Step 1: Full verification**

Run: `./venv/bin/python -m unittest discover -s tests -p "test_*.py"` → all PASS (count must be ≥ the suite's previous total; no skips introduced)
Run: `cd frontend && npm run build` → succeeds

- [ ] **Step 2: Push (auto-deploys Vercel + Railway; Railway runs `alembic upgrade head` on boot)**

```bash
git push origin main
```

- [ ] **Step 3: Verify production**

- `curl https://competitor-analyzer-production-62ee.up.railway.app/health` → migrations applied including the discovery revision.
- `curl "https://competitor-analyzer-production-62ee.up.railway.app/api/v1/apps/search?q=test"` → 200 with empty results.

- [ ] **Step 4: Seed production data**

Run against the production DB (Railway shell or `railway run`):

```bash
railway run python scripts/seed_apps.py --scan
```

Expected: imports curated list + backfills existing competitors, then cheap-scans up to `SEED_SCAN_DAILY_LIMIT` apps. Confirm AI spend stays within ~$5 for the batch (Haiku-only).

- [ ] **Step 5: Smoke-test the funnel**

Open `https://competitor-analyzer-zeta.vercel.app/discover` → search → open a profile → "Track this app" leads to login/signup.

---

## Self-review notes (already applied)

- Spec coverage: schema (T2-3), backfill (T4), importer/cheap scanner/guardrails (T5-8), search (T9), API incl. rate-size caps + auth-gated sort + zero-AI regression (T10), profile page (T11), /discover (T12), sitemap/nav (T13), rollout (T14). Per-IP rate limiting from the spec is deliberately reduced to page-size caps + auth-gated sorting for v1 (YAGNI; revisit if abuse appears).
- The add-competitor autocomplete from the spec is deferred to the design-rebuild sub-project — the "Track this app" funnel covers the same job with less UI churn.
- Type consistency: `get_or_create_app` defined in T4, reused in T8; `search_apps` returns `(list, total)` consumed in T10; profile payload keys in T10 match T11's TSX usage.
