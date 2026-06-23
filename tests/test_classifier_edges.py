import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from app.pipeline.classifier import classify_change, _classify_heuristically


def _mock_response(content):
    resp = MagicMock()
    choice = MagicMock()
    choice.message.content = content
    resp.choices = [choice]
    return resp


class TestHeuristic(unittest.TestCase):
    def test_identical_text_returns_no_change(self):
        self.assertEqual(_classify_heuristically("Same Text", "Same Text"), "no_change")

    def test_identical_after_case_fold_returns_no_change(self):
        # comparison is case-insensitive (both lowercased)
        self.assertEqual(_classify_heuristically("HELLO World", "hello world"), "no_change")

    def test_pricing_keyword_detected(self):
        self.assertEqual(
            _classify_heuristically("Our product is great", "Our product is great. New pricing tiers"),
            "pricing_change",
        )

    def test_dollar_sign_detected_as_pricing(self):
        self.assertEqual(
            _classify_heuristically("Free forever", "Now only $49 a month"),
            "pricing_change",
        )

    def test_feature_keyword_detected(self):
        self.assertEqual(
            _classify_heuristically("Welcome to our site", "Announcing our new Copilot"),
            "feature_add",
        )

    def test_repositioning_keyword_detected(self):
        self.assertEqual(
            _classify_heuristically("A simple tool", "The operating system for sales teams"),
            "repositioning",
        )

    def test_unmatched_change_falls_to_minor_copy(self):
        self.assertEqual(
            _classify_heuristically("The quick brown fox", "The quick brown foxes"),
            "minor_copy",
        )

    def test_keyword_present_in_both_does_not_trigger(self):
        # pricing already present in before -> not a new pricing change
        self.assertEqual(
            _classify_heuristically("Our pricing rocks", "Our pricing rocks now even more text"),
            "minor_copy",
        )

    def test_pricing_takes_priority_over_feature(self):
        # both pricing and feature keywords new; pricing checked first
        self.assertEqual(
            _classify_heuristically("base", "new pricing and announcing copilot"),
            "pricing_change",
        )


class TestClassifyChangeEdges(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.classifier.note_degraded")
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_valid_label_with_whitespace_and_caps_normalized(self, mock_create, mock_note):
        mock_create.return_value = _mock_response("  Feature_Add\n")
        res = await classify_change("before", "after")
        self.assertEqual(res, "feature_add")
        mock_note.assert_not_called()

    @patch("app.pipeline.classifier.note_degraded")
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_no_change_is_valid_label(self, mock_create, mock_note):
        mock_create.return_value = _mock_response("no_change")
        res = await classify_change("x", "x")
        self.assertEqual(res, "no_change")
        mock_note.assert_not_called()

    @patch("app.pipeline.classifier.note_degraded")
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_unexpected_label_notes_degraded_and_uses_heuristic(self, mock_create, mock_note):
        mock_create.return_value = _mock_response("garbage_label")
        # heuristic should detect pricing via new "$"
        res = await classify_change("free plan", "now $99 plan")
        self.assertEqual(res, "pricing_change")
        mock_note.assert_called_once_with("classifier", "heuristic", "unexpected_label")

    @patch("app.pipeline.classifier.note_degraded")
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_api_error_notes_degraded_with_exception(self, mock_create, mock_note):
        boom = RuntimeError("boom")
        mock_create.side_effect = boom
        res = await classify_change("a", "announcing our new feature")
        self.assertEqual(res, "feature_add")
        mock_note.assert_called_once_with("classifier", "heuristic", "api_error", boom)

    @patch("app.pipeline.classifier.note_degraded")
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_heuristic_runs_on_truncated_text_after_error(self, mock_create, mock_note):
        # keyword only appears beyond 3000 char cutoff -> heuristic should NOT see it
        mock_create.side_effect = Exception("err")
        before = "x" * 3100
        after = "x" * 3000 + " announcing our new feature"
        res = await classify_change(before, after)
        # truncated after == truncated before (both 3000 'x') -> no_change
        self.assertEqual(res, "no_change")

    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_empty_strings_classified_as_no_change_on_error(self, mock_create):
        mock_create.side_effect = Exception("err")
        res = await classify_change("", "")
        self.assertEqual(res, "no_change")


if __name__ == "__main__":
    unittest.main()
