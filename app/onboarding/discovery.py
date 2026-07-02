"""Magic onboarding — auto-discover a user's top REAL competitors.

The backend LLM (DeepSeek) is text-only with no live web access, so it suggests
competitors from training knowledge. The load-bearing honesty step is VALIDATION:
every suggested URL is fetched before we trust it, so hallucinated/dead domains
never reach the user or the scan pipeline. If fewer than MIN_VALID validate, we
return what we have — we never pad with fakes.

SaaS/online only — local competitor discovery needs geo-search (Google Places)
that doesn't exist in the stack.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re

from app.observability import note_degraded
import app.llm as llm
from app.onboarding.profiler import fetch_site_text, _extract_json

logger = logging.getLogger(__name__)

MIN_VALID = 2

_PROMPT = """You are a competitive-intelligence analyst. Given this company profile, name the TOP real, well-known DIRECT competitors — companies a buyer would realistically compare against. Return STRICT JSON only:
{"competitors": [{"name": "Competitor", "url": "https://their-primary-domain.com", "why": "one short reason they compete"}]}

Rules:
- Up to 6. Only REAL companies you are confident exist, with their real primary domain (homepage, not a subpage).
- DIRECT competitors in the same category — not tangential tools, not the company itself.
- If you are not confident of real competitors, return fewer (or an empty list). Never invent.

COMPANY PROFILE:
"""


def _norm_domain(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower()).split("/")[0]


async def suggest_competitors(profile: dict) -> list[dict]:
    """Ask the LLM for candidate competitors (unvalidated)."""
    if not llm.ai_available():
        note_degraded("onboarding.discover", "empty", "dummy_key")
        return []

    summary = json.dumps({
        "name": profile.get("name"),
        "category": profile.get("category"),
        "one_liner": profile.get("one_liner"),
        "target_customer": profile.get("target_customer"),
        "positioning": profile.get("positioning"),
    })
    try:
        client = llm.get_async_client()
        resp = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=1200,
            extra_body=llm.THINKING_OFF,
            messages=[
                {"role": "system", "content": "You name real direct competitors. JSON only. Never invent companies."},
                {"role": "user", "content": _PROMPT + summary},
            ],
        )
        data = _extract_json(resp.choices[0].message.content or "{}")
    except Exception as e:  # noqa: BLE001
        note_degraded("onboarding.discover", "ai_failed", str(e)[:120])
        return []

    out: list[dict] = []
    own = _norm_domain(profile.get("business_url", ""))
    seen = set()
    for c in (data.get("competitors") or []):
        url = (c.get("url") or "").strip()
        name = (c.get("name") or "").strip()
        if not url or not name:
            continue
        if not url.startswith("http"):
            url = "https://" + url
        dom = _norm_domain(url)
        if not dom or dom == own or dom in seen:
            continue
        seen.add(dom)
        out.append({"name": name, "url": url, "why": (c.get("why") or "").strip()})
    return out[:6]


async def _validate(candidate: dict) -> dict | None:
    """Keep a candidate only if its URL is actually reachable."""
    try:
        text, _ = await fetch_site_text(candidate["url"])
    except Exception:  # noqa: BLE001
        return None
    if not text:
        return None
    return {**candidate, "verified": True}


async def discover_competitors(profile: dict, limit: int = 4) -> dict:
    """Suggest → validate every URL → return only verified competitors.

    Returns {"competitors": [...], "reason": str|None}. SaaS only.
    """
    if not profile.get("is_saas", True):
        return {"competitors": [], "reason": "local"}

    candidates = await suggest_competitors(profile)
    if not candidates:
        return {"competitors": [], "reason": "none_suggested"}

    validated = await asyncio.gather(*[_validate(c) for c in candidates])
    verified = [v for v in validated if v]

    reason = None
    if len(verified) < MIN_VALID:
        reason = "low_confidence"  # frontend nudges manual add
    return {"competitors": verified[:limit], "reason": reason}
