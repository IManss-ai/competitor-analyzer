import json

_ALLOWED_PERIODS = {"monthly", "yearly", "one_time", "free"}


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif raw.startswith("```"):
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    return raw.strip()


def _clean_tier(tier) -> dict | None:
    if not isinstance(tier, dict) or not tier.get("tier_name"):
        return None
    price = tier.get("price")
    try:
        price = float(price) if price is not None else None
    except (TypeError, ValueError):
        price = None
    period = tier.get("period") if tier.get("period") in _ALLOWED_PERIODS else "monthly"
    features = tier.get("features") if isinstance(tier.get("features"), list) else []
    return {
        "tier_name": str(tier["tier_name"])[:80],
        "price": price,
        "period": period,
        "features": [str(f)[:200] for f in features][:12],
    }


def parse_profile_json(raw: str) -> dict | None:
    """Normalize the cheap-scan model output into a safe profile dict.
    Salvages partial payloads; returns None only if nothing parses."""
    try:
        data = json.loads(_strip_fences(raw))
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict) or not data.get("name"):
        return None
    tiers = data.get("pricing_tiers") if isinstance(data.get("pricing_tiers"), list) else []
    return {
        "name": str(data["name"])[:120],
        "tagline": str(data["tagline"])[:200] if data.get("tagline") else None,
        "description": str(data["description"])[:2000] if data.get("description") else None,
        "category": str(data["category"])[:60].lower() if data.get("category") else None,
        "tags": [str(t)[:40].lower() for t in data.get("tags", []) if isinstance(t, (str, int))][:10]
                if isinstance(data.get("tags"), list) else [],
        "pricing_tiers": [t for t in (_clean_tier(x) for x in tiers) if t][:8],
    }
