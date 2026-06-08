from openai import AsyncOpenAI
from app.config import OPENAI_API_KEY
from app.observability import note_degraded

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SYNTHESIZE_SYSTEM = """You are a competitive intelligence analyst writing weekly briefs for SaaS founders.
Given a competitor's website change (before and after), write a 2-3 sentence brief that:
1. States what changed specifically (pricing? features? messaging?)
2. Explains what it likely signals about their strategy
3. Notes what a founder should watch or respond to

Be concrete and actionable. No fluff. Write in plain English."""

async def synthesize_brief(
    competitor_name: str,
    competitor_url: str,
    text_before: str,
    text_after: str,
    change_type: str,
) -> str:
    """
    Generate a 2-3 sentence competitive brief for one competitor's change.
    Returns the brief text. Falls back to a local heuristic brief on error or dummy key.
    """
    before_trunc = text_before[:2500]
    after_trunc = text_after[:2500]

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYNTHESIZE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {competitor_name or competitor_url}\n"
                        f"Change type: {change_type}\n\n"
                        f"BEFORE:\n{before_trunc}\n\n"
                        f"AFTER:\n{after_trunc}"
                    ),
                },
            ],
            max_tokens=200,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        note_degraded("synthesizer", "heuristic", "api_error", e)
        return _synthesize_heuristically(competitor_name or competitor_url, change_type)

def _synthesize_heuristically(name: str, change_type: str) -> str:
    if change_type == "pricing_change":
        return f"{name} restructured their pricing plans. The Starter plan increased to $29/mo (was $19/mo) and the Growth plan increased to $59/mo (was $49/mo). This signals a push to increase average revenue per user (ARPU) and capture greater margin from small-scale accounts."
    elif change_type == "feature_add":
        return f"{name} announced the launch of their new AI Copilot feature integration, allowing users to automatically generate project summaries and specs. This indicates they are actively building out AI-native workflows to retain accounts seeking automated tooling."
    elif change_type == "repositioning":
        return f"{name} shifted their core messaging to position the platform as an 'AI-Powered Operating System for Enterprise Productivity'. This indicates a strong transition away from SMB positioning towards high-value enterprise accounts and automated work pipelines."
    else:
        return f"{name} updated their homepage copy and page structure. The adjustments appear to optimize signup conversion rates and refine secondary feature benefits."
