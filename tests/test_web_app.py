import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from main import app
from app.db import Base, get_session
from app.models import User, Competitor, Snapshot, ChangeEvent, ApprovedAction
from app.auth import generate_magic_link_token, verify_magic_link_token, get_or_create_user
from app.session import serializer, SESSION_COOKIE_NAME, require_current_user

class TestWebApp(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # In-memory database setup
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Override get_session dependency in FastAPI
        def override_get_session():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()
                
        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app, raise_server_exceptions=False)
        
        # Create test user
        self.db = self.SessionLocal()
        self.user = User(email="founder@example.com")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        app.dependency_overrides.clear()

    def test_magic_link_token_flow(self):
        # 1. Generate token
        token = generate_magic_link_token(str(self.user.id), expires_minutes=10)
        self.assertIsNotNone(token)
        
        # 2. Verify token
        user_id = verify_magic_link_token(token)
        self.assertEqual(user_id, str(self.user.id))
        
        # 3. Verify token is consumed (one-use)
        second_attempt = verify_magic_link_token(token)
        self.assertIsNone(second_attempt)

    def test_session_helpers(self):
        # Token creation
        data = {"user_id": str(self.user.id)}
        signed_cookie = serializer.dumps(data)
        
        # Mock request to retrieve user ID
        class DummyRequest:
            def __init__(self, cookies):
                self.cookies = cookies
                
        req = DummyRequest(cookies={SESSION_COOKIE_NAME: signed_cookie})
        from app.session import get_current_user_id
        parsed_id = get_current_user_id(req)
        self.assertEqual(parsed_id, str(self.user.id))

    def test_require_current_user_guard(self):
        class DummyRequest:
            cookies = {}
            
        # Unauthenticated: should raise 307 redirect exception
        req = DummyRequest()
        with self.assertRaises(HTTPException) as ctx:
            require_current_user(req)
        self.assertEqual(ctx.exception.status_code, 307)
        self.assertEqual(ctx.exception.headers.get("Location"), "/auth/login")

    def test_root_redirects_to_login(self):
        response = self.client.get("/", follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers.get("Location"), "/auth/login")

    def test_login_page_renders(self):
        response = self.client.get("/auth/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Welcome Back", response.text)

    @patch("app.routes.auth.send_magic_link_email", new_callable=AsyncMock)
    def test_request_magic_link_flow(self, mock_email_send):
        # Successful form post
        response = self.client.post("/auth/login", data={"email": "founder@example.com"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Check your email", response.text)
        
        # Verify user was fetched/created
        users = self.db.query(User).all()
        self.assertEqual(len(users), 1) # No duplicates
        
        # Verify link email was sent
        mock_email_send.assert_called_once()
        sent_link = mock_email_send.call_args[0][1]
        self.assertIn("/auth/verify?token=", sent_link)

    def test_verify_magic_link_route_success(self):
        token = generate_magic_link_token(str(self.user.id))
        response = self.client.get(f"/auth/verify?token={token}", follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers.get("Location"), "/dashboard")
        
        # Session cookie set
        self.assertIn(SESSION_COOKIE_NAME, response.cookies)

    def test_verify_magic_link_route_invalid(self):
        response = self.client.get("/auth/verify?token=invalid_token")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Link expired or invalid", response.text)

    def test_dashboard_unauthenticated_redirects(self):
        response = self.client.get("/dashboard", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers.get("Location"), "/auth/login")

    def test_competitors_page_management(self):
        # Create a session cookie
        signed_cookie = serializer.dumps({"user_id": str(self.user.id)})
        self.client.cookies.set(SESSION_COOKIE_NAME, signed_cookie)
        
        # 1. GET lists empty list
        response = self.client.get("/competitors")
        self.assertEqual(response.status_code, 200)
        self.assertIn("No competitors added yet", response.text)
        
        # 2. Add competitor
        response = self.client.post("/competitors/add", data={"url": "competitor1.com", "name": "Comp 1"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("competitor1.com", response.text)
        self.assertIn("Comp 1", response.text)
        
        # Verify in DB
        comps = self.db.query(Competitor).filter(Competitor.active == True).all()
        self.assertEqual(len(comps), 1)
        self.assertEqual(comps[0].url, "https://competitor1.com")
        comp_id = comps[0].id
        
        # 3. Add more to test 7 limit
        for i in range(2, 8):
            self.client.post("/competitors/add", data={"url": f"competitor{i}.com"})
            
        # 4. Attempt adding 8th (should fail limit)
        response = self.client.post("/competitors/add", data={"url": "competitor8.com"})
        self.assertIn("Maximum 7 competitors allowed", response.text)
        
        # 5. Remove competitor
        response = self.client.post(f"/competitors/{comp_id}/remove")
        self.assertEqual(response.status_code, 200)
        
        # Verify in DB (soft delete)
        comp_db = self.db.get(Competitor, comp_id)
        self.db.refresh(comp_db)
        self.assertFalse(comp_db.active)
        
        active_comps = self.db.query(Competitor).filter(Competitor.active == True).all()
        self.assertEqual(len(active_comps), 6) # 7 total, minus 1 removed, 8th was rejected

if __name__ == '__main__':
    unittest.main()
