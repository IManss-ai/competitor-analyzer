import unittest
from app.discovery.tech_detect import detect_technologies

NEXT_STRIPE_HTML = """
<html><head>
<script src="/_next/static/chunks/main.js"></script>
<script src="https://js.stripe.com/v3/"></script>
<script>window.intercomSettings = {app_id: "abc"};</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
</head><body></body></html>
"""


class TestDetectTechnologies(unittest.TestCase):
    def test_detects_known_signatures(self):
        found = {t["technology"] for t in detect_technologies(NEXT_STRIPE_HTML)}
        self.assertIn("nextjs", found)
        self.assertIn("stripe", found)
        self.assertIn("intercom", found)
        self.assertIn("google-analytics", found)

    def test_each_result_has_category(self):
        for t in detect_technologies(NEXT_STRIPE_HTML):
            self.assertIn(t["tech_category"], {"framework", "payments", "analytics", "support", "marketing"})

    def test_empty_html(self):
        self.assertEqual(detect_technologies(""), [])

    def test_no_duplicates(self):
        html = NEXT_STRIPE_HTML + NEXT_STRIPE_HTML
        techs = [t["technology"] for t in detect_technologies(html)]
        self.assertEqual(len(techs), len(set(techs)))


if __name__ == "__main__":
    unittest.main()
