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
