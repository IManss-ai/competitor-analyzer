import unittest
from unittest.mock import patch, MagicMock

from app.billing import create_checkout_session, create_portal_session


class TestCreateCheckoutSessionEdges(unittest.IsolatedAsyncioTestCase):
    """Edge / error-path coverage for app.billing.create_checkout_session."""

    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "")
    async def test_saas_plan_raises_when_product_not_configured(self):
        """Default plan_type='saas' raises ValueError naming the plan when SAAS product id is empty."""
        with self.assertRaises(ValueError) as ctx:
            await create_checkout_session("a@b.com", "user-1")
        self.assertIn("saas", str(ctx.exception))

    @patch("app.billing.POLAR_ACCESS_TOKEN", "")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    async def test_raises_when_access_token_missing_even_with_product(self):
        """Product configured but no access token -> ValueError about the token, before any Polar call."""
        with patch("app.billing._get_polar") as mock_get_polar:
            with self.assertRaises(ValueError) as ctx:
                await create_checkout_session("a@b.com", "user-1")
        self.assertIn("POLAR_ACCESS_TOKEN", str(ctx.exception))
        mock_get_polar.assert_not_called()

    @patch("app.billing._get_polar")
    @patch("app.billing.APP_BASE_URL", "https://app.rivalscope.test")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_default_success_url_derived_from_app_base_url(self, mock_get_polar):
        """When no success_url given, it defaults to APP_BASE_URL + /billing/success."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/x"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        await create_checkout_session("a@b.com", "user-1")

        req = mock_polar.checkouts.create.call_args.kwargs["request"]
        self.assertEqual(req.success_url, "https://app.rivalscope.test/billing/success")

    @patch("app.billing._get_polar")
    @patch("app.billing.APP_BASE_URL", "https://app.rivalscope.test")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_explicit_success_url_overrides_default(self, mock_get_polar):
        """An explicit success_url is used verbatim, not the APP_BASE_URL default."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/x"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        await create_checkout_session(
            "a@b.com", "user-1", success_url="https://custom.example/done"
        )

        req = mock_polar.checkouts.create.call_args.kwargs["request"]
        self.assertEqual(req.success_url, "https://custom.example/done")

    @patch("app.billing._get_polar")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_metadata_and_email_and_product_passed_for_saas(self, mock_get_polar):
        """Default plan packs email, the SAAS product id, and metadata{user_id, plan_type='saas'}."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/saas"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        url = await create_checkout_session("buyer@corp.com", "user-99")

        self.assertEqual(url, "https://checkout.polar.sh/saas")
        req = mock_polar.checkouts.create.call_args.kwargs["request"]
        self.assertEqual(req.customer_email, "buyer@corp.com")
        self.assertEqual(req.products, ["saas_prod_123"])
        self.assertEqual(req.metadata, {"user_id": "user-99", "plan_type": "saas"})

    @patch("app.billing._get_polar")
    @patch("app.billing.POLAR_LOCAL_PRODUCT_ID", "local_prod_xyz")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_local_plan_metadata_records_local_plan_type(self, mock_get_polar):
        """plan_type='local' records 'local' in metadata and selects the local product id (not saas)."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/local"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        await create_checkout_session("a@b.com", "u1", plan_type="local")

        req = mock_polar.checkouts.create.call_args.kwargs["request"]
        self.assertEqual(req.products, ["local_prod_xyz"])
        self.assertEqual(req.metadata["plan_type"], "local")

    @patch("app.billing._get_polar")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_unknown_plan_type_falls_back_to_saas_product(self, mock_get_polar):
        """Any plan_type other than 'local' resolves to the SAAS product id (only 'local' is special)."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/x"
        mock_polar.checkouts.create.return_value = mock_checkout
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        await create_checkout_session("a@b.com", "u1", plan_type="enterprise")

        req = mock_polar.checkouts.create.call_args.kwargs["request"]
        self.assertEqual(req.products, ["saas_prod_123"])
        self.assertEqual(req.metadata["plan_type"], "enterprise")

    @patch("app.billing._get_polar")
    @patch("app.billing.POLAR_SAAS_PRODUCT_ID", "saas_prod_123")
    @patch("app.billing.POLAR_ACCESS_TOKEN", "access_tok_123")
    async def test_polar_context_manager_is_entered_and_exited(self, mock_get_polar):
        """The Polar client is used as a context manager (enter + exit both invoked)."""
        mock_polar = MagicMock()
        mock_checkout = MagicMock()
        mock_checkout.url = "https://checkout.polar.sh/x"
        mock_polar.checkouts.create.return_value = mock_checkout
        cm = mock_get_polar.return_value
        cm.__enter__.return_value = mock_polar

        await create_checkout_session("a@b.com", "u1")

        cm.__enter__.assert_called_once()
        cm.__exit__.assert_called_once()


class TestCreatePortalSessionEdges(unittest.IsolatedAsyncioTestCase):
    """Edge coverage for app.billing.create_portal_session."""

    @patch("app.billing._get_polar")
    async def test_customer_id_and_return_url_forwarded(self, mock_get_polar):
        """customer_id and the explicit return_url are passed to the Polar request."""
        mock_polar = MagicMock()
        mock_session = MagicMock()
        mock_session.customer_portal_url = "https://billing.polar.sh/portal"
        mock_polar.customer_sessions.create.return_value = mock_session
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        url = await create_portal_session("cust_777", return_url="https://app/back")

        self.assertEqual(url, "https://billing.polar.sh/portal")
        req = mock_polar.customer_sessions.create.call_args.kwargs["request"]
        self.assertEqual(req.customer_id, "cust_777")
        self.assertEqual(req.return_url, "https://app/back")

    @patch("app.billing._get_polar")
    async def test_return_url_defaults_to_none(self, mock_get_polar):
        """With no return_url argument, the request carries return_url=None."""
        mock_polar = MagicMock()
        mock_session = MagicMock()
        mock_session.customer_portal_url = "https://billing.polar.sh/p2"
        mock_polar.customer_sessions.create.return_value = mock_session
        mock_get_polar.return_value.__enter__.return_value = mock_polar

        await create_portal_session("cust_888")

        req = mock_polar.customer_sessions.create.call_args.kwargs["request"]
        self.assertIsNone(req.return_url)


if __name__ == "__main__":
    unittest.main()
