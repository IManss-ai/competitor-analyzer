import json
import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import SocialPost
from app.observability import note_degraded
from app.pipeline.review_scraper import fetch_page_text, _extract_json_from_response, _parse_date
import app.llm as llm
import uuid as _uuid


async def _extract_posts_with_claude(text: str, platform: str) -> dict:
    """Extract social media posts from page text using Claude."""
    if not llm.ai_available():
        return {"posts": []}

    client = llm.get_async_client()
    prompt = f"""Extract recent public posts from this {platform} page text. Return JSON:
{{
  "posts": [
    {{"content": "post text content", "posted_at": "ISO-8601 date str or null", "engagement_hint": "likes/comments count if visible"}}
  ]
}}

If no posts found, return empty list. Extract up to 20 recent posts.

Text:
""" + text[:15000]

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured data from web page text."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return _extract_json_from_response(response.choices[0].message.content)
    except Exception as e:
        note_degraded(f"social_tracker.extract[{platform}]", "empty", "api_error", e)
        return {"posts": []}


async def _summarize_sentiment_with_claude(posts: list, platform: str) -> dict:
    """Summarize sentiment of a batch of posts using Claude."""
    if not llm.ai_available() or not posts:
        return {"sentiment_summary": "", "notable_posts": []}

    client = llm.get_async_client()
    posts_json = json.dumps(posts[:20])

    prompt = f"""Analyze the sentiment of these {platform} posts. Return JSON:
{{
  "sentiment_summary": "brief overall sentiment summary",
  "notable_posts": ["key takeaway 1", "key takeaway 2"]
}}

Posts:
""" + posts_json

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes sentiment from social media posts."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return _extract_json_from_response(response.choices[0].message.content)
    except Exception as e:
        note_degraded(f"social_tracker.sentiment[{platform}]", "empty", "api_error", e)
        return {"sentiment_summary": "", "notable_posts": []}


async def _scrape_platform(competitor_id: _uuid.UUID, platform: str, handle: str, db: Session) -> int:
    """Scrape a single social platform and return count of new posts saved."""
    if platform == "instagram":
        url = f"https://www.instagram.com/{handle}/"
    elif platform == "facebook":
        url = f"https://www.facebook.com/{handle}/"
    else:
        return 0

    try:
        page_text = await fetch_page_text(url)
        if not page_text or len(page_text) < 100:
            return 0

        extracted = await _extract_posts_with_claude(page_text, platform)
        posts = extracted.get("posts", [])

        new_count = 0
        saved_posts = []

        for post in posts:
            content = post.get("content", "").strip()
            if not content:
                continue

            # Hash content as post_id for dedup
            post_id = hashlib.md5(content.encode()).hexdigest()

            # Check if already exists
            existing = db.execute(
                select(SocialPost).where(
                    SocialPost.competitor_id == competitor_id,
                    SocialPost.platform == platform,
                    SocialPost.post_id == post_id
                )
            ).scalar_one_or_none()

            if existing:
                continue

            new_post = SocialPost(
                competitor_id=competitor_id,
                platform=platform,
                post_id=post_id,
                content=content,
                posted_at=_parse_date(post.get("posted_at")),
                engagement_hint=post.get("engagement_hint"),
            )
            db.add(new_post)
            saved_posts.append({"content": content})
            new_count += 1

        # Summarize sentiment for new posts
        if saved_posts:
            sentiment_data = await _summarize_sentiment_with_claude(saved_posts, platform)
            # Update sentiment on newly saved posts
            sentiment_summary = sentiment_data.get("sentiment_summary", "")
            if sentiment_summary:
                # Set a general sentiment based on the summary
                general_sentiment = "neutral"
                lower_summary = sentiment_summary.lower()
                if any(w in lower_summary for w in ["positive", "upbeat", "happy", "excited"]):
                    general_sentiment = "positive"
                elif any(w in lower_summary for w in ["negative", "complaint", "frustrated", "angry"]):
                    general_sentiment = "negative"

                # Apply sentiment to the new posts we just added (they're in the session)
                for post_obj in db.new:
                    if isinstance(post_obj, SocialPost) and post_obj.competitor_id == competitor_id and post_obj.platform == platform:
                        post_obj.sentiment = general_sentiment

        db.commit()
        return new_count

    except Exception as e:
        print(f"Error scraping {platform} for handle {handle}: {e}")
        db.rollback()
        return 0


async def scrape_social_posts(competitor_id: str, instagram_handle: str | None, facebook_page: str | None, db: Session) -> dict:
    """Fetch recent public posts from Instagram/Facebook via Jina."""
    comp_uuid = _uuid.UUID(competitor_id)

    instagram_posts = 0
    facebook_posts = 0

    if instagram_handle:
        instagram_posts = await _scrape_platform(comp_uuid, "instagram", instagram_handle, db)

    if facebook_page:
        facebook_posts = await _scrape_platform(comp_uuid, "facebook", facebook_page, db)

    return {"instagram_posts": instagram_posts, "facebook_posts": facebook_posts}
