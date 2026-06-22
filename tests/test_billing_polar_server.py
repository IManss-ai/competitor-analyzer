"""Polar client is constructed against the configured server (sandbox vs prod).

POLAR_SERVER lets us run sandbox for testing and production for launch without
code edits. Every Polar client goes through billing._get_polar(), so that is the
single switch point to assert.
"""
import unittest
from unittest.mock import patch

import app.billing as billing


class TestPolarServerConfig(unittest.TestCase):
    @patch("polar_sdk.Polar")
    def test_get_polar_uses_configured_server_sandbox(self, mock_polar):
        with patch.object(billing, "POLAR_SERVER", "sandbox"), \
             patch.object(billing, "POLAR_ACCESS_TOKEN", "tok_sandbox"):
            billing._get_polar()
        mock_polar.assert_called_once_with(access_token="tok_sandbox", server="sandbox")

    @patch("polar_sdk.Polar")
    def test_get_polar_uses_configured_server_production(self, mock_polar):
        with patch.object(billing, "POLAR_SERVER", "production"), \
             patch.object(billing, "POLAR_ACCESS_TOKEN", "tok_prod"):
            billing._get_polar()
        mock_polar.assert_called_once_with(access_token="tok_prod", server="production")

    def test_default_server_is_production(self):
        # A missing POLAR_SERVER must default to production so a launch deploy is
        # never accidentally pointed at sandbox.
        from app.config import POLAR_SERVER
        self.assertEqual(POLAR_SERVER, "production")

    def test_sdk_accepts_both_server_values(self):
        # Guards against an SDK upgrade that drops/renames the server kwarg.
        from polar_sdk import Polar
        for srv in ("sandbox", "production"):
            client = Polar(access_token="dummy", server=srv)
            self.assertIsNotNone(client)


if __name__ == "__main__":
    unittest.main()
