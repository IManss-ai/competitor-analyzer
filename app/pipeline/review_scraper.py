import json
import httpx
import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Review, ReviewSnapshot, Competitor
from app.config import SCRAPER_URL
from app.observability import note_degraded
import app.llm as llm
import uuid as _uuid

logger = logging.getLogger(__name__)

def _get_platform_urls(competitor_url: str, overrides: dict | None = None) -> dict:
    """Build review-platform URLs, preferring explicit overrides set on the Competitor.

    G2 and Trustpilot key their review pages by the company/product's domain slug,
    so a URL can be derived directly. Capterra keys pages by an opaque numeric
    product ID (e.g. /p/19319/JIRA/) that can't be derived from the domain — it's
    only present here when an explicit override or resolved URL is supplied via
    `overrides` (see `_resolve_capterra_url`).
    """
    domain = competitor_url.split("://")[-1].split("/")[0].replace("www.", "")
    slug = domain.split(".")[0]

    derived = {
        "g2": f"https://www.g2.com/products/{slug}/reviews",
        "trustpilot": f"https://www.trustpilot.com/review/{domain}",
    }
    if overrides:
        for platform, url in overrides.items():
            if url:
                derived[platform] = url
    return derived

_CAPTERRA_PRODUCT_RE = re.compile(r"https://www\.capterra\.com/p/\d+/[^/\s\)\]]+/")

async def _resolve_capterra_url(domain: str) -> str | None:
    """Find a competitor's real Capterra product URL via search.

    Capterra has no domain-derivable URL scheme (unlike G2/Trustpilot), so a
    guessed `/p/{slug}/` URL always 404s. Search instead and take the first
    product link that matches Capterra's real `/p/{id}/{name}/` pattern.
    """
    query = domain.split(".")[0]
    try:
        page_text = await fetch_page_text(f"https://www.capterra.com/search/?query={query}")
    except Exception as e:
        note_degraded("review_scraper.capterra_resolve", "empty", "search_failed", e)
        return None
    match = _CAPTERRA_PRODUCT_RE.search(page_text)
    return match.group(0) if match else None

async def fetch_page_text(url: str) -> str:
    """Fetch a review page as deterministic markdown via the scraper sidecar.
    Returns "" when the sidecar is not configured (local dev/tests). Raises on
    sidecar failure so the per-platform caller skips that platform."""
    if not SCRAPER_URL or SCRAPER_URL == "dummy":
        note_degraded("review_scraper.fetch", "empty", "scraper_url_unset")
        return ""
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(f"{SCRAPER_URL}/scrape-raw", json={"url": url})
        resp.raise_for_status()
        return (resp.json().get("text") or "").strip()

def _extract_json_from_response(content: str) -> dict:
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].strip()
    return json.loads(content)

async def _extract_reviews_with_claude(text: str) -> dict:
    if not llm.ai_available():
        note_degraded("review_scraper.extract", "empty", "dummy_key")
        return {"reviews": [], "avg_rating": 0, "total_reviews": 0}

    client = llm.get_async_client()
    prompt = """Extract reviews from this page text. Return JSON: {"reviews": [{"id": "str", "author": "str", "rating": int, "title": "str", "body": "str", "published_at": "ISO-8601 date str"}], "avg_rating": float, "total_reviews": int}.

    If no reviews found, return empty list and 0. Use your best judgment to determine ratings (1-5).

    Text:
    """ + text[:15000]

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=8192,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured review data from web page text."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
            extra_body=llm.THINKING_OFF,
        )
        return _extract_json_from_response(response.choices[0].message.content)
    except Exception as e:
        note_degraded("review_scraper.extract", "empty", "api_error", e)
        return {"reviews": [], "avg_rating": 0, "total_reviews": 0}

async def _analyze_complaints_with_claude(reviews: list) -> dict:
    if not llm.ai_available() or not reviews:
        if reviews and not llm.ai_available():
            note_degraded("review_scraper.complaints", "empty", "dummy_key")
        return {"complaints": [], "complaint_reviews": []}

    client = llm.get_async_client()
    reviews_json = json.dumps(reviews)

    prompt = """Analyze these reviews. Identify which reviews are complaints (negative sentiment about specific product issues).
    Extract the top 3 recurring complaint themes across all negative reviews.

    Return JSON: {"complaints": ["theme1", "theme2", "theme3"], "complaint_reviews": ["review_id_1", "review_id_2"]}.
    If no complaints, return empty lists.

    Reviews:
    """ + reviews_json

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes product reviews and identifies complaint themes."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
            extra_body=llm.THINKING_OFF,
        )
        return _extract_json_from_response(response.choices[0].message.content)
    except Exception as e:
        note_degraded("review_scraper.complaints", "empty", "api_error", e)
        return {"complaints": [], "complaint_reviews": []}

def _parse_date(date_str: str):
    if not date_str:
        return None
    try:
        if date_str.endswith("Z"):
            date_str = date_str[:-1] + "+00:00"
        return datetime.fromisoformat(date_str)
    except Exception:
        return None

async def scrape_competitor_reviews(competitor_id: str, competitor_url: str, db: Session) -> dict:
    """Returns {platform: {avg_rating, total_reviews, complaint_count, top_complaints}}"""
    comp_uuid = _uuid.UUID(competitor_id)

    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    overrides = {}
    if comp:
        if comp.g2_url:
            overrides["g2"] = comp.g2_url
        if comp.trustpilot_url:
            overrides["trustpilot"] = comp.trustpilot_url
        if comp.capterra_url:
            overrides["capterra"] = comp.capterra_url

    if "capterra" not in overrides:
        domain = competitor_url.split("://")[-1].split("/")[0].replace("www.", "")
        resolved = await _resolve_capterra_url(domain)
        if resolved:
            overrides["capterra"] = resolved

    urls = _get_platform_urls(competitor_url, overrides=overrides)
    results = {}

    for platform, url in urls.items():
        try:
            page_text = await fetch_page_text(url)
            if not page_text or len(page_text) < 100:
                logger.info("review scrape %s: empty or too-short page for %s", platform, url)
                continue
                
            extracted = await _extract_reviews_with_claude(page_text)
            reviews = extracted.get("reviews", [])
            avg_rating = extracted.get("avg_rating")
            total_reviews = extracted.get("total_reviews")
            
            complaints_data = await _analyze_complaints_with_claude(reviews)
            top_complaints = complaints_data.get("complaints", [])
            # review_id is stored and compared as a string, but the model can
            # return complaint_reviews as ints ([2]) — coerce to str so numeric
            # ids still match. Without this every is_complaint is silently False
            # whenever the ids come back numeric and the card shows no complaints.
            complaint_review_ids = {str(x) for x in complaints_data.get("complaint_reviews", [])}
            
            complaint_count = len(complaint_review_ids)
            
            for rev in reviews:
                rev_id = rev.get("id")
                if not rev_id:
                    continue
                rev_id = str(rev_id)
                    
                existing = db.execute(
                    select(Review).where(
                        Review.competitor_id == comp_uuid,
                        Review.platform == platform,
                        Review.review_id == rev_id
                    )
                ).scalar_one_or_none()
                
                is_complaint = rev_id in complaint_review_ids
                sentiment = "negative" if is_complaint else ("positive" if rev.get("rating", 3) >= 4 else "neutral")
                
                if not existing:
                    new_review = Review(
                        competitor_id=comp_uuid,
                        platform=platform,
                        review_id=rev_id,
                        author=rev.get("author"),
                        rating=rev.get("rating"),
                        title=rev.get("title"),
                        body=rev.get("body", ""),
                        published_at=_parse_date(rev.get("published_at")),
                        sentiment=sentiment,
                        is_complaint=is_complaint
                    )
                    db.add(new_review)
                else:
                    existing.rating = rev.get("rating", existing.rating)
                    existing.title = rev.get("title", existing.title)
                    existing.body = rev.get("body", existing.body)
                    existing.sentiment = sentiment
                    existing.is_complaint = is_complaint
            
            snapshot = ReviewSnapshot(
                competitor_id=comp_uuid,
                platform=platform,
                avg_rating=avg_rating,
                total_reviews=total_reviews,
                complaint_count=complaint_count,
                top_complaints=json.dumps(top_complaints) if top_complaints else None
            )
            db.add(snapshot)
            db.commit()
            
            results[platform] = {
                "avg_rating": avg_rating,
                "total_reviews": total_reviews,
                "complaint_count": complaint_count,
                "top_complaints": top_complaints
            }
            
        except Exception as e:
            logger.warning("review scrape %s failed for %s: %s", platform, competitor_url, e)
            db.rollback()
            continue

    return results
