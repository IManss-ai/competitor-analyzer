import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Review, ReviewSnapshot
from app.observability import note_degraded
from app.pipeline.review_scraper import (
    fetch_page_text,
    _extract_json_from_response,
    _parse_date,
    ExtractionFailed,
)
import app.llm as llm
import uuid as _uuid


async def _extract_google_reviews_with_claude(text: str) -> dict:
    """Extract Google Maps review data using LLM."""
    if not llm.ai_available():
        note_degraded("google_reviews.extract", "empty", "dummy_key")
        return ExtractionFailed({"avg_rating": 0, "total_reviews": 0, "recent_reviews": [], "top_complaints": []})

    client = llm.get_async_client()
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
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=4096,
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
        note_degraded("google_reviews.extract", "empty", "api_error", e)
        return ExtractionFailed({"avg_rating": 0, "total_reviews": 0, "recent_reviews": [], "top_complaints": []})


async def scrape_google_reviews(competitor_id: str, google_maps_url: str, db: Session) -> dict:
    """Fetch Google Maps page via Jina and extract review data using Claude."""
    comp_uuid = _uuid.UUID(competitor_id)

    try:
        page_text = await fetch_page_text(google_maps_url)
        if not page_text or len(page_text) < 100:
            return {}

        extracted = await _extract_google_reviews_with_claude(page_text)
        if isinstance(extracted, ExtractionFailed):
            # Extraction FAILED (dummy key / API error), NOT "no reviews found":
            # writing the zeroed snapshot would overwrite the last REAL rating in
            # latest-snapshot consumers (dashboard shows "0.0 / 0 reviews"). Skip
            # the snapshot + review upserts for this run.
            print(f"Google review extraction failed for {google_maps_url}; skipping snapshot")
            return {}
        avg_rating = extracted.get("avg_rating", 0)
        total_reviews = extracted.get("total_reviews", 0)
        # `or []` (not just a missing-key default): the model can emit an explicit
        # "recent_reviews": null / "top_complaints": null, and `for rev in None`
        # or `len(None)` would raise, rolling back the fresh snapshot that carries
        # the real avg_rating — defeating the ExtractionFailed guard above.
        recent_reviews = extracted.get("recent_reviews") or []
        top_complaints = extracted.get("top_complaints") or []

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

            # The model can emit rating as a string ("4", "N/A") or null; a raw
            # `str <= 2` comparison raises TypeError, which the outer handler
            # catches and rolls back the WHOLE competitor's scrape. Coerce to int,
            # falling back to None (treated as "no rating") on failure.
            try:
                rating = int(rev.get("rating"))
            except (TypeError, ValueError):
                rating = None
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
