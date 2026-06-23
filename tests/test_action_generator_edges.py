import unittest
from unittest.mock import patch, MagicMock, AsyncMock

from app.pipeline.action_generator import (
    generate_action,
    generate_actions_for_change,
    _generate_action_heuristically,
)


class TestActionGeneratorEdges(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_unknown_action_type_returns_none_without_api_call(self, mock_create):
        res = await generate_action(
            action_type="totally_unknown",
            competitor_name="Comp",
            competitor_url="https://c.com",
            brief_text="brief",
        )
        self.assertIsNone(res)
        mock_create.assert_not_called()

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_empty_action_type_returns_none(self, mock_create):
        res = await generate_action("", "Comp", "https://c.com", "brief")
        self.assertIsNone(res)
        mock_create.assert_not_called()

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_competitor_label_falls_back_to_url_when_name_empty(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "ok"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        await generate_action(
            action_type="pricing_copy",
            competitor_name="",
            competitor_url="https://fallback.example",
            brief_text="some brief",
        )
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("https://fallback.example", user_msg)
        self.assertIn("some brief", user_msg)

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_competitor_name_used_when_present(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "ok"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        await generate_action(
            action_type="retention_email",
            competitor_name="Acme Corp",
            competitor_url="https://acme.example",
            brief_text="raised prices",
            user_description="enterprise teams",
        )
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        self.assertIn("Acme Corp", user_msg)
        self.assertIn("enterprise teams", user_msg)
        self.assertNotIn("https://acme.example", user_msg)

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_response_content_is_stripped(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "   padded draft \n"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        res = await generate_action("social_draft", "Comp", "https://c.com", "brief")
        self.assertEqual(res, "padded draft")

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_failure_uses_url_in_heuristic_when_name_empty(self, mock_create):
        mock_create.side_effect = RuntimeError("boom")

        res = await generate_action(
            action_type="retention_email",
            competitor_name="",
            competitor_url="https://x.example",
            brief_text="brief",
            user_description="indie hackers",
        )
        self.assertIsNotNone(res)
        self.assertIn("indie hackers", res)
        self.assertTrue(res.startswith("Hi [Name],"))

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_failure_pricing_copy_heuristic(self, mock_create):
        mock_create.side_effect = Exception("down")
        res = await generate_action("pricing_copy", "Comp", "https://c.com", "b")
        self.assertIsNotNone(res)
        self.assertIn("SaaS founders and small teams", res)
        self.assertTrue(res.lstrip().startswith("1."))

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_failure_feature_response_heuristic(self, mock_create):
        mock_create.side_effect = Exception("down")
        res = await generate_action("feature_response", "Comp", "https://c.com", "b")
        self.assertIsNotNone(res)
        self.assertIn("the productivity workspace is heating up", res)

    def test_heuristic_unknown_type_returns_none(self):
        self.assertIsNone(
            _generate_action_heuristically("nonexistent", "Comp", "brief", "desc")
        )

    @patch("app.pipeline.action_generator.generate_action")
    async def test_unknown_change_type_returns_empty(self, mock_generate):
        mock_generate.side_effect = AssertionError("should not be called")
        res = await generate_actions_for_change("invented_type", "Comp", "http://c", "b")
        self.assertEqual(res, [])
        mock_generate.assert_not_called()

    @patch("app.pipeline.action_generator.generate_action")
    async def test_all_actions_fail_returns_empty_list(self, mock_generate):
        mock_generate.return_value = None
        res = await generate_actions_for_change("feature_add", "Comp", "http://c", "b")
        self.assertEqual(res, [])
        self.assertEqual(mock_generate.call_count, 2)

    @patch("app.pipeline.action_generator.generate_action")
    async def test_empty_string_draft_is_skipped(self, mock_generate):
        mock_generate.side_effect = ["", "real copy"]
        res = await generate_actions_for_change("pricing_change", "Comp", "http://c", "b")
        self.assertEqual(res, [("pricing_copy", "real copy")])


if __name__ == "__main__":
    unittest.main()
