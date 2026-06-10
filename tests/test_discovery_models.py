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
