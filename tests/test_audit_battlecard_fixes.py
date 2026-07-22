"""Audit 2026-07-21 findings A-D for app/routes/battlecard.py.

A: the local heuristic card must NOT fabricate review-derived weaknesses when
   there is zero review data (served on the unauthenticated public share path).
B: (1) the one free test is consumed atomically BEFORE the paid generation so
   two concurrent requests can't both pass the is_read_only check; a failed
   generation refunds the flag. (2) _store_cache survives a concurrent insert
   on the unique competitor_id index (IntegrityError -> retry as update).
C: serving a cached card must NOT consume the free test (no paid call ran).
D: weaknesses seeded from ReviewSnapshot.top_complaints are coerced to plain
   strings on the FRESH payload path too (object items crash React, #31 class).
"""
import json
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, ReviewSnapshot, BattleCardCache
from app.routes import battlecard as bc


FRESH_CACHED_PAYLOAD = {
    "executive_summary": "Cached summary from an earlier generation.",
    "what_changed": [],
    "weaknesses": ["w1"],
    "strategic_signals": ["s1"],
    "playbook": ["p1", "p2", "p3", "p4", "p5"],
}


class _Base(unittest.TestCase):
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

        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def _make_user(self, email, business_type="saas"):
        # Production-style: rely on the column default for free_test_used.
        user = User(email=email, business_type=business_type)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _make_comp(self, user, business_type="saas", cached_fresh=False):
        comp = Competitor(
            user_id=user.id,
            url="https://rival.example.com",
            name="Rival Co",
            business_type=business_type,
            active=True,
        )
        if business_type == "local":
            comp.google_maps_url = "https://maps.google.com/place/rival"
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)
        if cached_fresh:
            self.db.add(BattleCardCache(
                competitor_id=comp.id,
                payload=json.dumps(FRESH_CACHED_PAYLOAD),
                ai_generated=True,
                generated_at=datetime.utcnow(),
            ))
            self.db.commit()
        return comp

    def _reload_user(self, user):
        db = self.SessionLocal()
        try:
            return db.execute(
                select(User.free_test_used).where(User.id == user.id)
            ).scalar_one()
        finally:
            db.close()


class TestFindingALocalFabricatedWeaknesses(_Base):
    """No reviews, no snapshot, no complaints -> weaknesses must be empty,
    never the hardcoded 'Slow service during peak hours...' filler."""

    def test_local_card_with_zero_review_data_has_no_fabricated_weaknesses(self):
        user = self._make_user("local@example.com", business_type="local")
        comp = self._make_comp(user, business_type="local")
        payload, ai = bc._generate_local_battlecard(comp, self.db, allow_ai=False)
        self.assertFalse(ai)
        self.assertEqual(payload["weaknesses"], [])

    def test_public_share_local_card_has_no_fabricated_weaknesses(self):
        user = self._make_user("local2@example.com", business_type="local")
        comp = self._make_comp(user, business_type="local")
        resp = self.client.get(f"/api/v1/battlecards/public/{comp.id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["weaknesses"], [])


class TestFindingBAtomicFreeTest(_Base):
    def test_consume_free_test_has_one_winner(self):
        user = self._make_user("race@example.com")
        first = bc._consume_free_test(user.id, self.db)
        second = bc._consume_free_test(user.id, self.db)
        self.assertTrue(first)
        self.assertFalse(second)
        self.assertTrue(self._reload_user(user))

    def test_free_test_consumed_before_generation_and_refunded_on_failure(self):
        user = self._make_user("refund@example.com")
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        seen = {}

        def boom(*args, **kwargs):
            # Capture the flag state DURING generation: it must already be
            # consumed (atomic pre-consume), then refunded after the failure.
            seen["during"] = self._reload_user(user)
            raise RuntimeError("model exploded")

        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch.object(bc, "_generate", side_effect=boom):
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 500)
        self.assertTrue(seen.get("during"), "free test must be consumed BEFORE generation")
        self.assertFalse(self._reload_user(user), "failed generation must refund the free test")

    def test_successful_paid_generation_consumes_free_test(self):
        user = self._make_user("winner@example.com")
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "executive_summary": "Rival shipped a pricing change.",
            "what_changed": [{"type": "pricing_change", "text": "Raised prices."}],
            "weaknesses": ["w1", "w2"],
            "strategic_signals": ["s1", "s2"],
            "playbook": ["a", "b", "c", "d", "e"],
        })
        mock_resp = MagicMock()
        mock_resp.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_resp
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=True), \
             patch("app.llm.get_sync_client", return_value=mock_client):
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(self._reload_user(user))

    def test_heuristic_fallback_refunds_free_test(self):
        # Dummy key -> heuristic card, no paid call ran. The one free test must
        # not be burned on a card no paid generation produced.
        user = self._make_user("heuristic@example.com")
        comp = self._make_comp(user)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.ai_available", return_value=False):
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(self._reload_user(user))


class TestFindingBStoreCacheRace(_Base):
    def test_store_cache_survives_concurrent_insert(self):
        user = self._make_user("cache@example.com")
        comp = self._make_comp(user)
        # Simulate the race: the concurrent request's row lands after our
        # existence check. First _load_cache sees None -> we db.add() a
        # duplicate -> commit hits the unique index -> retry must update.
        self.db.add(BattleCardCache(
            competitor_id=comp.id,
            payload=json.dumps({"executive_summary": "first writer"}),
            ai_generated=True,
            generated_at=datetime.utcnow(),
        ))
        self.db.commit()

        real_load = bc._load_cache
        calls = {"n": 0}

        def racy_load(comp_id, db):
            calls["n"] += 1
            if calls["n"] == 1:
                return None
            return real_load(comp_id, db)

        db = self.SessionLocal()
        try:
            with patch.object(bc, "_load_cache", side_effect=racy_load):
                bc._store_cache(comp.id, {"executive_summary": "second writer"}, True, db)
        finally:
            db.close()

        cached = bc._load_cache(comp.id, self.db)
        self.assertIsNotNone(cached)
        self.assertEqual(json.loads(cached.payload)["executive_summary"], "second writer")


class TestFindingCCacheServeDoesNotMeter(_Base):
    def test_cache_hit_does_not_consume_free_test(self):
        user = self._make_user("cached@example.com")
        comp = self._make_comp(user, cached_fresh=True)
        auth = {"Authorization": f"Bearer {user.id}"}
        with patch("app.access.PAYWALL_ENABLED", True), \
             patch("app.access.COMPED_EMAILS", set()), \
             patch("app.llm.get_sync_client") as get_client:
            resp = self.client.get(f"/api/v1/battlecards/generate/{comp.id}", headers=auth)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json()["executive_summary"], FRESH_CACHED_PAYLOAD["executive_summary"]
        )
        get_client.assert_not_called()
        self.assertFalse(
            self._reload_user(user),
            "serving a cached card must not consume the free test (no paid call ran)",
        )


class TestFindingDSeedPathCoercion(_Base):
    def _snapshot(self, comp, complaints):
        self.db.add(ReviewSnapshot(
            competitor_id=comp.id,
            platform="google",
            snapshot_at=datetime.utcnow(),
            avg_rating=3.1,
            total_reviews=12,
            complaint_count=len(complaints),
            top_complaints=json.dumps(complaints),
        ))
        self.db.commit()

    def test_local_fresh_payload_coerces_object_complaints(self):
        user = self._make_user("coerce-local@example.com", business_type="local")
        comp = self._make_comp(user, business_type="local")
        self._snapshot(comp, [{"text": "Slow lunch service"}, "Plain complaint", {"junk": 42}])
        payload, _ = bc._generate_local_battlecard(comp, self.db, allow_ai=False)
        self.assertIn("Slow lunch service", payload["weaknesses"])
        self.assertIn("Plain complaint", payload["weaknesses"])
        for w in payload["weaknesses"]:
            self.assertIsInstance(w, str)

    def test_saas_fresh_payload_coerces_object_complaints(self):
        user = self._make_user("coerce-saas@example.com")
        comp = self._make_comp(user)
        self._snapshot(comp, [{"text": "Slow support"}, "Plain complaint"])
        payload, _ = bc._generate_saas_battlecard(comp, self.db, allow_ai=False)
        self.assertIn("Slow support", payload["weaknesses"])
        self.assertIn("Plain complaint", payload["weaknesses"])
        for w in payload["weaknesses"]:
            self.assertIsInstance(w, str)


if __name__ == "__main__":
    unittest.main()
