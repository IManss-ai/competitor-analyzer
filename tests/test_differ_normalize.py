import unittest
from app.pipeline.differ import is_meaningful_change, compute_net_char_delta


class TestDifferNormalize(unittest.TestCase):
    def test_whitespace_and_case_jitter_is_zero_delta(self):
        a = "Acme Plan: $19 per month. Great features here."
        b = "  acme   plan: $19 PER month.\n\nGreat   features here.  "
        self.assertEqual(compute_net_char_delta(a, b), 0)
        changed, _ = is_meaningful_change(a, b)
        self.assertFalse(changed)

    def test_real_content_change_exceeds_threshold(self):
        a = "Acme Plan: $19 per month."
        b = "Acme Plan: $29 per month. " + ("New enterprise tier with SSO and audit logs. " * 4)
        changed, delta = is_meaningful_change(a, b)
        self.assertTrue(changed)
        self.assertGreater(delta, 100)
