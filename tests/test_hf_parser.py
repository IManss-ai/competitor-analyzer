import pytest
import json
from pathlib import Path
from backend.services.hf_parser import HFParser

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_pile_card():
    parser = HFParser()
    data = json.loads((FIXTURES / "pile_card.json").read_text())
    info = parser.parse_from_dict("EleutherAI/pile", data)
    assert info.name == "EleutherAI/pile"
    assert info.license_type == "mit"
    assert info.approximate_size == "100B<n<1T"
    assert info.contains_personal_data is False  # text-generation → non-personal


def test_parse_no_license_card():
    parser = HFParser()
    data = json.loads((FIXTURES / "no_license_card.json").read_text())
    info = parser.parse_from_dict("example/private-dataset", data)
    assert info.contains_personal_data is True  # has "personal", "medical" tags
    assert info.license_type is None


def test_parse_ip_detection():
    parser = HFParser()
    data = {
        "id": "test/proprietary",
        "description": "A proprietary dataset with copyright restrictions.",
        "tags": ["copyright", "restricted"],
        "cardData": {},
    }
    info = parser.parse_from_dict("test/proprietary", data)
    assert info.contains_ip is True


def test_parse_open_license_no_ip():
    parser = HFParser()
    data = {
        "id": "test/open",
        "description": "Open source dataset.",
        "tags": [],
        "cardData": {"license": "apache-2.0", "size_categories": ["1M<n<10M"]},
    }
    info = parser.parse_from_dict("test/open", data)
    assert info.license_type == "apache-2.0"
    assert info.contains_ip is False
    assert info.approximate_size == "1M<n<10M"
