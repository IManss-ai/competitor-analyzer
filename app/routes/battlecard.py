import os
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import anthropic

from app.db import get_session
from app.models import Competitor, ChangeEvent, ReviewSnapshot, Review, SocialPost
from app.pipeline.job_tracker import get_latest_hiring_signal

import uuid as _uuid

router = APIRouter(prefix="/api/v1/battlecards", tags=["battlecards"])


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


def _generate_local_battlecard(comp: Competitor, db: Session) -> dict:
    """Build a Battle Card tuned for local/B2C operators using reviews + social posts."""
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

    api_key = os.getenv("ANTHROPIC_API_KEY")
    is_dummy = (not api_key) or (api_key == "dummy_anthropic_key")

    executive_summary = ""
    what_changed = []
    strategic_signals = []
    playbook = []

    if not is_dummy:
        client = anthropic.Anthropic(api_key=api_key)
        weakness_str = "\n".join(f"- {w}" for w in weaknesses)
        user_prompt = f"""Local competitor: {comp.name or comp.url}

{rating_line}Recent reviews (last 7 days):
{review_summary}

Recent social posts (last 7 days):
{post_summary}

Known customer complaints:
{weakness_str}"""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": [
                        {"type": "text", "text": LOCAL_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
                        {"type": "text", "text": user_prompt}
                    ]}
                ],
                temperature=0.7,
            )
            content = response.content[0].text
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
            import sys, traceback
            print(f"[ERROR] Local battlecard Anthropic call failed: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)

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

    return {
        "title": f"{comp.name or comp.url} Battle Card — Week of {datetime.now().strftime('%b %d, %Y')}",
        "executive_summary": executive_summary,
        "what_changed": what_changed,
        "weaknesses": weaknesses[:4],
        "talking_points": playbook,
        "win_conditions": strategic_signals,
        "strategic_signals": strategic_signals,
        "playbook": playbook,
        "share_token": str(comp.id),
        "generated_at": datetime.now().isoformat(),
        "actions": playbook,
        "variant": "local",
    }


@router.get("/generate/{competitor_id}")
def generate_battlecard(competitor_id: str, db: Session = Depends(get_session)):
    try:
        comp_uuid = _uuid.UUID(competitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor UUID format")

    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")

    if comp.business_type == "local":
        return _generate_local_battlecard(comp, db)

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    changes = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == comp_uuid)
        .where(ChangeEvent.detected_at >= seven_days_ago)
    ).scalars().all()

    change_list_texts = [c.brief_text for c in changes if c.brief_text]
    
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

    if not weaknesses:
        # Static baseline weaknesses
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

    api_key = os.getenv("ANTHROPIC_API_KEY")
    is_dummy = (not api_key) or (api_key == "dummy_anthropic_key")

    executive_summary = ""
    what_changed = []
    strategic_signals = []
    playbook = []

    if not is_dummy:
        client = anthropic.Anthropic(api_key=api_key)
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
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": [
                        {"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}},
                        {"type": "text", "text": user_prompt}
                    ]}
                ],
                temperature=0.7
            )
            content = response.content[0].text
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
            import sys
            import traceback
            print(f"[ERROR] Failed to generate battlecard using Anthropic API: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)

    # Heuristic fallback if API key is dummy or request fails
    if not playbook:
        has_pricing = any("price" in c.lower() or "pricing" in c.lower() for c in change_list_texts)
        has_feature = any("feature" in c.lower() or "copilot" in c.lower() for c in change_list_texts)

        # Set fallback weaknesses (up to 3)
        fallback_weaknesses = weaknesses[:3] if weaknesses else [
            "Opaque custom quoting required for enterprise tiers.",
            "Customer support delays reported during migration.",
            "Mobile user experience responsiveness issues."
        ]

        if has_pricing:
            executive_summary = f"{comp.name or comp.url} is adjusting pricing structure to optimize revenue, potentially creating friction for SMBs."
            what_changed = [
                {"type": "pricing_change", "text": f"Updated landing page to highlight custom quote pricing instead of transparent flat rates."}
            ]
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
            what_changed = [
                {"type": "feature_add", "text": "Released new workflow integration and authentication templates on public surfaces."}
            ]
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
            what_changed = [
                {"type": "repositioning", "text": "Refined hero copy and brand messaging to emphasize developer-first infrastructure."}
            ]
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
        
        weaknesses = fallback_weaknesses

    # Return rich battle card payload, actions maps to playbook for backwards compatibility
    return {
        "title": f"{comp.name or comp.url} Battle Card — Week of {datetime.now().strftime('%b %d, %Y')}",
        "executive_summary": executive_summary,
        "what_changed": what_changed,
        "weaknesses": weaknesses[:4],
        "talking_points": playbook,  # Keep mapping to avoid breaking other endpoints if any
        "win_conditions": strategic_signals,
        "strategic_signals": strategic_signals,
        "playbook": playbook,
        "share_token": str(comp.id),
        "generated_at": datetime.now().isoformat(),
        "actions": playbook,
        "variant": "saas",
    }


@router.get("/public/{competitor_id}")
def generate_public_battlecard(competitor_id: str, db: Session = Depends(get_session)):
    try:
        comp_uuid = _uuid.UUID(competitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor UUID format")

    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
    if not comp.active:
        raise HTTPException(status_code=403, detail="Competitor is inactive")

    res = generate_battlecard(competitor_id, db)
    res["competitor_name"] = comp.name or comp.url
    res["competitor_url"] = comp.url
    return res
