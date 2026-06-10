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
