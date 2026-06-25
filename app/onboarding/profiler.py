"""Magic onboarding — profile a user's OWN business from their URL.

Honesty invariants (see docs/superpowers/specs/2026-06-25-magic-onboarding-design.md):
- Extraction uses the sidecar's deterministic, LLM-free `POST /scrape-raw`
  (no dependency on the possibly-dry OpenAI sidecar key), with a direct-HTTP
  fallback so local dev / unconfigured sidecar still works.
- The AI profile is best-effort and labelled `source: "ai" | "fallback"`; the
  frontend presents it as editable, never as confirmed fact.
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from app.config import SCRAPER_URL
from app.observability import note_degraded
import app.llm as llm

logger = logging.getLogger(__name__)

_SOCIAL_PATTERNS = {
    "twitter": r"https?://(?:www\.)?(?:twitter|x)\.com/[A-Za-z0-9_]{1,30}",
    "linkedin": r"https?://(?:www\.)?linkedin\.com/(?:company|in)/[A-Za-z0-9_\-%]+",
    "instagram": r"https?://(?:www\.)?instagram\.com/[A-Za-z0-9_.]+",
    "facebook": r"https?://(?:www\.)?facebook\.com/[A-Za-z0-9_.\-]+",
    "github": r"https?://(?:www\.)?github\.com/[A-Za-z0-9_\-]+",
}


def _domain_name(url: str) -> str:
    domain = url.split("://")[-1].split("/")[0].replace("www.", "")
    return domain.split(".")[0].replace("-", " ").title()


def _strip_html(html: str) -> str:
    text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_socials(raw: str) -> list[str]:
    found: list[str] = []
    for pattern in _SOCIAL_PATTERNS.values():
        for m in re.findall(pattern, raw or ""):
            # skip share/intent links and generic root pages
            if any(bad in m.lower() for bad in ("/share", "/intent", "/sharer", "/login")):
                continue
            if m not in found:
                found.append(m)
    return found[:6]


async def fetch_site_text(url: str) -> tuple[str, str]:
    """Return (clean_text, raw) for a URL.

    Prefers the sidecar `/scrape-raw` (deterministic, LLM-free). Falls back to a
    direct HTTP GET (sidecar unset or failed). Returns ("", "") when unreachable —
    callers treat empty text as "could not read this site", never as an error.
    """
    if SCRAPER_URL and SCRAPER_URL != "dummy":
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.post(f"{SCRAPER_URL}/scrape-raw", json={"url": url})
                resp.raise_for_status()
                data = resp.json()
                text = (data.get("text") or "").strip()
                raw = data.get("html") or text
                if text:
                    return text, raw
        except Exception as e:  # noqa: BLE001 — fall through to direct HTTP
            note_degraded("onboarding.fetch", "scrape_raw_failed", str(e)[:120])

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True,
                                     headers={"User-Agent": "Mozilla/5.0 (RivalscopeBot)"}) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            raw = resp.text
            return _strip_html(raw)[:20000], raw
    except Exception as e:  # noqa: BLE001
        note_degraded("onboarding.fetch", "direct_http_failed", str(e)[:120])
        return "", ""


def _extract_json(content: str) -> dict:
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].strip()
    return json.loads(content)


def _fallback_profile(url: str, text: str, socials: list[str]) -> dict:
    name = _domain_name(url)
    one_liner = (text[:160].strip() + "…") if text else f"{name} — we couldn't read your site automatically."
    return {
        "name": name,
        "one_liner": one_liner,
        "category": "",
        "target_customer": "",
        "positioning": "",
        "key_features": [],
        "socials": socials,
        "is_saas": True,  # default; user confirms business_type separately
        "source": "fallback",
    }


_PROMPT = """You are profiling a company from the raw text of its own website. Return STRICT JSON only:
{
  "name": "company/product name",
  "one_liner": "one honest sentence describing what they do",
  "category": "short industry/category tag, e.g. 'project management SaaS' or 'coffee shop'",
  "target_customer": "who they sell to",
  "positioning": "how they position themselves vs alternatives (one sentence)",
  "key_features": ["3-6 concrete features or offerings"],
  "is_saas": true/false  // true if a software/online product, false if a local/physical business
}
Be objective and factual — only state what the text supports. Do not invent. If the text is thin, keep fields short or empty.

WEBSITE TEXT:
"""


async def profile_business(url: str) -> dict:
    """Scrape a user's own site and distill an honest business profile.

    Always returns a dict (never raises). `source` is "ai" or "fallback".
    """
    text, raw = await fetch_site_text(url)
    socials = _extract_socials(raw or text)

    if not text or not llm.ai_available():
        return _fallback_profile(url, text, socials)

    try:
        client = llm.get_async_client()
        resp = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=1200,
            extra_body=llm.THINKING_OFF,
            messages=[
                {"role": "system", "content": "You extract objective company profiles from website text. JSON only."},
                {"role": "user", "content": _PROMPT + text[:14000]},
            ],
        )
        data = _extract_json(resp.choices[0].message.content or "{}")
    except Exception as e:  # noqa: BLE001
        note_degraded("onboarding.profile", "ai_failed", str(e)[:120])
        return _fallback_profile(url, text, socials)

    return {
        "name": (data.get("name") or _domain_name(url)).strip(),
        "one_liner": (data.get("one_liner") or "").strip(),
        "category": (data.get("category") or "").strip(),
        "target_customer": (data.get("target_customer") or "").strip(),
        "positioning": (data.get("positioning") or "").strip(),
        "key_features": [f for f in (data.get("key_features") or []) if isinstance(f, str)][:6],
        "socials": socials,
        "is_saas": bool(data.get("is_saas", True)),
        "source": "ai",
    }
