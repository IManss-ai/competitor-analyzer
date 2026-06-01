from openai import AsyncOpenAI
from app.config import OPENAI_API_KEY

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
    Returns the brief text. Falls back to a generic summary on error.
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
    except Exception:
        return f"{competitor_name or competitor_url} updated their site this week. Review manually for details."
