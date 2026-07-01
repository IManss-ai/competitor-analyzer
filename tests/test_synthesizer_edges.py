import unittest
from unittest.mock import patch, MagicMock, AsyncMock

import app.llm as llm
from app.pipeline.synthesizer import (
    synthesize_brief,
    summarize_competitor_profile,
    _synthesize_heuristically,
    _summarize_profile_heuristically,
)


def _mock_completion(content):
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_response.choices = [mock_choice]
    return mock_response


class TestSynthesizeBriefEdges(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_response_is_stripped(self, mock_create):
        mock_create.return_value = _mock_completion("   padded brief.  \n")
        res = await synthesize_brief("Comp", "https://comp.com", "b", "a", "feature_add")
        self.assertEqual(res, "padded brief.")

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_inputs_truncated_to_2500(self, mock_create):
        mock_create.return_value = _mock_completion("ok")
        before_long = "X" * 4000
        after_long = "Y" * 6000
        await synthesize_brief("Comp", "https://comp.com", before_long, after_long, "minor_copy")
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("BEFORE:\n" + "X" * 2500 + "\n\n", user_msg)
        self.assertIn("AFTER:\n" + "Y" * 2500, user_msg)
        self.assertNotIn("X" * 2501, user_msg)
        self.assertNotIn("Y" * 2501, user_msg)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_empty_name_falls_back_to_url_in_prompt(self, mock_create):
        mock_create.return_value = _mock_completion("ok")
        await synthesize_brief("", "https://comp.com", "b", "a", "pricing_change")
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("Competitor: https://comp.com", user_msg)

    @patch("app.pipeline.synthesizer.note_degraded")
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_uses_url_when_name_empty_and_records_degraded(self, mock_create, mock_note):
        mock_create.side_effect = Exception("boom")
        res = await synthesize_brief("", "https://comp.com", "b", "a", "pricing_change")
        self.assertIn("https://comp.com", res)
        self.assertIn("changed their pricing", res)
        # Heuristic must not fabricate specific prices (data-honesty; see
        # tests/test_synthesizer_honesty.py).
        self.assertNotIn("$", res)
        mock_note.assert_called_once()
        args = mock_note.call_args[0]
        self.assertEqual(args[0], "synthesizer")
        self.assertEqual(args[1], "heuristic")
        self.assertEqual(args[2], "api_error")

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_feature_add_branch(self, mock_create):
        mock_create.side_effect = Exception("boom")
        res = await synthesize_brief("Acme", "u", "b", "a", "feature_add")
        self.assertIn("shipped a feature", res)
        self.assertTrue(res.startswith("Acme"))

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_repositioning_branch(self, mock_create):
        mock_create.side_effect = Exception("boom")
        res = await synthesize_brief("Acme", "u", "b", "a", "repositioning")
        self.assertIn("shifted how they position themselves", res)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_unknown_change_type_default_branch(self, mock_create):
        mock_create.side_effect = Exception("boom")
        res = await synthesize_brief("Acme", "u", "b", "a", "something_else")
        self.assertIn("minor copy or layout updates", res)


class TestHeuristicSynthesize(unittest.TestCase):
    def test_minor_copy_maps_to_default(self):
        res = _synthesize_heuristically("Acme", "minor_copy")
        self.assertIn("minor copy or layout updates", res)

    def test_each_branch_distinct(self):
        pricing = _synthesize_heuristically("N", "pricing_change")
        feature = _synthesize_heuristically("N", "feature_add")
        repos = _synthesize_heuristically("N", "repositioning")
        self.assertNotEqual(pricing, feature)
        self.assertNotEqual(feature, repos)
        self.assertNotEqual(pricing, repos)


class TestSummarizeProfileEdges(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_response_stripped(self, mock_create):
        mock_create.return_value = _mock_completion("  profile brief  ")
        res = await summarize_competitor_profile("Comp", "https://c.com", "content here")
        self.assertEqual(res, "profile brief")
        kwargs = mock_create.call_args[1]
        self.assertEqual(kwargs["model"], llm.MODEL)
        self.assertEqual(kwargs["max_tokens"], 220)
        self.assertEqual(kwargs["temperature"], 0.3)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_content_truncated_to_3500(self, mock_create):
        mock_create.return_value = _mock_completion("ok")
        await summarize_competitor_profile("Comp", "https://c.com", "Z" * 5000)
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("Z" * 3500, user_msg)
        self.assertNotIn("Z" * 3501, user_msg)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_none_content_does_not_crash(self, mock_create):
        mock_create.return_value = _mock_completion("ok")
        res = await summarize_competitor_profile("Comp", "https://c.com", None)
        self.assertEqual(res, "ok")
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("CURRENT HOMEPAGE CONTENT:\n", user_msg)

    @patch("app.pipeline.synthesizer.note_degraded")
    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_on_error_with_content(self, mock_create, mock_note):
        mock_create.side_effect = Exception("boom")
        res = await summarize_competitor_profile("Acme", "https://c.com", "We build CRM software for sales teams")
        self.assertIn("Now tracking Acme", res)
        self.assertIn("We build CRM software", res)
        mock_note.assert_called_once()

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_fallback_empty_name_uses_url(self, mock_create):
        mock_create.side_effect = Exception("boom")
        res = await summarize_competitor_profile("", "https://c.com", "stuff")
        self.assertIn("https://c.com", res)


class TestHeuristicProfile(unittest.TestCase):
    def test_empty_content_uses_no_snippet_branch(self):
        res = _summarize_profile_heuristically("Acme", "")
        self.assertIn("Now tracking Acme", res)
        self.assertIn("captured a baseline", res)
        self.assertNotIn("here's what's on their page right now", res)

    def test_none_content_uses_no_snippet_branch(self):
        res = _summarize_profile_heuristically("Acme", None)
        self.assertIn("Now tracking Acme", res)
        self.assertNotIn("here's what's on their page right now", res)

    def test_whitespace_only_content_uses_no_snippet_branch(self):
        res = _summarize_profile_heuristically("Acme", "   \n\t  ")
        self.assertNotIn("here's what's on their page right now", res)

    def test_content_collapses_whitespace_and_truncates_to_240(self):
        content = "word " * 200
        res = _summarize_profile_heuristically("Acme", content)
        self.assertIn("here's what's on their page right now", res)
        self.assertNotIn("  ", res)

    def test_snippet_present_branch_includes_content(self):
        res = _summarize_profile_heuristically("Acme", "Unique product description sentence.")
        self.assertIn("Unique product description sentence.", res)


if __name__ == "__main__":
    unittest.main()
