import os
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import anthropic

from app.db import get_session
from app.models import Competitor, ChangeEvent

import uuid as _uuid

router = APIRouter(prefix="/api/v1/battlecards", tags=["battlecards"])

@router.get("/generate/{competitor_id}")
def generate_battlecard(competitor_id: str, db: Session = Depends(get_session)):
    try:
        comp_uuid = _uuid.UUID(competitor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid competitor UUID format")

    comp = db.execute(select(Competitor).where(Competitor.id == comp_uuid)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    changes = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == comp_uuid)
        .where(ChangeEvent.detected_at >= seven_days_ago)
    ).scalars().all()

    change_list_texts = []
    for c in changes:
        t = c.change_type or "Update"
        b = c.brief_text or "General update detected"
        change_list_texts.append(f"- [{t}] {b}")
    
    change_list_str = "\n".join(change_list_texts) if change_list_texts else "No changes detected in the past 7 days."

    api_key = os.getenv("ANTHROPIC_API_KEY")
    is_dummy = (not api_key) or (api_key == "dummy_anthropic_key")

    if is_dummy:
        return _generate_battlecard_heuristically(comp.name or comp.url, change_list_texts)

    from app.models import ReviewSnapshot
    latest_snapshots = db.execute(
        select(ReviewSnapshot)
        .where(ReviewSnapshot.competitor_id == comp_uuid)
        .order_by(ReviewSnapshot.snapshot_at.desc())
        .limit(3)
    ).scalars().all()

    complaints_text = ""
    for snap in latest_snapshots:
        if snap.top_complaints:
            import json as _json
            complaints = _json.loads(snap.top_complaints)
            complaints_text += f"\n{snap.platform} top complaints: {', '.join(complaints)}"

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are a competitive intelligence strategist. Based on these competitor changes 
from the past 7 days, generate a 5-item action plan for the founder.

Competitor: {comp.name or comp.url}
Changes detected: 
{change_list_str}
{complaints_text}

Return ONLY valid JSON in the exact format below, with no other text or explanation. 
{{"actions": ["action1", "action2", "action3", "action4", "action5"]}}
Each action must be specific, actionable, and under 15 words."""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        content = response.content[0].text
        
        # Clean up possible markdown wrappers
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        
        parsed = json.loads(content)
        return parsed
    except Exception as e:
        return _generate_battlecard_heuristically(comp.name or comp.url, change_list_texts)

def _generate_battlecard_heuristically(name: str, change_texts: list[str]) -> dict:
    has_pricing = any("price" in c.lower() or "pricing" in c.lower() for c in change_texts)
    has_feature = any("feature" in c.lower() or "copilot" in c.lower() for c in change_texts)
    
    if has_pricing:
        actions = [
            f"Audit {name}'s updated pricing structure and compare tier-by-tier with our offer.",
            "Update our comparison landing page highlighting our sustainable growth plan pricing.",
            "Deploy a custom email retention sequence targeting price-sensitive users.",
            "Brief customer success reps on counter-arguments for competitor price adjustments.",
            "Monitor churn metrics closely over the next 30 days for anomalies."
        ]
    elif has_feature:
        actions = [
            f"Coordinate with engineering to review {name}'s AI Copilot implementation specs.",
            "Accelerate our automated workflow integration milestones on the roadmap.",
            "Publish a product update highlighting our direct, task-execution pipeline advantage.",
            "Train the sales team to emphasize our robust execution over simple text summaries.",
            "Gather feedback from core users regarding interest in AI-assisted report generation."
        ]
    else:
        actions = [
            f"Assess the strategic impact of {name}'s latest homepage copy adjustments.",
            "Run messaging A/B tests on our own hero section to optimize conversion.",
            "Conduct structured user research calls to verify our messaging differentiation.",
            "Optimize secondary CTA layouts to streamline signup entry paths.",
            "Plan our next major messaging and brand voice positioning update."
        ]
        
    return {"actions": actions}
