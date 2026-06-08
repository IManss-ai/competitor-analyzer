import io
import unittest
from contextlib import redirect_stdout

from app.observability import note_degraded


class TestNoteDegraded(unittest.TestCase):
    def _capture(self, **kwargs) -> str:
        buf = io.StringIO()
        with redirect_stdout(buf):
            note_degraded(**kwargs)
        return buf.getvalue()

    def test_api_error_is_loud(self):
        out = self._capture(module="classifier", source="heuristic", reason="api_error")
        self.assertIn("[FALLBACK]", out)
        self.assertIn("classifier", out)
        self.assertIn("reason=api_error", out)

    def test_sidecar_down_is_loud(self):
        out = self._capture(module="fetcher", source="direct_http", reason="sidecar_down")
        self.assertIn("[FALLBACK]", out)

    def test_local_dev_path_is_quiet(self):
        out = self._capture(module="fetcher", source="mock", reason="scraper_url_unset")
        self.assertIn("[degraded]", out)
        self.assertNotIn("[FALLBACK]", out)

    def test_exception_detail_included(self):
        out = self._capture(
            module="battlecard", source="heuristic", reason="api_error",
            exc=RuntimeError("credit balance too low"),
        )
        self.assertIn("RuntimeError", out)
        self.assertIn("credit balance too low", out)


if __name__ == "__main__":
    unittest.main()
