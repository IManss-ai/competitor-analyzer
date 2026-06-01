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
        # CHANGE_THRESHOLD = 100
        text1 = "A" * 50
        text2 = "A" * 160
        text3 = "A" * 120
        
        # diff text1 vs text2 is 110 chars (> 100) -> meaningful
        changed, delta = is_meaningful_change(text1, text2)
        self.assertTrue(changed)
        self.assertEqual(delta, 110)
        
        # diff text1 vs text3 is 70 chars (<= 100) -> not meaningful
        changed, delta = is_meaningful_change(text1, text3)
        self.assertFalse(changed)
        self.assertEqual(delta, 70)

if __name__ == '__main__':
    unittest.main()
