import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from app.pipeline.action_generator import generate_action, generate_actions_for_change

class TestActionGenerator(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_generate_action_success(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Draft response content here."
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        # Test each valid action type
        for action_type in ["retention_email", "pricing_copy", "feature_response", "social_draft"]:
            res = await generate_action(
                action_type=action_type,
                competitor_name="Competitor X",
                competitor_url="https://x.com",
                brief_text="Brief text about change"
            )
            self.assertEqual(res, "Draft response content here.")
            
        # Verify call attributes for the last call
        mock_create.assert_called()
        kwargs = mock_create.call_args[1]
        self.assertEqual(kwargs["model"], "gpt-4o")
        self.assertEqual(kwargs["temperature"], 0.7)
        self.assertEqual(kwargs["max_tokens"], 400)

    @patch("app.pipeline.action_generator.client.chat.completions.create", new_callable=AsyncMock)
    async def test_generate_action_failure(self, mock_create):
        mock_create.side_effect = Exception("API error")

        res = await generate_action(
            action_type="social_draft",
            competitor_name="Competitor X",
            competitor_url="https://x.com",
            brief_text="Brief text"
        )
        self.assertIsNotNone(res)
        self.assertIn("Competitors are launching AI assistants", res)

    @patch("app.pipeline.action_generator.generate_action")
    async def test_generate_actions_for_change_mappings(self, mock_generate):
        mock_generate.side_effect = lambda action_type, *args, **kwargs: f"Draft of {action_type}"

        # 1. pricing_change -> retention_email, pricing_copy
        res = await generate_actions_for_change("pricing_change", "Comp", "http://c.com", "brief")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0], ("retention_email", "Draft of retention_email"))
        self.assertEqual(res[1], ("pricing_copy", "Draft of pricing_copy"))

        # 2. feature_add -> feature_response, social_draft
        res = await generate_actions_for_change("feature_add", "Comp", "http://c.com", "brief")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0], ("feature_response", "Draft of feature_response"))
        self.assertEqual(res[1], ("social_draft", "Draft of social_draft"))

        # 3. repositioning -> pricing_copy, social_draft
        res = await generate_actions_for_change("repositioning", "Comp", "http://c.com", "brief")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0], ("pricing_copy", "Draft of pricing_copy"))
        self.assertEqual(res[1], ("social_draft", "Draft of social_draft"))

        # 4. minor_copy -> empty
        res = await generate_actions_for_change("minor_copy", "Comp", "http://c.com", "brief")
        self.assertEqual(res, [])

        # 5. no_change -> empty
        res = await generate_actions_for_change("no_change", "Comp", "http://c.com", "brief")
        self.assertEqual(res, [])

    @patch("app.pipeline.action_generator.generate_action")
    async def test_generate_actions_for_change_partial_failure(self, mock_generate):
        # First fails, second succeeds
        mock_generate.side_effect = [None, "Success copy"]

        res = await generate_actions_for_change("pricing_change", "Comp", "http://c.com", "brief")
        # should skip the failed one
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0], ("pricing_copy", "Success copy"))

if __name__ == '__main__':
    unittest.main()
