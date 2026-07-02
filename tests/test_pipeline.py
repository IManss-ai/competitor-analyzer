import unittest
from app.pipeline.fetcher import extract_main_content
from app.pipeline.differ import is_meaningful_change, compute_net_char_delta

class TestPipeline(unittest.TestCase):
    def test_extract_main_content_filtering(self):
        # Short paragraphs should be filtered out, long paragraphs kept
        short_p = "This is a very short paragraph."
        long_p = "This is a very long paragraph that exceeds the two hundred character threshold. We need to write enough words here so that the length of this string is greater than 200 characters. Writing words continuously to build a long paragraph for testing purposes. More words to ensure it crosses the threshold."
        
        raw_text = f"{short_p}\n\n{long_p}"
        extracted = extract_main_content(raw_text)
        
        self.assertNotIn(short_p, extracted)
        self.assertIn(long_p, extracted)
        
    def test_differ_threshold(self):
        # CHANGE_THRESHOLD = 100 (chars actually edited, not net length delta)
        base = "alpha beta gamma delta"

        # ~135 new chars appended (> 100) -> meaningful
        grown = base + " " + ("new enterprise tier with sso and audit logs " * 3)
        changed, delta = is_meaningful_change(base, grown)
        self.assertTrue(changed)
        self.assertGreater(delta, 100)

        # ~20 new chars appended (<= 100) -> not meaningful
        small = base + " now with audit logs"
        changed, delta = is_meaningful_change(base, small)
        self.assertFalse(changed)
        self.assertLessEqual(delta, 100)

if __name__ == '__main__':
    unittest.main()
