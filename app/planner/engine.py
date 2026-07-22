"""Action Plan engine — the synthesis layer.

Turns everything Rivalscope knows about a competitor (page changes, review
complaints, pricing, hiring, tech) into a ranked, concrete counter-plan.

COST CONTRACT (same rules as battlecards, see CLAUDE.md):
- plans are cached per campaign; regenerated only on new intel or force
- one Sonnet call per generation, prompt-cached system block
- heuristic fallback must produce a complete, demoable plan with zero AI
"""
import json
import os
from datetime import datetime, timedelta

import app.llm as llm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ActionPlan, ActionPlanItem, AppPricing, Campaign, ChangeEvent,
    Competitor, Review, ReviewSnapshot,
)
from app.observability import note_degraded
from app.pipeline.job_tracker import get_latest_hiring_signal

PLAN_SYSTEM_PROMPT = """You are a ruthless but practical competitive strategist for a small SaaS founder.
Generate a concrete action plan to beat ONE specific competitor, based on real intelligence provided.
No fluff, no "leverage", no "delve". Every play must be executable by a solo founder within 2 weeks.

Return ONLY valid JSON:
{
  "executive_read": "1-2 sentence read of the competitor's position and the opening it creates",
  "plays": [
    {"title": "imperative title under 12 words",
     "body": "concrete first step + drafted copy where applicable (a pricing-page line, an email opener, a post)",
     "category": "pricing|feature|content|reputation|geo"}
  ]
}
Rules: exactly 5 plays, most impactful first. Each play must reference the actual intelligence provided
(a real change, a real complaint theme, a real signal), never generic advice.
Style: plain, concrete sentences a human strategist would write. Never use em dashes. Never mention "the input", "the data provided", or missing information."""


def _gather_signals(campaign: Campaign, db: Session) -> dict:
    comp = db.execute(select(Competitor).where(Competitor.id == campaign.competitor_id)).scalar_one()
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    events = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == comp.id, ChangeEvent.detected_at >= thirty_days_ago)
        .order_by(ChangeEvent.detected_at.desc())
        .limit(10)
    ).scalars().all()

    snapshot = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp.id)
        .order_by(ReviewSnapshot.snapshot_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    complaints = []
    if snapshot and snapshot.top_complaints:
        try:
            parsed = json.loads(snapshot.top_complaints)
            if isinstance(parsed, list):
                complaints = parsed[:5]
        except Exception:
            pass
    if not complaints:
        complaints = [
            r[0][:120] for r in db.execute(
                select(Review.body)
                .where(Review.competitor_id == comp.id, Review.is_complaint == True)  # noqa: E712
                .order_by(Review.published_at.desc())
                .limit(5)
            )
        ]

    pricing = []
    if comp.app_id:
        pricing = [
            {"tier": p.tier_name, "price": p.price, "period": p.period}
            for p in db.execute(
                select(AppPricing).where(AppPricing.app_id == comp.app_id)
            ).scalars().all()
        ]

    hiring = get_latest_hiring_signal(str(comp.id), db)

    return {
        "competitor": comp,
        "events": events,
        "complaints": complaints,
        "pricing": pricing,
        "avg_rating": snapshot.avg_rating if snapshot else None,
        "hiring": hiring,
    }


# Change types that must NOT count as new intel for the regeneration trigger.
# Mirrors the battlecard cache guard (battlecard._has_new_intel): with the
# edit-magnitude differ, rotating page content emits minor_copy events every
# scan — without this filter every war-room view after a scan fired a fresh
# paid regeneration.
NOISE_CHANGE_TYPES = ("minor_copy", "no_change", "initial_scan")


def _has_new_intel(campaign: Campaign, since: datetime, db: Session) -> bool:
    """True if a real, classified change event landed after the cached plan.

    Queries directly rather than reusing signals["events"] so a burst of noise
    events can't crowd real intel out of that limit(10) window. Only classified
    non-noise changes count — classifier-suppressed events (minor_copy /
    no_change), baseline initial_scan events, and unclassified NULL rows must
    not invalidate the cache."""
    row = db.execute(
        select(ChangeEvent.id).where(
            ChangeEvent.competitor_id == campaign.competitor_id,
            ChangeEvent.detected_at > since,
            ChangeEvent.change_type.isnot(None),
            ChangeEvent.change_type.notin_(NOISE_CHANGE_TYPES),
        ).limit(1)
    ).scalar_one_or_none()
    return row is not None


def _build_user_prompt(signals: dict) -> str:
    comp = signals["competitor"]
    event_lines = "\n".join(
        f"- [{e.change_type or 'change'}] {e.brief_text or f'{e.net_char_delta} chars changed'}"
        for e in signals["events"]
    ) or "No page changes detected in the last 30 days (they are quiet, and that is itself a signal)."
    complaint_lines = "\n".join(f"- {c}" for c in signals["complaints"]) or "No complaint data yet."
    pricing_lines = "\n".join(
        f"- {p['tier']}: {'custom' if p['price'] is None else '$' + str(p['price'])}/{p['period']}"
        for p in signals["pricing"]
    ) or "Pricing not yet scraped."
    hiring_line = ""
    if signals["hiring"]:
        h = signals["hiring"]
        hiring_line = f"\nHiring: {h.total_jobs} open roles, {h.new_postings} new this week. {h.strategic_signal or ''}"

    return f"""Competitor: {comp.name or comp.url} ({comp.url})

Recent page changes (30 days):
{event_lines}

Their customers' top complaints:
{complaint_lines}

Their pricing:
{pricing_lines}{hiring_line}

Average review rating: {signals['avg_rating'] or 'unknown'}/5"""


def _heuristic_plan(signals: dict) -> tuple[str, list[dict]]:
    """Complete rule-based plan from real signals. Zero AI — must demo well."""
    comp = signals["competitor"]
    name = comp.name or comp.url
    plays: list[dict] = []

    pricing_events = [e for e in signals["events"] if e.change_type == "pricing_change"]
    feature_events = [e for e in signals["events"] if e.change_type == "feature_add"]
    complaints = signals["complaints"]

    if pricing_events:
        detail = pricing_events[0].brief_text or "a pricing change"
        plays.append({
            "title": f"Counter {name}'s pricing move this week",
            "body": f'They just made a pricing change ({detail}). Add a price-stability banner to your pricing page: '
                    f'"Our price is our price. No surprise raises." Email your trial users contrasting your '
                    f'predictability with their move.',
            "category": "pricing",
        })
    if complaints:
        theme = complaints[0]
        plays.append({
            "title": "Attack their loudest complaint theme",
            "body": f'Their users keep saying: "{theme}". Publish a comparison section addressing exactly this, '
                    f'and reply helpfully under their negative reviews/threads where allowed.',
            "category": "reputation",
        })
    if feature_events:
        detail = feature_events[0].brief_text or "a new feature"
        plays.append({
            "title": f"Neutralize {name}'s feature announcement",
            "body": f"They shipped: {detail}. Write a 'works out of the box' counter-post showing your equivalent "
                    f"path with zero setup, and add it to your comparison page.",
            "category": "feature",
        })
    plays.append({
        "title": "Win the AI-recommendation race",
        "body": f'Ask ChatGPT and Perplexity "best tool for your category" and record who gets named. Publish two '
                f'comparison pages (you vs {name}) structured as direct answers; AI engines cite exactly these.',
        "category": "geo",
    })
    plays.append({
        "title": "Capture their churners at the exit",
        "body": f'Target searches like "{name} cancel / export / alternative" with one narrow ad or SEO page: '
                f"the highest-intent traffic in your niche. Offer a migration path on the landing page.",
        "category": "content",
    })
    fillers = [
        {
            "title": f"Force the comparison with {name}",
            "body": f"Ship a public 'you vs {name}' page this week: feature table, pricing honesty, migration path. "
                    f"Comparison pages convert the highest-intent visitors in any niche and feed the AI engines.",
            "category": "content",
        },
        {
            "title": "Stack 5 fresh reviews while they idle",
            "body": "Ask your 5 happiest users for a G2/Trustpilot review this week (personal message, one link). "
                    f"Review velocity is the trust signal buyers and AI engines check first against {name}.",
            "category": "reputation",
        },
        {
            "title": "Out-ship them visibly",
            "body": "Publish a public changelog entry for everything you ship this sprint. Visible momentum vs a "
                    "quiet competitor reframes the comparison from features to trajectory.",
            "category": "feature",
        },
    ]
    for filler in fillers:
        if len(plays) >= 5:
            break
        plays.append(filler)
    plays = plays[:5]

    if pricing_events:
        read = f"{name} is adjusting pricing. Windows like this convert their fence-sitters if you move within days."
    elif complaints:
        read = f"{name}'s users are documenting pain publicly. Their reputation is the soft flank to attack."
    else:
        read = f"{name} is coasting. Out-ship and out-rank them while they sleep."
    return read, plays


def _ai_plan(signals: dict) -> tuple[str, list[dict]] | None:
    if not llm.ai_available():
        note_degraded("planner", "heuristic", "dummy_key")
        return None
    try:
        client = llm.get_sync_client()
        resp = client.chat.completions.create(
            model=llm.MODEL,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": PLAN_SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(signals)},
            ],
            temperature=0.6,
            response_format={"type": "json_object"},
            extra_body=llm.THINKING_OFF,
        )
        content = resp.choices[0].message.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        parsed = json.loads(content)
        plays = [
            {
                "title": str(p.get("title", ""))[:120],
                "body": str(p.get("body", ""))[:1500],
                "category": p.get("category") if p.get("category") in
                            {"pricing", "feature", "content", "reputation", "geo"} else "content",
            }
            for p in parsed.get("plays", []) if isinstance(p, dict) and p.get("title")
        ][:5]
        if len(plays) < 3:
            note_degraded("planner", "heuristic", "thin_ai_output")
            return None
        return str(parsed.get("executive_read", ""))[:500], plays
    except Exception as e:
        note_degraded("planner", "heuristic", "api_error", e)
        return None


def get_or_generate_plan(
    campaign: Campaign, db: Session, force: bool = False, allow_generate: bool = True
) -> ActionPlan | None:
    """Cache-first plan access. Regenerates only on new intel or force=True.

    `allow_generate=False` is the read-only / paywalled path (a locked user
    opening the war room): serve the latest cached plan — even if stale — or
    None, and never fall through to generation. No paid model call, and no
    heuristic fallback either (generation persists ActionPlan rows, a write a
    locked user must not trigger). Mirrors battlecard's allow_ai=False
    contract without breaking the page render."""
    latest = db.execute(
        select(ActionPlan)
        .where(ActionPlan.campaign_id == campaign.id)
        .order_by(ActionPlan.generated_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not allow_generate:
        return latest

    if latest and not force:
        if not _has_new_intel(campaign, latest.generated_at or datetime.min, db):
            return latest

    signals = _gather_signals(campaign, db)
    result = _ai_plan(signals)
    ai_generated = result is not None
    if result is None:
        result = _heuristic_plan(signals)
    executive_read, plays = result

    n_events = len(signals["events"])
    trigger = f"{n_events} change event(s) in the last 30 days" if n_events else "baseline intelligence sweep"

    plan = ActionPlan(
        campaign_id=campaign.id,
        executive_read=executive_read,
        ai_generated=ai_generated,
        trigger_summary=trigger,
        generated_at=datetime.utcnow(),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    for rank, play in enumerate(plays, start=1):
        db.add(ActionPlanItem(
            plan_id=plan.id, rank=rank,
            title=play["title"], body=play["body"], category=play["category"],
        ))
    db.commit()
    return plan
