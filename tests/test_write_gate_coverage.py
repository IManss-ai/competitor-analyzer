"""Default-deny paywall coverage: every mutating endpoint is write-gated or allowlisted.

The require_write_access gate was added endpoint-by-endpoint four separate times
(abfb271 detail, then scan, then campaigns/onboarding in 118b75c) — a recurring
bypass class where a NEW paid endpoint ships open by default. This suite ends
that class structurally:

1. A coverage test walks every registered route. Any POST/PUT/PATCH/DELETE
   endpoint must either carry require_write_access / require_write_access_session
   in its dependency tree, or sit in the explicit ALLOWLIST below with a reason.
   A new mutating endpoint fails this test until the author makes the decision.
2. A staleness check keeps the ALLOWLIST honest: entries that no longer exist or
   have since gained a gate must be removed.
3. Behavior tests pin the new shared session-cookie gate (scan/queue/competitors
   legacy routes) and the endpoints gated in this pass (track, probe-careers,
   local PATCH): locked users get 402, full users pass, no paid work runs.

Known non-structural exception: GET /api/v1/battlecards/generate/{id} does paid
work behind an INLINE is_read_only check (kept inline because its 403-ownership-
before-402 ordering and free_test_used marking are pinned by the cost-guard
tests). It is a GET, so it is out of scope for the method-based sweep here.
"""
import unittest
import uuid
from unittest.mock import patch

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.db import Base, get_session
from app.models import User, Competitor
from app.access import require_write_access

try:
    from app.access import require_write_access_session
except ImportError:  # pre-implementation: coverage test below reports the gaps
    require_write_access_session = None

MUTATING = {"POST", "PUT", "PATCH", "DELETE"}

# Mutating endpoints that are INTENTIONALLY not paywalled. Every entry needs a
# reason. Adding an endpoint here is a reviewed decision, not a default.
ALLOWLIST = {
    # Authentication must be reachable by everyone, including locked users.
    ("POST", "/auth/login"): "legacy HTML login form",
    ("POST", "/api/v1/auth/login"): "magic-link login",
    ("POST", "/api/v1/auth/direct-login"): "password login / instant signup",
    ("POST", "/api/v1/auth/exchange"): "session-token exchange",
    # Billing: a locked user MUST be able to pay; webhook is Polar server-side
    # (verified by signature inside the handler, not by user auth).
    ("POST", "/billing/webhook"): "Polar webhook, signature-verified",
    # Free writes: no paid work triggered, no paid value delivered.
    ("DELETE", "/api/v1/competitors/{competitor_id}"): "cleanup, reduces our cost",
    ("POST", "/competitors/{competitor_id}/remove"): "legacy HTML cleanup",
    ("PATCH", "/api/v1/settings"): "account/notification prefs",
    ("POST", "/api/v1/plan-items/{item_id}/status"): "progress flag on existing plan",
    ("POST", "/api/v1/onboarding/business-type"): "one-time profile field",
}


def _gate_calls():
    calls = {require_write_access}
    if require_write_access_session is not None:
        calls.add(require_write_access_session)
    return calls


def _has_write_gate(dependant, gates) -> bool:
    for dep in dependant.dependencies:
        if dep.call in gates or _has_write_gate(dep, gates):
            return True
    return False


def _mutating_routes():
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in sorted(route.methods & MUTATING):
            yield method, route


class TestWriteGateCoverage(unittest.TestCase):
    """Structural default-deny: the tests every future paid endpoint must face."""

    def test_every_mutating_endpoint_gated_or_allowlisted(self):
        gates = _gate_calls()
        ungated = [
            f"{method} {route.path} ({route.endpoint.__module__}.{route.endpoint.__name__})"
            for method, route in _mutating_routes()
            if (method, route.path) not in ALLOWLIST
            and not _has_write_gate(route.dependant, gates)
        ]
        self.assertEqual(
            ungated,
            [],
            "Mutating endpoints without a paywall write gate. Either add "
            "Depends(require_write_access) (Bearer routes) / "
            "Depends(require_write_access_session) (session-cookie routes), or — "
            "if the endpoint is genuinely free — add it to ALLOWLIST in "
            "tests/test_write_gate_coverage.py with a reason:\n  "
            + "\n  ".join(ungated),
        )

    def test_allowlist_has_no_stale_entries(self):
        gates = _gate_calls()
        live = {
            (method, route.path): _has_write_gate(route.dependant, gates)
            for method, route in _mutating_routes()
        }
        missing = [key for key in ALLOWLIST if key not in live]
        self.assertEqual(missing, [], f"ALLOWLIST entries for routes that no longer exist: {missing}")
        now_gated = [key for key in ALLOWLIST if live.get(key)]
        self.assertEqual(now_gated, [], f"ALLOWLIST entries that are now gated — remove them: {now_gated}")


class _PaywallClientCase(unittest.TestCase):
    """Shared fixture: in-memory DB, TestClient, locked + full users."""

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

    def _make_user(self, email, free_test_used):
        user = User(email=email, free_test_used=free_test_used)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _make_comp(self, user):
        comp = Competitor(user_id=user.id, url="https://rival.example.com", name="Rival")
        self.db.add(comp)
        self.db.commit()
        self.db.refresh(comp)
        return comp

    def _login_session(self, user):
        """Route session-cookie auth to this user."""
        from app.session import require_current_user

        app.dependency_overrides[require_current_user] = lambda: str(user.id)

    def _paywall_on(self):
        return patch("app.access.PAYWALL_ENABLED", True)

    def _no_comps(self):
        return patch("app.access.COMPED_EMAILS", set())


class TestSessionWriteGate(_PaywallClientCase):
    """require_write_access_session on the legacy session-cookie routes."""

    def test_scan_now_locked_user_402_and_no_scan_starts(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        self._login_session(user)
        with self._paywall_on(), self._no_comps(), \
             patch("app.routes.scan._run_scan_background") as run:
            res = self.client.post("/scan/now")
        self.assertEqual(res.status_code, 402)
        run.assert_not_called()

    def test_scan_now_full_user_passes(self):
        user = self._make_user("full@example.com", free_test_used=False)
        self._login_session(user)
        with self._paywall_on(), self._no_comps(), \
             patch("app.routes.scan._run_scan_background") as run:
            res = self.client.post("/scan/now")
        self.assertEqual(res.status_code, 200)
        run.assert_called_once()

    def test_queue_approve_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        self._login_session(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.post(f"/queue/{uuid.uuid4()}/approve")
        self.assertEqual(res.status_code, 402)

    def test_queue_dismiss_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        self._login_session(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.post(f"/queue/{uuid.uuid4()}/dismiss")
        self.assertEqual(res.status_code, 402)

    def test_legacy_add_competitor_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        self._login_session(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.post("/competitors/add", data={"url": "https://x.example.com"})
        self.assertEqual(res.status_code, 402)

    def test_paywall_disabled_locked_user_passes(self):
        """Feature flag off -> the gate is inert (prod default until enabled)."""
        user = self._make_user("locked@example.com", free_test_used=True)
        self._login_session(user)
        with patch("app.access.PAYWALL_ENABLED", False), \
             patch("app.routes.scan._run_scan_background"):
            res = self.client.post("/scan/now")
        self.assertEqual(res.status_code, 200)


class TestNewlyGatedBearerEndpoints(_PaywallClientCase):
    """Endpoints found open in this sweep now 402 for locked users."""

    def test_track_app_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        with self._paywall_on(), self._no_comps():
            res = self.client.post(
                "/api/v1/apps/some-app/track",
                headers={"Authorization": f"Bearer {user.id}"},
            )
        self.assertEqual(res.status_code, 402)

    def test_probe_careers_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.post(
                f"/api/v1/competitors/{comp.id}/probe-careers",
                headers={"Authorization": f"Bearer {user.id}"},
            )
        self.assertEqual(res.status_code, 402)

    def test_local_patch_locked_user_402(self):
        user = self._make_user("locked@example.com", free_test_used=True)
        comp = self._make_comp(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.patch(
                f"/api/v1/local/competitors/{comp.id}",
                json={"instagram_handle": "@rival"},
                headers={"Authorization": f"Bearer {user.id}"},
            )
        self.assertEqual(res.status_code, 402)

    def test_local_patch_full_user_passes(self):
        user = self._make_user("full@example.com", free_test_used=False)
        comp = self._make_comp(user)
        with self._paywall_on(), self._no_comps():
            res = self.client.patch(
                f"/api/v1/local/competitors/{comp.id}",
                json={"instagram_handle": "@rival"},
                headers={"Authorization": f"Bearer {user.id}"},
            )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["instagram_handle"], "@rival")


if __name__ == "__main__":
    unittest.main()
