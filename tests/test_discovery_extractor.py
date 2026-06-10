import json
import unittest
from app.discovery.extractor import parse_profile_json


class TestParseProfileJson(unittest.TestCase):
    def test_valid_payload(self):
        raw = json.dumps({
            "name": "Acme", "tagline": "Ship faster", "description": "A tool.",
            "category": "productivity", "tags": ["saas", "teams"],
            "pricing_tiers": [
                {"tier_name": "Pro", "price": 29, "period": "monthly", "features": ["a"]},
                {"tier_name": "Enterprise", "price": None, "period": "monthly", "features": []},
            ],
        })
        profile = parse_profile_json(raw)
        self.assertEqual(profile["name"], "Acme")
        self.assertEqual(len(profile["pricing_tiers"]), 2)
        self.assertIsNone(profile["pricing_tiers"][1]["price"])

    def test_fenced_json(self):
        raw = '```json\n{"name": "Acme", "tags": []}\n```'
        self.assertEqual(parse_profile_json(raw)["name"], "Acme")

    def test_partial_payload_fills_defaults(self):
        profile = parse_profile_json('{"name": "Acme"}')
        self.assertEqual(profile["tags"], [])
        self.assertEqual(profile["pricing_tiers"], [])
        self.assertIsNone(profile["category"])

    def test_garbage_returns_none(self):
        self.assertIsNone(parse_profile_json("I am not JSON at all"))

    def test_bad_tier_rows_are_dropped_not_fatal(self):
        raw = json.dumps({"name": "Acme", "pricing_tiers": [
            {"tier_name": "Pro", "price": "twenty"},
            "not-a-dict",
            {"price": 5},
        ]})
        tiers = parse_profile_json(raw)["pricing_tiers"]
        self.assertEqual(len(tiers), 1)
        self.assertIsNone(tiers[0]["price"])


if __name__ == "__main__":
    unittest.main()
