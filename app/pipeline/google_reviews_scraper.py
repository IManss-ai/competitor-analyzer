import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Review, ReviewSnapshot
from app.pipeline.review_scraper import fetch_page_text, _extract_json_from_response, _parse_date
import anthropic
import uuid as _uuid


async def _extract_google_reviews_with_claude(text: str) -> dict:
    """Extract Google Maps review data using Claude."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "dummy_anthropic_key":
        return {"avg_rating": 0, "total_reviews": 0, "recent_reviews": [], "top_complaints": []}

    client = anthropic.AsyncAnthropic(api_key=api_key)
    prompt = """Extract Google Maps review data from this page text. Return JSON:
{
  "avg_rating": float,
  "total_reviews": int,
  "recent_reviews": [
    {"author": "str", "rating": int, "body": "str", "published_at": "ISO-8601 date str"}
  ],
  "top_complaints": ["complaint1", "complaint2", "complaint3"]
}

If no reviews found, return avg_rating 0, total_reviews 0, empty lists.
Extract up to 20 recent reviews. For top_complaints, identify the 3 most common complaint themes.

Text:
""" + text[:15000]

    try:
        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        return _extract_json_from_response(response.content[0].text)
    except Exception as e:
        print(f"Error extracting Google reviews: {e}")
        return {"avg_rating": 0, "total_reviews": 0, "recent_reviews": [], "top_complaints": []}


async def scrape_google_reviews(competitor_id: str, google_maps_url: str, db: Session) -> dict:
    """Fetch Google Maps page via Jina and extract review data using Claude."""
    comp_uuid = _uuid.UUID(competitor_id)

    try:
        page_text = await fetch_page_text(google_maps_url)
        if not page_text or len(page_text) < 100:
            return {}

        extracted = await _extract_google_reviews_with_claude(page_text)
        avg_rating = extracted.get("avg_rating", 0)
        total_reviews = extracted.get("total_reviews", 0)
        recent_reviews = extracted.get("recent_reviews", [])
        top_complaints = extracted.get("top_complaints", [])

        # Upsert reviews into the Review table with platform = "google"
        for rev in recent_reviews:
            author = rev.get("author", "")
            body = rev.get("body", "")
            if not body:
                continue

            # Use author + body hash as review_id for dedup
            import hashlib
            rev_id = hashlib.md5(f"{author}:{body}".encode()).hexdigest()

            existing = db.execute(
                select(Review).where(
                    Review.competitor_id == comp_uuid,
                    Review.platform == "google",
                    Review.review_id == rev_id
                )
            ).scalar_one_or_none()

            rating = rev.get("rating")
            sentiment = "negative" if rating and rating <= 2 else ("positive" if rating and rating >= 4 else "neutral")
            is_complaint = rating is not None and rating <= 2

            if not existing:
                new_review = Review(
                    competitor_id=comp_uuid,
                    platform="google",
                    review_id=rev_id,
                    author=author,
                    rating=rating,
                    title=None,
                    body=body,
                    published_at=_parse_date(rev.get("published_at")),
                    sentiment=sentiment,
                    is_complaint=is_complaint
                )
                db.add(new_review)
            else:
                existing.rating = rating or existing.rating
                existing.body = body
                existing.sentiment = sentiment
                existing.is_complaint = is_complaint

        # Create ReviewSnapshot record
        complaint_count = len(top_complaints)
        snapshot = ReviewSnapshot(
            competitor_id=comp_uuid,
            platform="google",
            avg_rating=avg_rating,
            total_reviews=total_reviews,
            complaint_count=complaint_count,
            top_complaints=json.dumps(top_complaints) if top_complaints else None
        )
        db.add(snapshot)
        db.commit()

        return {
            "avg_rating": avg_rating,
            "total_reviews": total_reviews,
            "complaint_count": complaint_count,
            "top_complaints": top_complaints
        }

    except Exception as e:
        print(f"Error scraping Google reviews for {google_maps_url}: {e}")
        db.rollback()
        return {}
