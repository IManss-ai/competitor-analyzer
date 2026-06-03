import os
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import anthropic

from app.db import get_session
from app.models import Competitor, ChangeEvent

router = APIRouter(prefix="/api/v1/battlecards", tags=["battlecards"])

@router.get("/generate/{competitor_id}")
def generate_battlecard(competitor_id: str, db: Session = Depends(get_session)):
    comp = db.execute(select(Competitor).where(Competitor.id == competitor_id)).scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    changes = db.execute(
        select(ChangeEvent)
        .where(ChangeEvent.competitor_id == competitor_id)
        .where(ChangeEvent.detected_at >= seven_days_ago)
    ).scalars().all()

    change_list_texts = []
    for c in changes:
        t = c.change_type or "Update"
        b = c.brief_text or "General update detected"
        change_list_texts.append(f"- [{t}] {b}")
    
    change_list_str = "\n".join(change_list_texts) if change_list_texts else "No changes detected in the past 7 days."

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured on server")

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are a competitive intelligence strategist. Based on these competitor changes 
from the past 7 days, generate a 5-item action plan for the founder.

Competitor: {comp.name or comp.url}
Changes detected: 
{change_list_str}

Return ONLY valid JSON in the exact format below, with no other text or explanation. 
{{"actions": ["action1", "action2", "action3", "action4", "action5"]}}
Each action must be specific, actionable, and under 15 words."""

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
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
        raise HTTPException(status_code=500, detail=str(e))
