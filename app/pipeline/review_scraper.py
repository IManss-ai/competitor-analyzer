import json
import httpx
import logging
import os
import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Review, ReviewSnapshot, Competitor
from app.config import SCRAPER_URL
import anthropic
import uuid as _uuid

logger = logging.getLogger(__name__)

def _get_platform_urls(competitor_url: str, overrides: dict | None = None) -> dict:
    """Build review-platform URLs, preferring explicit overrides set on the Competitor."""
    domain = competitor_url.split("://")[-1].split("/")[0].replace("www.", "")
    slug = domain.split(".")[0]

    derived = {
        "g2": f"https://www.g2.com/products/{slug}/reviews",
        "trustpilot": f"https://www.trustpilot.com/review/{domain}",
        "capterra": f"https://www.capterra.com/p/{slug}/",
    }
    if overrides:
        for platform, url in overrides.items():
            if url:
                derived[platform] = url
    return derived

async def fetch_page_text(url: str) -> str:
    """Fetch a review page as deterministic markdown via the scraper sidecar.
    Returns "" when the sidecar is not configured (local dev/tests). Raises on
    sidecar failure so the per-platform caller skips that platform."""
    if not SCRAPER_URL or SCRAPER_URL == "dummy":
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
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "dummy_anthropic_key":
        return {"reviews": [], "avg_rating": 0, "total_reviews": 0}
        
    client = anthropic.AsyncAnthropic(api_key=api_key)
    prompt = """Extract reviews from this page text. Return JSON: {"reviews": [{"id": "str", "author": "str", "rating": int, "title": "str", "body": "str", "published_at": "ISO-8601 date str"}], "avg_rating": float, "total_reviews": int}. 
    
    If no reviews found, return empty list and 0. Use your best judgment to determine ratings (1-5).
    
    Text:
    """ + text[:15000]
    
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        return _extract_json_from_response(response.content[0].text)
    except Exception as e:
        print(f"Error extracting reviews: {e}")
        return {"reviews": [], "avg_rating": 0, "total_reviews": 0}

async def _analyze_complaints_with_claude(reviews: list) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "dummy_anthropic_key" or not reviews:
        return {"complaints": [], "complaint_reviews": []}
        
    client = anthropic.AsyncAnthropic(api_key=api_key)
    reviews_json = json.dumps(reviews)
    
    prompt = """Analyze these reviews. Identify which reviews are complaints (negative sentiment about specific product issues).
    Extract the top 3 recurring complaint themes across all negative reviews.
    
    Return JSON: {"complaints": ["theme1", "theme2", "theme3"], "complaint_reviews": ["review_id_1", "review_id_2"]}.
    If no complaints, return empty lists.
    
    Reviews:
    """ + reviews_json
    
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        return _extract_json_from_response(response.content[0].text)
    except Exception as e:
        print(f"Error analyzing complaints: {e}")
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
            complaint_review_ids = set(complaints_data.get("complaint_reviews", []))
            
            complaint_count = len(complaint_review_ids)
            
            for rev in reviews:
                rev_id = str(rev.get("id"))
                if not rev_id:
                    continue
                    
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
