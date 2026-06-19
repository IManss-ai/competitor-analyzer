import unittest
from unittest.mock import patch
import app.llm as llm


class TestLlm(unittest.TestCase):
    def test_model_constants(self):
        self.assertEqual(llm.MODEL, "deepseek-v4-flash")
        self.assertEqual(llm.MODEL_FLAGSHIP, "deepseek-v4-pro")

    def test_ai_available_false_when_unset(self):
        with patch("app.llm.DEEPSEEK_API_KEY", ""):
            self.assertFalse(llm.ai_available())

    def test_ai_available_false_when_dummy(self):
        with patch("app.llm.DEEPSEEK_API_KEY", "dummy"):
            self.assertFalse(llm.ai_available())

    def test_ai_available_true_with_real_key(self):
        with patch("app.llm.DEEPSEEK_API_KEY", "sk-real-key-123"):
            self.assertTrue(llm.ai_available())

    def test_async_client_uses_deepseek_base_url(self):
        client = llm.get_async_client()
        self.assertEqual(str(client.base_url).rstrip("/"), "https://api.deepseek.com")

    def test_sync_client_uses_deepseek_base_url(self):
        client = llm.get_sync_client()
        self.assertEqual(str(client.base_url).rstrip("/"), "https://api.deepseek.com")


if __name__ == "__main__":
    unittest.main()
