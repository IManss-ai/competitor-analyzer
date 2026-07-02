"""Weekly-brief mailer tests.

Regression guard for the bug where app/mailer.py called the FastAPI *route*
function `generate_battlecard(str(comp.id), db)` — whose real signature is
`(competitor_id, force=False, db=Depends(...), user_id=Depends(...))`. Called
positionally, `db` bound to `force`, the real deps never resolved, the call
threw, the `except Exception` swallowed it, and every weekly email shipped with
`key_talking_point=None`. The subject promised "your battle cards are ready" while
the per-competitor talking point was silently always blank.

The fix calls the plain helper `get_or_generate_battlecard(comp, db)`. This test
asserts the rendered email body actually carries a talking point — not merely
that the call no longer throws.
"""
import io
import contextlib
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import User, Competitor, Snapshot, ChangeEvent
from app.mailer import send_weekly_brief


class TestWeeklyBriefTalkingPoint(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

        db = self.SessionLocal()
        self.user = User(email="brief@example.com")
        db.add(self.user)
        db.commit()
        db.refresh(self.user)

        self.comp = Competitor(
            user_id=self.user.id,
            url="https://rival.example.com",
            name="SaaS Rival",
            business_type="saas",
            active=True,
        )
        db.add(self.comp)
        db.commit()
        db.refresh(self.comp)

        # A real diff so the battle card takes the has_change heuristic path.
        before = Snapshot(competitor_id=self.comp.id, raw_text="Old pricing copy", char_count=16)
        after = Snapshot(competitor_id=self.comp.id, raw_text="New, longer pricing copy here", char_count=29)
        db.add_all([before, after])
        db.commit()
        db.refresh(before)
        db.refresh(after)
        db.add(ChangeEvent(
            competitor_id=self.comp.id,
            snapshot_before_id=before.id,
            snapshot_after_id=after.id,
            net_char_delta=120,
            change_type="pricing_change",
            brief_text="SaaS Rival moved enterprise pricing behind a custom quote.",
            week_label="2026-W27",
        ))
        db.commit()
        self.user_id = str(self.user.id)
        self.comp_name = self.comp.name
        db.close()

    def tearDown(self):
        Base.metadata.drop_all(self.engine)

    async def test_weekly_brief_body_contains_a_talking_point(self):
        change_summaries = [{"competitor_name": self.comp_name, "brief_text": "Pricing page updated"}]
        buf = io.StringIO()
        # RESEND_API_KEY="" → local-dev branch prints the text body and returns True.
        # ai_available=False → heuristic card (no network), which still carries a playbook.
        with patch("app.db.SessionLocal", self.SessionLocal), \
             patch("app.mailer.RESEND_API_KEY", ""), \
             patch("app.llm.ai_available", return_value=False), \
             contextlib.redirect_stdout(buf):
            sent = await send_weekly_brief(
                user_email="brief@example.com",
                user_id=self.user_id,
                change_summaries=change_summaries,
                pending_action_count=0,
            )
        output = buf.getvalue()
        self.assertTrue(sent)
        # Line 106 only emits "Key Talking Point:" when the value is truthy — its
        # presence proves the talking point was actually populated (the bug's fix).
        self.assertIn("Key Talking Point:", output)
        # And it must be a non-empty string on that line, not a blank/None.
        line = next(l for l in output.splitlines() if l.startswith("Key Talking Point:"))
        value = line.split("Key Talking Point:", 1)[1].strip()
        self.assertTrue(value, f"talking point line is empty: {line!r}")
        self.assertNotIn("None", value)


if __name__ == "__main__":
    unittest.main()
