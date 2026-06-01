import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.session import serializer, SESSION_COOKIE_NAME

class TestQueueSettings(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Database setup
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Override dependency
        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()
                
        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        
        # Database records
        self.db = self.SessionLocal()
        self.user = User(email="user@test.com", subscription_status="trialing")
        self.db.add(self.user)
        self.db.commit()
        
        self.competitor = Competitor(user_id=self.user.id, url="https://competitor.com", name="Comp Co")
        self.db.add(self.competitor)
        self.db.commit()
        
        self.snapshot_before = Snapshot(competitor_id=self.competitor.id, raw_text="old", char_count=3)
        self.snapshot_after = Snapshot(competitor_id=self.competitor.id, raw_text="new content", char_count=11)
        self.db.add(self.snapshot_before)
        self.db.add(self.snapshot_after)
        self.db.commit()
        
        self.change_event = ChangeEvent(
            competitor_id=self.competitor.id,
            snapshot_before_id=self.snapshot_before.id,
            snapshot_after_id=self.snapshot_after.id,
            net_char_delta=8,
            change_type="pricing_change",
            brief_text="Pricing updated.",
            week_label="2026-W22",
        )
        self.db.add(self.change_event)
        self.db.commit()
        
        self.action = ApprovedAction(
            user_id=self.user.id,
            change_event_id=self.change_event.id,
            action_type="retention_email",
            original_draft="Original GPT-4o copy",
            edited_text=None,
            approved_at=None,
        )
        self.db.add(self.action)
        self.db.commit()
        
        # Set auth session cookie helper
        self.session_cookie = serializer.dumps({"user_id": str(self.user.id)})

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def test_queue_unauthenticated_redirects(self):
        response = self.client.get("/queue/", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers.get("Location"), "/auth/login")

    def test_queue_authenticated_renders(self):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.get("/queue/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Approval Queue", response.text)
        self.assertIn("Original GPT-4o copy", response.text)
        self.assertIn("Comp Co", response.text)
        self.assertIn("Pricing updated.", response.text)

    def test_approve_action_no_changes(self):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.post(
            f"/queue/{self.action.id}/approve",
            data={"edited_text": "Original GPT-4o copy"} # same as original
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "") # HTMX empty response
        
        # Verify in DB
        self.db.refresh(self.action)
        self.assertIsNotNone(self.action.approved_at)
        self.assertIsNone(self.action.edited_text) # unchanged, so None

    def test_approve_action_with_changes(self):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.post(
            f"/queue/{self.action.id}/approve",
            data={"edited_text": "Modified brand voice copy"} # edited
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        
        # Verify in DB
        self.db.refresh(self.action)
        self.assertIsNotNone(self.action.approved_at)
        self.assertEqual(self.action.edited_text, "Modified brand voice copy") # brand voice captured!

    def test_dismiss_action(self):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.post(
            f"/queue/{self.action.id}/dismiss"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "")
        
        # Verify in DB
        self.db.refresh(self.action)
        self.assertIsNotNone(self.action.approved_at)
        self.assertIsNone(self.action.edited_text)

    def test_settings_unauthenticated_redirects(self):
        response = self.client.get("/settings/", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers.get("Location"), "/auth/login")

    def test_settings_page(self):
        self.client.cookies.set(SESSION_COOKIE_NAME, self.session_cookie)
        response = self.client.get("/settings/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Settings", response.text)
        self.assertIn("user@test.com", response.text)
        self.assertIn("trialing", response.text)

if __name__ == '__main__':
    unittest.main()
