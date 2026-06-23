import os
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import app.llm as llm

from app.db import get_session
from app.observability import note_degraded
from app.models import Competitor, ChangeEvent, ReviewSnapshot, Review, SocialPost, BattleCardCache, User
from app.pipeline.job_tracker import get_latest_hiring_signal
from app.routes.api_v1 import require_api_user
from app.access import is_read_only
from app.serialization import iso_utc

import uuid as _uuid

router = APIRouter(prefix="/api/v1/battlecards", tags=["battlecards"])

# How long a generated battle card stays valid with no new intel. Cards also
# refresh early whenever new events/reviews/posts arrive after generation.
CACHE_MAX_AGE = timedelta(days=7)


def _load_cache(comp_id, db: Session) -> BattleCardCache | None:
    return db.execute(
        select(BattleCardCache).where(BattleCardCache.competitor_id == comp_id)
    ).scalar_one_or_none()


def _has_new_intel(comp: Competitor, since: datetime, db: Session) -> bool:
    """True if any intel relevant to this competitor's card variant arrived
    after the cached card was generated."""
    if comp.business_type == "local":
        new_review = db.execute(
            select(Review.id).where(Review.competitor_id == comp.id, Review.fetched_at > since).limit(1)
        ).scalar_one_or_none()
        if new_review:
            return True
        new_post = db.execute(
            select(SocialPost.id).where(SocialPost.competitor_id == comp.id, SocialPost.fetched_at > since).limit(1)
        ).scalar_one_or_none()
        return new_post is not None
    new_event = db.execute(
        select(ChangeEvent.id).where(ChangeEvent.competitor_id == comp.id, ChangeEvent.detected_at > since).limit(1)
    ).scalar_one_or_none()
    return new_event is not None


def _cache_is_fresh(cached: BattleCardCache, comp: Competitor, db: Session) -> bool:
    if cached.generated_at is None:
        return False
    if datetime.utcnow() - cached.generated_at > CACHE_MAX_AGE:
        return False
    return not _has_new_intel(comp, cached.generated_at, db)


def _store_cache(comp_id, payload: dict, ai_generated: bool, db: Session) -> None:
    cached = _load_cache(comp_id, db)
    if cached is None:
        cached = BattleCardCache(competitor_id=comp_id)
        db.add(cached)
    cached.payload = json.dumps(payload)
    cached.ai_generated = ai_generated
    cached.generated_at = datetime.utcnow()
    db.commit()


LOCAL_SYSTEM_PROMPT = """You are a senior local business strategist advising an independent operator (restaurant, salon, gym, retail shop, etc.) on how to win against a nearby competitor.
Your tone is direct, practical, specific to local foot traffic and reputation. Do not write as a helpful AI assistant.
Do not use generic fluff, placeholder text, or B2B sales jargon (no "leverage", "delve", "synergy", "enterprise", "SaaS").

Return ONLY valid JSON in the exact format below, with no other text:
{
  "executive_summary": "1-2 sentence synthesis of what this competitor is doing locally this week",
  "what_changed": [
    {"type": "review_trend|social_campaign|new_offer|reputation_shift", "text": "description of activity"}
  ],
  "weaknesses": ["complaint or weakness 1", "complaint 2", "complaint 3"],
  "strategic_signals": [
    "Interpretation of what their activity MEANS strategically (e.g. 'Three discount posts in a row signal slowing weekday foot traffic')"
  ],
  "playbook": [
    "Specific ranked action the user should take this week — under 25 words, starts with a verb, concrete and local"
  ]
}

Rules for sections:
- executive_summary: A concise read on the competitor's local position and momentum this week.
- what_changed: 1-4 items reflecting real social posts or review trends. Use the type values shown.
- weaknesses: 2-4 items pulled from actual review complaints.
- strategic_signals: 2-3 items interpreting what their behavior means (e.g. they are losing returning customers, they are pushing a new product line).
- playbook: Exactly 5 ranked actions for a local operator, most impactful first. Each under 25 words, starts with a verb (e.g., 'Run', 'Target', 'Reply', 'Offer', 'Capture'). Must be concrete and locally executable (Google Local Ads, in-store signage, Instagram reply campaigns, Yelp response, neighborhood flyering, etc.) — NOT abstract B2B sales plays."""


def _generate_local_battlecard(comp: Competitor, db: Session, allow_ai: bool = True) -> tuple[dict, bool]:
    """Build a Battle Card tuned for local/B2C operators using reviews + social posts.
    Returns (payload, ai_generated)."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    recent_reviews = db.execute(
        select(Review)
        .where(Review.competitor_id == comp.id)
        .where(Review.published_at >= seven_days_ago)
        .order_by(Review.published_at.desc())
        .limit(20)
    ).scalars().all()

    recent_posts = db.execute(
        select(SocialPost)
        .where(SocialPost.competitor_id == comp.id)
        .where(SocialPost.posted_at >= seven_days_ago)
        .order_by(SocialPost.posted_at.desc())
        .limit(10)
    ).scalars().all()

    latest_snapshot = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp.id)
        .order_by(ReviewSnapshot.snapshot_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    weaknesses = []
    if latest_snapshot and latest_snapshot.top_complaints:
        try:
            parsed_complaints = json.loads(latest_snapshot.top_complaints)
            if isinstance(parsed_complaints, list):
                weaknesses.extend(parsed_complaints)
        except Exception:
            pass

    if not weaknesses:
        complaint_bodies = db.execute(
            select(Review.body)
            .where(Review.competitor_id == comp.id, Review.is_complaint == True)
            .order_by(Review.published_at.desc())
            .limit(5)
        ).scalars().all()
        weaknesses = [c[:120] for c in complaint_bodies]

    if not weaknesses:
        weaknesses = [
            "Slow service during peak hours mentioned in recent reviews.",
            "Inconsistent quality flagged across multiple reviewers.",
            "Limited weekend availability frustrates regulars.",
        ]

    review_summary_lines = []
    for r in recent_reviews[:10]:
        rating = r.rating if r.rating is not None else "?"
        snippet = (r.body or "")[:140].replace("\n", " ")
        review_summary_lines.append(f"- [{rating}/5 {r.platform}] {snippet}")
    review_summary = "\n".join(review_summary_lines) or "No new reviews this week."

    post_summary_lines = []
    for p in recent_posts:
        snippet = (p.content or "")[:140].replace("\n", " ")
        post_summary_lines.append(f"- [{p.platform}] {snippet}")
    post_summary = "\n".join(post_summary_lines) or "No new social posts this week."

    rating_line = ""
    if latest_snapshot and latest_snapshot.avg_rating is not None:
        rating_line = f"Current avg rating: {latest_snapshot.avg_rating}/5 across {latest_snapshot.total_reviews or '?'} reviews ({latest_snapshot.complaint_count or 0} complaints flagged).\n"

    is_dummy = (not llm.ai_available()) or not allow_ai

    executive_summary = ""
    what_changed = []
    strategic_signals = []
    playbook = []

    if not is_dummy:
        client = llm.get_sync_client()
        weakness_str = "\n".join(f"- {w}" for w in weaknesses)
        user_prompt = f"""Local competitor: {comp.name or comp.url}

{rating_line}Recent reviews (last 7 days):
{review_summary}

Recent social posts (last 7 days):
{post_summary}

Known customer complaints:
{weakness_str}"""

        try:
            response = client.chat.completions.create(
                model=llm.MODEL,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": LOCAL_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                extra_body=llm.THINKING_OFF,
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            parsed = json.loads(content)
            executive_summary = parsed.get("executive_summary", "")
            what_changed = parsed.get("what_changed", [])
            weaknesses = parsed.get("weaknesses", weaknesses)
            strategic_signals = parsed.get("strategic_signals", [])
            playbook = parsed.get("playbook", [])
        except Exception as e:
            note_degraded("battlecard.local", "heuristic", "api_error", e)
    elif allow_ai:
        note_degraded("battlecard.local", "heuristic", "dummy_key")

    ai_generated = bool(playbook)
    if not playbook:
        name = comp.name or comp.url
        has_complaints = bool(latest_snapshot and (latest_snapshot.complaint_count or 0) > 0)
        active_social = len(recent_posts) >= 3

        if has_complaints:
            executive_summary = f"{name} is accumulating customer complaints this week — an opening to capture defectors."
            what_changed = [{"type": "reputation_shift", "text": f"{latest_snapshot.complaint_count if latest_snapshot else 'Multiple'} new complaints flagged in recent reviews."}]
            strategic_signals = [
                f"{name}'s reputation is softening — unhappy customers are documenting issues publicly.",
                "Operational pain points are concentrated and recurring, not one-off incidents.",
            ]
            playbook = [
                f"Reply to {name}'s unhappy reviewers on Google with a courteous invite to try your business.",
                "Run a 'first visit free dessert' promo specifically targeting their negative reviewer geography.",
                "Capture their dissatisfied customer base with a Google Local Ad referencing their pain points.",
                "Train staff this week on the specific friction points appearing in their reviews.",
                "Post a quiet testimonial video addressing the exact complaint themes without naming the competitor.",
            ]
        elif active_social:
            executive_summary = f"{name} is running an active social push this week — likely chasing slowing weekday traffic."
            what_changed = [{"type": "social_campaign", "text": f"{len(recent_posts)} posts across Instagram/Facebook in the last 7 days."}]
            strategic_signals = [
                f"{name} is investing in top-of-funnel social reach, not retention.",
                "Frequent posting cadence suggests they are reacting to a near-term revenue gap.",
            ]
            playbook = [
                f"Audit {name}'s top-performing post format and respond with a counter-offer on the same channel.",
                "Run a loyalty punch-card promo this week aimed at returning customers, not new ones.",
                "Reply to their high-engagement posts with a tasteful, helpful comment that surfaces your brand.",
                "Boost one of your own best-performing organic posts geo-targeted to their immediate neighborhood.",
                "Capture their followers with a free-sample collab post with a complementary local business.",
            ]
        else:
            executive_summary = f"{name} is quiet this week — a stable competitor with no obvious openings or threats."
            what_changed = [{"type": "review_trend", "text": "No notable social or review activity in the last 7 days."}]
            strategic_signals = [
                f"{name} appears to be coasting — no visible offensive moves or distress signals.",
                "Quiet weeks are the right time to invest in your own moat rather than react to them.",
            ]
            playbook = [
                "Focus on getting 5 new 5-star Google reviews from your best regulars this week.",
                "Run a referral promo: existing customers get a free item for bringing a friend.",
                "Audit your own Google Business profile for stale photos, hours, or menu items.",
                f"Run one Local Service Ad geo-targeted to {name}'s zip code to siphon search intent.",
                "Send a thank-you note campaign to your top 20 repeat customers — they are your moat.",
            ]
        weaknesses = weaknesses[:3]

    # Baseline for a local business = nothing recorded yet (no reviews, no posts).
    # Keeps the dashboard's "honest baseline" contract consistent across variants.
    is_baseline = (
        db.execute(select(Review.id).where(Review.competitor_id == comp.id).limit(1)).scalar_one_or_none() is None
        and db.execute(select(SocialPost.id).where(SocialPost.competitor_id == comp.id).limit(1)).scalar_one_or_none() is None
    )

    return {
        "title": f"{comp.name or comp.url} Battle Card — Week of {datetime.now().strftime('%b %d, %Y')}",
        "executive_summary": executive_summary,
        "what_changed": what_changed,
        "is_baseline": is_baseline,
        "weaknesses": weaknesses[:4],
        "talking_points": playbook,
        "win_conditions": strategic_signals,
        "strategic_signals": strategic_signals,
        "playbook": playbook,
        "share_token": str(comp.id),
        "generated_at": iso_utc(datetime.now(timezone.utc)),
        "actions": playbook,
        "variant": "local",
    }, ai_generated


def _has_real_change_ever(comp_id, db: Session) -> bool:
    """True once a real (non-initial_scan) change has ever been recorded for this
    competitor. initial_scan events are the baseline profile captured on first
    sight, not a detected change."""
    row = db.execute(
        select(ChangeEvent.id)
        .where(ChangeEvent.competitor_id == comp_id)
        .where(ChangeEvent.change_type.isnot(None))
        .where(ChangeEvent.change_type != "initial_scan")
        .limit(1)
    ).scalar_one_or_none()
    return row is not None


def _baseline_saas_payload(comp: Competitor, weaknesses: list, hiring_signal_text: str, is_baseline: bool) -> dict:
    """Honest SaaS card when there is nothing real to diff. Emits no fabricated
    change and (since the card is change-driven) costs no paid model call.
    `is_baseline` distinguishes a brand-new competitor from one we've tracked
    through a quiet week."""
    name = comp.name or comp.url
    if is_baseline:
        executive_summary = (
            f"Now tracking {name}. This is the baseline scan — no page changes to "
            f"report yet. Pricing, feature, and positioning shifts will surface here "
            f"as they happen."
        )
        signal = "Baseline captured. Strategic signals will appear as their public surfaces change."
    else:
        executive_summary = f"No homepage changes detected for {name} in the past week."
        signal = "A quiet week — no new moves on their public surfaces to react to."

    strategic_signals = []
    if hiring_signal_text:
        strategic_signals.append(f"Hiring signal: {hiring_signal_text}")
    strategic_signals.append(signal)

    # Plays that prepare for the next move WITHOUT asserting a change happened.
    playbook = [
        f"Capture {name}'s current pricing and positioning now so the next change is obvious.",
        "Write down your top 3 differentiators against them while there's no fire to fight.",
        "Set alerts on their pricing and changelog pages so the next shift reaches you first.",
        "Brief sales on the current competitive baseline before anything moves.",
        "Line up 2-3 fresh customer proof points to deploy the moment they change.",
    ]
    return {
        "title": f"{name} Battle Card — Week of {datetime.now().strftime('%b %d, %Y')}",
        "executive_summary": executive_summary,
        "what_changed": [],
        "is_baseline": is_baseline,
        "weaknesses": weaknesses[:4],
        "talking_points": playbook,
        "win_conditions": strategic_signals,
        "strategic_signals": strategic_signals,
        "playbook": playbook,
        "share_token": str(comp.id),
        "generated_at": iso_utc(datetime.now(timezone.utc)),
        "actions": playbook,
        "variant": "saas",
    }


def _generate_saas_battlecard(comp: Competitor, db: Session, allow_ai: bool = True) -> tuple[dict, bool]:
    """Build the SaaS Battle Card from change events, complaints, and hiring
    signals. Returns (payload, ai_generated)."""
    comp_uuid = comp.id
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    changes = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == comp_uuid)
        .where(ChangeEvent.detected_at >= seven_days_ago)
    ).scalars().all()

    # initial_scan events are the baseline profile we capture on first sight —
    # there is no prior snapshot to diff against, so they are NOT a detected
    # change. Treating them as one is what fabricated changes on a first scan
    # (issue #3, bug #1).
    real_changes = [c for c in changes if (c.change_type or "") != "initial_scan"]
    change_list_texts = [c.brief_text for c in real_changes if c.brief_text]

    # Baseline = we have never recorded a real (non-initial) change for this
    # competitor. True on a first scan, stays true until something actually
    # changes. Drives the honest is_baseline flag the dashboard renders.
    is_baseline = not _has_real_change_ever(comp_uuid, db)

    # Get review snapshots/complaints for weaknesses
    latest_snapshots = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp_uuid)
        .order_by(ReviewSnapshot.snapshot_at.desc())
        .limit(3)
    ).scalars().all()

    weaknesses = []
    for snap in latest_snapshots:
        if snap.top_complaints:
            try:
                complaints = json.loads(snap.top_complaints)
                if isinstance(complaints, list):
                    weaknesses.extend(complaints)
            except Exception:
                pass

    if not weaknesses:
        # Fallback to Review table complaints if snapshot doesn't have it
        complaints_in_db = db.execute(
            select(Review.body)
            .where(Review.competitor_id == comp_uuid, Review.is_complaint == True)
            .limit(5)
        ).scalars().all()
        weaknesses = [c[:100] for c in complaints_in_db]

    # Static filler weaknesses are only acceptable on a change-driven card. On a
    # baseline/quiet card (no real change) presenting invented weaknesses as fact
    # is the same dishonesty as inventing a change (issue #3, bug #1) — leave them
    # empty when we have no real complaints to show.
    if not weaknesses and change_list_texts:
        weaknesses = [
            f"Pricing transparency issues on their homepage.",
            "Customer support delays reported in forums.",
            "Mobile user experience lags behind the desktop site."
        ]

    hiring_snapshot = get_latest_hiring_signal(str(comp_uuid), db)
    hiring_signal_text = ""
    if hiring_snapshot:
        parts = [f"{hiring_snapshot.total_jobs} open roles right now"]
        if hiring_snapshot.new_postings:
            parts.append(f"{hiring_snapshot.new_postings} new this week")
        if hiring_snapshot.closed_postings:
            parts.append(f"{hiring_snapshot.closed_postings} closed since last scan")
        hiring_signal_text = "; ".join(parts)
        if hiring_snapshot.strategic_signal:
            hiring_signal_text += f". Pattern read: {hiring_snapshot.strategic_signal}"

    # Whether there is a real page change to report this week. When false, the
    # changes quadrant stays empty and the card leans on hiring/complaints — but
    # we never invent a change (issue #3, bug #1).
    has_change = bool(change_list_texts)

    is_dummy = (not llm.ai_available()) or not allow_ai

    executive_summary = ""
    what_changed = []
    strategic_signals = []
    playbook = []

    if not is_dummy:
        client = llm.get_sync_client()
        change_str = "\n".join(change_list_texts) if change_list_texts else "No changes detected in the past 7 days."
        weakness_str = "\n".join(weaknesses)

        system_prompt = """You are a senior B2B sales strategist. Generate a structured competitive battle card.
Your tone is professional, strategic, specific, and actionable. Do not write as a helpful AI assistant.
Do not use generic fluff or placeholder text.
Do not use the words "leverage" or "delve".

Return ONLY valid JSON in the exact format below, with no other text:
{
  "executive_summary": "1-2 sentence synthesis of the competitive situation this week",
  "what_changed": [
    {"type": "pricing_change|feature_add|repositioning|minor_copy", "text": "description of change"}
  ],
  "weaknesses": ["complaint or weakness 1", "complaint 2", "complaint 3"],
  "strategic_signals": [
    "Interpretation of what the changes MEAN strategically (e.g. 'Removing flat enterprise pricing signals they are moving upmarket and abandoning SMB')"
  ],
  "playbook": [
    "Specific ranked action the user should take this week — under 25 words, starts with a verb"
  ]
}

Rules for sections:
- executive_summary: A concise synthesis of this week's competitor moves.
- what_changed: 1-4 items representing real page changes. Classify 'type' exactly as 'pricing_change', 'feature_add', 'repositioning', or 'minor_copy'.
- weaknesses: 2-4 items reflecting user complaints/weaknesses.
- strategic_signals: 2-3 items. Interpret what these actions indicate about their strategy (e.g. hiring, positioning, feature focus).
- playbook: Exactly 5 ranked actions, most impactful first. Each must be under 25 words and start with a verb (e.g., 'Target', 'Deploy', 'Position')."""

        hiring_block = f"\n\nHiring signals: {hiring_signal_text}" if hiring_signal_text else ""
        user_prompt = f"""Competitor: {comp.name or comp.url}

Recent changes detected:
{change_str}

Known customer complaints/weaknesses:
{weakness_str}{hiring_block}"""

        try:
            response = client.chat.completions.create(
                model=llm.MODEL,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                extra_body=llm.THINKING_OFF,
            )
            content = response.choices[0].message.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            parsed = json.loads(content)
            executive_summary = parsed.get("executive_summary", "")
            what_changed = parsed.get("what_changed", [])
            weaknesses = parsed.get("weaknesses", weaknesses)
            strategic_signals = parsed.get("strategic_signals", [])
            playbook = parsed.get("playbook", [])
        except Exception as e:
            note_degraded("battlecard", "heuristic", "api_error", e)
    elif allow_ai:
        note_degraded("battlecard", "heuristic", "dummy_key")

    ai_generated = bool(playbook)
    # Heuristic fallback if API key is dummy or request fails
    if not playbook:
        # Set fallback weaknesses (up to 3)
        fallback_weaknesses = weaknesses[:3] if weaknesses else [
            "Opaque custom quoting required for enterprise tiers.",
            "Customer support delays reported during migration.",
            "Mobile user experience responsiveness issues."
        ]

        if not has_change:
            # No page change to report, but real hiring/complaint intel exists
            # (otherwise we'd have returned the baseline card already). Use the
            # honest baseline-style narrative — never a fabricated change.
            bp = _baseline_saas_payload(comp, weaknesses, hiring_signal_text, is_baseline)
            executive_summary = bp["executive_summary"]
            what_changed = []
            strategic_signals = bp["strategic_signals"]
            playbook = bp["playbook"]
            fallback_weaknesses = bp["weaknesses"]
        else:
            has_pricing = any("price" in c.lower() or "pricing" in c.lower() for c in change_list_texts)
            has_feature = any("feature" in c.lower() or "copilot" in c.lower() for c in change_list_texts)

            if has_pricing:
                executive_summary = f"{comp.name or comp.url} is adjusting pricing structure to optimize revenue, potentially creating friction for SMBs."
                strategic_signals = [
                    f"{comp.name or comp.url} is moving upmarket to target enterprise customers, leaving self-serve buyers underserved.",
                    "Opaque pricing structure signals potential upcoming margin compression or sales-led model pivot."
                ]
                playbook = [
                    f"Highlight our simple, transparent pricing structure compared to {comp.name or comp.url}'s updates.",
                    "Deploy dedicated target ads focusing on our flat-rate billing model with no seat limits.",
                    "Offer mid-market customers a free migration path to showcase immediate cost stability.",
                    "Empower sales reps to lead EMEA pitch calls focusing on simple, contract-free pricing.",
                    "Publish a budget comparison calculator demonstrating 40% savings over enterprise tiers."
                ]
            elif has_feature:
                executive_summary = f"{comp.name or comp.url} launched a major feature update to capture developer workflow integration."
                strategic_signals = [
                    f"{comp.name or comp.url} is attempting to increase platform lock-in by expanding core integrations.",
                    "Increased focus on developer experience suggests target competitor is capturing technical decision-makers."
                ]
                playbook = [
                    f"Showcase our production-ready reliability versus {comp.name or comp.url}'s recently released features.",
                    "Target developer teams with sandbox uptime guarantees and clean API documentation.",
                    "Add 'works out-of-the-box' templates directly to our getting started guides.",
                    "Run competitive comparison campaigns highlighting our simpler API schema.",
                    "Conduct outreach to dissatisfied integration users citing platform stability."
                ]
            else:
                executive_summary = f"{comp.name or comp.url} updated homepage copy to refine core brand positioning."
                strategic_signals = [
                    f"{comp.name or comp.url} is repositioning towards a pure technical persona, ignoring non-technical builders.",
                    "Subtle copy refinements indicate competitive positioning adjustments to counter rising platforms."
                ]
                playbook = [
                    f"Position our platform as the fastest developer-first alternative with zero setup friction.",
                    "Send target email playbooks focusing on our 24/7 dedicated engineering support lines.",
                    "Run Google Ads targeting {comp.name or comp.url} brand search queries with uptime stats.",
                    "Highlight our high-touch onboarding experience for non-technical team managers.",
                    "Build comparison landing page detailing our direct integration performance."
                ]
            # Describe the REAL change(s) we diffed, never a templated invention.
            # We only reach here with real briefs, so this is grounded data.
            what_changed = [
                {"type": (c.change_type or "repositioning"), "text": c.brief_text}
                for c in real_changes if c.brief_text
            ][:4]

        weaknesses = fallback_weaknesses

    # Honesty chokepoint: with no real page change this week, the changes quadrant
    # must be empty regardless of what the model returned (it can still invent one
    # even when told "no changes"). The card stays driven by hiring/complaints.
    if not has_change:
        what_changed = []

    # Return rich battle card payload, actions maps to playbook for backwards compatibility
    return {
        "title": f"{comp.name or comp.url} Battle Card — Week of {datetime.now().strftime('%b %d, %Y')}",
        "executive_summary": executive_summary,
        "what_changed": what_changed,
        "is_baseline": is_baseline,
        "weaknesses": weaknesses[:4],
        "talking_points": playbook,  # Keep mapping to avoid breaking other endpoints if any
        "win_conditions": strategic_signals,
        "strategic_signals": strategic_signals,
        "playbook": playbook,
        "share_token": str(comp.id),
        "generated_at": iso_utc(datetime.now(timezone.utc)),
        "actions": playbook,
        "variant": "saas",
    }, ai_generated


def _generate(comp: Competitor, db: Session, allow_ai: bool) -> tuple[dict, bool]:
    if comp.business_type == "local":
        return _generate_local_battlecard(comp, db, allow_ai=allow_ai)
    return _generate_saas_battlecard(comp, db, allow_ai=allow_ai)


def _resolve_competitor(competitor_id: str, db: Session) -> Competitor:
    try:
        comp_uuid = _uuid.UUID(competitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor UUID format")

    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return comp


def get_or_generate_battlecard(
    comp: Competitor, db: Session, force: bool = False, allow_generate: bool = True
) -> dict:
    """Cache-first battle card access for authenticated owner paths. Generates
    (one paid call) only when there is no fresh AI card or force=True.

    allow_generate=False (read-only / expired-trial callers) never triggers a
    paid call: it returns the cached card if present, else the free heuristic
    variant (not cached, so the owner's first real generation isn't masked)."""
    cached = _load_cache(comp.id, db)
    if cached and not force and cached.ai_generated and _cache_is_fresh(cached, comp, db):
        return json.loads(cached.payload)

    if not allow_generate:
        if cached:
            return json.loads(cached.payload)
        payload, _ = _generate(comp, db, allow_ai=False)
        return payload

    payload, ai_generated = _generate(comp, db, allow_ai=True)
    _store_cache(comp.id, payload, ai_generated, db)
    return payload


@router.get("/generate/{competitor_id}")
def generate_battlecard(
    competitor_id: str,
    force: bool = False,
    db: Session = Depends(get_session),
    user_id: str = Depends(require_api_user),
):
    comp = _resolve_competitor(competitor_id, db)
    if str(comp.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your competitor")

    # Read-only (expired trial) users may still VIEW a previously generated card,
    # but must not trigger a new (uncached) paid generation — including force=true.
    # Serve the cache if present; otherwise block with 402.
    user = db.get(User, _uuid.UUID(user_id))
    if user is not None and is_read_only(user):
        cached = _load_cache(comp.id, db)
        if cached:
            return json.loads(cached.payload)
        raise HTTPException(status_code=402, detail="Your trial has ended — upgrade to continue.")

    return get_or_generate_battlecard(comp, db, force=force)


@router.get("/public/{competitor_id}")
def generate_public_battlecard(competitor_id: str, db: Session = Depends(get_session)):
    """Public share endpoint. Serves the cached card (any age) and NEVER calls
    a paid model — this URL is reachable by anyone, including OG crawlers and
    bots, so an AI call here is an unmetered cost leak."""
    comp = _resolve_competitor(competitor_id, db)
    if not comp.active:
        raise HTTPException(status_code=403, detail="Competitor is inactive")

    cached = _load_cache(comp.id, db)
    if cached:
        res = json.loads(cached.payload)
    else:
        # No card generated yet: build the free heuristic variant. Don't cache
        # it, so the owner's first real (AI) generation isn't masked.
        res, _ = _generate(comp, db, allow_ai=False)
    res["competitor_name"] = comp.name or comp.url
    res["competitor_url"] = comp.url
    return res
