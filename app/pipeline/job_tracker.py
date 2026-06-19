import hashlib
import json
import logging
import uuid as _uuid
from datetime import datetime, timedelta

import app.llm as llm
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import JobPosting, JobSnapshot
from app.observability import note_degraded
from app.pipeline.review_scraper import fetch_page_text, _extract_json_from_response

logger = logging.getLogger(__name__)


CAREERS_PATH_CANDIDATES = [
    "/careers",
    "/jobs",
    "/about/careers",
    "/company/careers",
    "/about/jobs",
    "/company/jobs",
    "/work-with-us",
    "/join",
    "/join-us",
    "/join-our-team",
    "/team/careers",
]

CAREERS_KEYWORDS = (
    "career",
    "open positions",
    "open roles",
    "we're hiring",
    "we are hiring",
    "join our team",
    "current openings",
    "apply now",
    "view jobs",
    "all jobs",
    "hiring",
)


def _normalize_homepage(homepage_url: str) -> str:
    """Strip path/query, return scheme://host. Returns empty string if URL is unusable."""
    if not homepage_url:
        return ""
    url = homepage_url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    scheme_split = url.split("://", 1)
    if len(scheme_split) != 2:
        return ""
    host = scheme_split[1].split("/", 1)[0]
    if not host:
        return ""
    return f"{scheme_split[0]}://{host}"


async def probe_careers_url(homepage_url: str) -> str | None:
    """Walk common careers paths, return the first URL that 200s with hiring keywords."""
    base = _normalize_homepage(homepage_url)
    if not base:
        return None

    async with httpx.AsyncClient(
        timeout=6.0,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 RivalscopeBot/1.0"},
    ) as client:
        for path in CAREERS_PATH_CANDIDATES:
            candidate = f"{base}{path}"
            try:
                resp = await client.get(candidate)
            except Exception as e:
                logger.debug("careers probe %s errored: %s", candidate, e)
                continue
            if resp.status_code != 200:
                continue
            body = (resp.text or "").lower()
            if any(kw in body for kw in CAREERS_KEYWORDS):
                logger.info("careers probe matched %s for %s", candidate, base)
                return str(resp.url)
    logger.info("careers probe found no match for %s", base)
    return None


async def _extract_jobs_with_claude(text: str) -> dict:
    """Pull job listings out of a careers-page text dump."""
    if not llm.ai_available():
        return {"jobs": []}

    client = llm.get_async_client()
    prompt = """Extract every distinct open job posting from this careers page. Return ONLY JSON:
{
  "jobs": [
    {"title": "str", "location": "str|null", "department": "str|null", "url": "str|null"}
  ]
}

Rules:
- Title must be the job title only (e.g., "Senior Software Engineer"), not the surrounding sentence.
- Location is the city/region/remote tag if shown ("Remote", "San Francisco, CA", "London"). Null if unknown.
- Department is the team or function ("Engineering", "Sales", "Customer Success"). Null if unknown.
- url is a direct link to the job description if present in the page; null otherwise.
- If no jobs found, return {"jobs": []}.
- Do not duplicate jobs that appear multiple times in nav/footer.

Text:
""" + text[:18000]

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts structured job posting data from careers pages."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return _extract_json_from_response(response.choices[0].message.content)
    except Exception as e:
        note_degraded("job_tracker.extract", "empty", "api_error", e)
        return {"jobs": []}


async def _interpret_hiring_pattern(competitor_name: str, new_jobs: list, total_jobs: int) -> str | None:
    """Ask LLM for a 1-sentence strategic interpretation of the hiring delta."""
    if not llm.ai_available() or not new_jobs:
        return None

    client = llm.get_async_client()
    new_jobs_summary = "\n".join(
        f"- {j.get('title','?')} ({j.get('department') or 'unknown dept'}, {j.get('location') or 'unknown loc'})"
        for j in new_jobs[:20]
    )
    prompt = f"""Competitor: {competitor_name}
Total open roles right now: {total_jobs}
Newly posted roles since last check:
{new_jobs_summary}

In ONE sentence (under 30 words), interpret what these new postings signal strategically.
Examples of strong outputs:
- "Three new enterprise AE postings signal a clear upmarket pivot away from self-serve."
- "Heavy applied-ML hiring in two weeks suggests an AI feature launch is imminent."
- "Six new EU-based roles point to a near-term European market expansion."

Output the sentence only, no preamble or quotes."""

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=200,
            messages=[
                {"role": "system", "content": "You are a strategic analyst. Output exactly one sentence with no preamble or quotes."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content.strip().strip('"').strip()
    except Exception as e:
        note_degraded("job_tracker.interpret", "none", "api_error", e)
        return None


def _posting_id(title: str, location: str | None) -> str:
    raw = f"{(title or '').strip().lower()}|{(location or '').strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


async def scrape_job_postings(competitor_id: str, careers_url: str, db: Session, competitor_name: str = "") -> dict:
    """Fetch careers page, diff against last scan, upsert postings, write a JobSnapshot."""
    comp_uuid = _uuid.UUID(competitor_id)

    try:
        page_text = await fetch_page_text(careers_url)
    except Exception as e:
        logger.warning("careers fetch failed for %s: %s", careers_url, e)
        return {}

    if not page_text or len(page_text) < 100:
        logger.info("careers page empty/short for %s", careers_url)
        return {}

    extracted = await _extract_jobs_with_claude(page_text)
    jobs = extracted.get("jobs", []) or []

    now = datetime.utcnow()
    seen_ids = set()
    new_jobs_meta = []

    for j in jobs:
        title = (j.get("title") or "").strip()
        if not title:
            continue
        location = (j.get("location") or "").strip() or None
        department = (j.get("department") or "").strip() or None
        url = (j.get("url") or "").strip() or None
        pid = _posting_id(title, location)
        seen_ids.add(pid)

        existing = db.execute(
            select(JobPosting).where(
                JobPosting.competitor_id == comp_uuid,
                JobPosting.posting_id == pid,
            )
        ).scalar_one_or_none()

        if existing:
            existing.last_seen_at = now
            existing.closed_at = None
            if department and not existing.department:
                existing.department = department
            if url and not existing.url:
                existing.url = url
        else:
            db.add(JobPosting(
                competitor_id=comp_uuid,
                posting_id=pid,
                title=title,
                location=location,
                department=department,
                url=url,
                first_seen_at=now,
                last_seen_at=now,
            ))
            new_jobs_meta.append({"title": title, "location": location, "department": department})

    # Mark postings as closed if they weren't seen this run
    still_open = db.execute(
        select(JobPosting).where(
            JobPosting.competitor_id == comp_uuid,
            JobPosting.closed_at.is_(None),
        )
    ).scalars().all()

    closed_count = 0
    for p in still_open:
        if p.posting_id not in seen_ids:
            p.closed_at = now
            closed_count += 1

    total_jobs = len(seen_ids)
    strategic_signal = await _interpret_hiring_pattern(competitor_name or "the competitor", new_jobs_meta, total_jobs)

    snapshot = JobSnapshot(
        competitor_id=comp_uuid,
        snapshot_at=now,
        total_jobs=total_jobs,
        new_postings=len(new_jobs_meta),
        closed_postings=closed_count,
        strategic_signal=strategic_signal,
    )
    db.add(snapshot)
    db.commit()

    return {
        "total_jobs": total_jobs,
        "new_postings": len(new_jobs_meta),
        "closed_postings": closed_count,
        "strategic_signal": strategic_signal,
    }


def get_latest_hiring_signal(competitor_id: str, db: Session, max_age_days: int = 7) -> JobSnapshot | None:
    """Return the most recent JobSnapshot within max_age_days, or None."""
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)
    return db.execute(
        select(JobSnapshot)
        .where(JobSnapshot.competitor_id == _uuid.UUID(competitor_id))
        .where(JobSnapshot.snapshot_at >= cutoff)
        .order_by(JobSnapshot.snapshot_at.desc())
        .limit(1)
    ).scalar_one_or_none()
