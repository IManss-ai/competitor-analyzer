"""Magic onboarding — profiler + discovery honesty behaviors.

Network boundaries (scraper sidecar, DeepSeek) are mocked so tests are
deterministic and offline.
"""
import json
import unittest
from unittest.mock import AsyncMock, patch

from app.onboarding import profiler, discovery


def _fake_ai_client(content: str):
    """Build a fake AsyncOpenAI-style client whose chat.completions.create
    returns `content` as the message."""
    class _Msg:
        def __init__(self, c): self.message = type("M", (), {"content": c})
    class _Resp:
        def __init__(self, c): self.choices = [_Msg(c)]
    client = AsyncMock()
    client.chat.completions.create = AsyncMock(return_value=_Resp(content))
    return client


class ProfilerTests(unittest.IsolatedAsyncioTestCase):
    async def test_ai_profile_parsed(self):
        text = "Acme runs projects for software teams. Features: boards, sprints, automation."
        ai_json = json.dumps({
            "name": "Acme", "one_liner": "Project management for software teams",
            "category": "project management SaaS", "target_customer": "software teams",
            "positioning": "Faster than Jira", "key_features": ["boards", "sprints"],
            "is_saas": True,
        })
        with patch.object(profiler, "fetch_site_text", AsyncMock(return_value=(text, "<html></html>"))), \
             patch.object(profiler.llm, "ai_available", return_value=True), \
             patch.object(profiler.llm, "get_async_client", return_value=_fake_ai_client(ai_json)):
            p = await profiler.profile_business("https://acme.com")
        self.assertEqual(p["name"], "Acme")
        self.assertEqual(p["category"], "project management SaaS")
        self.assertTrue(p["is_saas"])
        self.assertEqual(p["source"], "ai")

    async def test_unreadable_site_falls_back_not_crashes(self):
        with patch.object(profiler, "fetch_site_text", AsyncMock(return_value=("", ""))):
            p = await profiler.profile_business("https://unreachable.example")
        self.assertEqual(p["source"], "fallback")
        self.assertTrue(p["name"])  # derived from domain, never empty
        self.assertEqual(p["key_features"], [])

    async def test_ai_unavailable_falls_back(self):
        with patch.object(profiler, "fetch_site_text", AsyncMock(return_value=("some text", "raw"))), \
             patch.object(profiler.llm, "ai_available", return_value=False):
            p = await profiler.profile_business("https://acme.com")
        self.assertEqual(p["source"], "fallback")

    def test_socials_extracted_and_share_links_skipped(self):
        raw = ('<a href="https://twitter.com/acme">x</a>'
               '<a href="https://www.linkedin.com/company/acme">li</a>'
               '<a href="https://twitter.com/intent/tweet?text=hi">share</a>')
        socials = profiler._extract_socials(raw)
        self.assertIn("https://twitter.com/acme", socials)
        self.assertIn("https://www.linkedin.com/company/acme", socials)
        self.assertFalse(any("intent" in s for s in socials))


class DiscoveryTests(unittest.IsolatedAsyncioTestCase):
    SAAS_PROFILE = {"name": "Acme", "category": "project management SaaS",
                    "is_saas": True, "business_url": "https://acme.com"}

    async def test_local_business_returns_no_autodiscovery(self):
        out = await discovery.discover_competitors({"is_saas": False})
        self.assertEqual(out["competitors"], [])
        self.assertEqual(out["reason"], "local")

    async def test_unreachable_candidates_are_dropped(self):
        candidates = [
            {"name": "Jira", "url": "https://jira.com", "why": "rival"},
            {"name": "Ghost", "url": "https://hallucinated-not-real.xyz", "why": "rival"},
        ]
        async def fake_fetch(url):
            return ("real content", "raw") if "jira" in url else ("", "")
        with patch.object(discovery, "suggest_competitors", AsyncMock(return_value=candidates)), \
             patch.object(discovery, "fetch_site_text", AsyncMock(side_effect=fake_fetch)):
            out = await discovery.discover_competitors(self.SAAS_PROFILE)
        urls = [c["url"] for c in out["competitors"]]
        self.assertIn("https://jira.com", urls)
        self.assertNotIn("https://hallucinated-not-real.xyz", urls)
        self.assertEqual(out["reason"], "low_confidence")  # only 1 verified (< MIN_VALID)

    async def test_suggest_filters_own_domain_and_dedups(self):
        ai_json = json.dumps({"competitors": [
            {"name": "Self", "url": "https://acme.com", "why": "itself"},
            {"name": "Jira", "url": "jira.com", "why": "rival"},
            {"name": "Jira dup", "url": "https://www.jira.com/pricing", "why": "dup"},
        ]})
        with patch.object(discovery.llm, "ai_available", return_value=True), \
             patch.object(discovery.llm, "get_async_client", return_value=_fake_ai_client(ai_json)):
            out = await discovery.suggest_competitors(self.SAAS_PROFILE)
        domains = [discovery._norm_domain(c["url"]) for c in out]
        self.assertNotIn("acme.com", domains)   # own domain filtered
        self.assertEqual(domains.count("jira.com"), 1)  # deduped
        self.assertTrue(out[0]["url"].startswith("http"))  # scheme normalized


if __name__ == "__main__":
    unittest.main()
