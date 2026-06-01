import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from app.pipeline.classifier import classify_change
from app.pipeline.synthesizer import synthesize_brief

class TestClassifierSynthesizer(unittest.IsolatedAsyncioTestCase):
    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_classify_change_success(self, mock_create):
        # Create a mock response structure
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "pricing_change"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        res = await classify_change("before text", "after text")
        self.assertEqual(res, "pricing_change")
        
        mock_create.assert_called_once()
        kwargs = mock_create.call_args[1]
        self.assertEqual(kwargs["model"], "gpt-4o-mini")
        self.assertEqual(kwargs["temperature"], 0)
        self.assertEqual(kwargs["max_tokens"], 20)

    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_classify_change_fallback_on_invalid(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "invalid_category_123"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        res = await classify_change("before text", "after text")
        self.assertEqual(res, "minor_copy")

    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_classify_change_fallback_on_error(self, mock_create):
        mock_create.side_effect = Exception("API error")

        res = await classify_change("before text", "after text")
        self.assertEqual(res, "minor_copy")

    @patch("app.pipeline.classifier.client.chat.completions.create", new_callable=AsyncMock)
    async def test_classify_change_truncation(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "feature_add"
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        before_long = "A" * 4000
        after_long = "B" * 5000
        await classify_change(before_long, after_long)
        
        user_msg = mock_create.call_args[1]["messages"][1]["content"]
        expected_user_msg = f"BEFORE:\n{'A' * 3000}\n\nAFTER:\n{'B' * 3000}"
        self.assertEqual(user_msg, expected_user_msg)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_synthesize_brief_success(self, mock_create):
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Competitor added pricing page updates."
        mock_response.choices = [mock_choice]
        mock_create.return_value = mock_response

        res = await synthesize_brief("Comp", "https://comp.com", "before", "after", "pricing_change")
        self.assertEqual(res, "Competitor added pricing page updates.")
        mock_create.assert_called_once()
        kwargs = mock_create.call_args[1]
        self.assertEqual(kwargs["model"], "gpt-4o-mini")
        self.assertEqual(kwargs["temperature"], 0.3)
        self.assertEqual(kwargs["max_tokens"], 200)

    @patch("app.pipeline.synthesizer.client.chat.completions.create", new_callable=AsyncMock)
    async def test_synthesize_brief_fallback_on_error(self, mock_create):
        mock_create.side_effect = Exception("API error")

        res = await synthesize_brief("Comp", "https://comp.com", "before", "after", "pricing_change")
        self.assertIn("updated their site this week. Review manually", res)

if __name__ == '__main__':
    unittest.main()
