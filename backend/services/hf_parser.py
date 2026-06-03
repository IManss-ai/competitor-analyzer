"""
HuggingFace dataset card parser.
Parses model card metadata to extract AB 2013 Section 22602 fields.
"""
from __future__ import annotations
import httpx
from dataclasses import dataclass, field


@dataclass
class HFDatasetInfo:
    name: str
    sources_description: str | None = None
    contains_personal_data: bool | None = None
    license_type: str | None = None
    contains_ip: bool | None = None
    approximate_size: str | None = None
    acquisition_method: str | None = None
    collection_period: str | None = None
    modifications_description: str | None = None
    raw_metadata: dict = field(default_factory=dict)


PERSONAL_DATA_KEYWORDS = [
    "personal", "pii", "private", "medical", "health", "financial",
    "social security", "credit card", "email", "phone", "address",
    "biometric", "face", "voice", "location", "gps",
]

IP_KEYWORDS = [
    "copyright", "proprietary", "licensed", "all rights reserved",
    "restricted", "confidential", "trade secret",
]


class HFParser:
    BASE_URL = "https://huggingface.co/api/datasets/{dataset_id}"

    async def fetch(self, dataset_id: str) -> HFDatasetInfo:
        url = self.BASE_URL.format(dataset_id=dataset_id)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        return self._parse(dataset_id, data)

    def parse_from_dict(self, dataset_id: str, data: dict) -> HFDatasetInfo:
        return self._parse(dataset_id, data)

    def _parse(self, dataset_id: str, data: dict) -> HFDatasetInfo:
        card_data = data.get("cardData", {}) or {}
        tags = data.get("tags", []) or []
        description = data.get("description", "") or ""
        license_val = card_data.get("license") or data.get("license")
        size_categories = card_data.get("size_categories", [])

        approx_size = size_categories[0] if size_categories else None
        contains_personal = self._detect_personal_data(tags, description, card_data)
        contains_ip = self._detect_ip(tags, description, license_val)
        sources_desc = card_data.get("pretty_name") or description[:500] or None

        acq_method = None
        creators = card_data.get("annotations_creators", [])
        source_datasets = card_data.get("source_datasets", [])
        if creators:
            acq_method = f"Annotations by: {', '.join(creators)}"
        elif source_datasets:
            acq_method = f"Derived from: {', '.join(str(s) for s in source_datasets[:3])}"

        return HFDatasetInfo(
            name=data.get("id", dataset_id),
            sources_description=sources_desc,
            contains_personal_data=contains_personal,
            license_type=str(license_val) if license_val else None,
            contains_ip=contains_ip,
            approximate_size=approx_size,
            acquisition_method=acq_method,
            collection_period=None,
            modifications_description=None,
            raw_metadata=data,
        )

    def _detect_personal_data(self, tags: list, description: str, card_data: dict) -> bool | None:
        text = (description + " " + " ".join(tags)).lower()
        task_cats = card_data.get("task_categories", [])
        text += " " + " ".join(task_cats).lower()
        if any(kw in text for kw in PERSONAL_DATA_KEYWORDS):
            return True
        non_personal = ["code", "mathematics", "translation", "question-answering", "text-generation", "summarization"]
        if any(np in text for np in non_personal):
            return False
        return None

    def _detect_ip(self, tags: list, description: str, license_val) -> bool | None:
        if license_val and isinstance(license_val, str):
            open_licenses = ["apache", "mit", "cc", "gpl", "openrail", "other", "unknown"]
            if any(ol in license_val.lower() for ol in open_licenses):
                return False
        text = (description + " " + " ".join(tags)).lower()
        if any(kw in text for kw in IP_KEYWORDS):
            return True
        return None
