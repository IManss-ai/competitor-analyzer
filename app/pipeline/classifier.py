from openai import AsyncOpenAI
from app.config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

VALID_CATEGORIES = {"pricing_change", "feature_add", "repositioning", "minor_copy", "no_change"}

CLASSIFY_SYSTEM = """You are a competitive intelligence analyst. Given two versions of a SaaS competitor's website text, classify what changed.

Return ONLY one of these exact strings:
- pricing_change — pricing, plans, tiers, trial terms changed
- feature_add — new product capability, integration, or feature announced
- repositioning — messaging, headline, value prop, or target market shifted
- minor_copy — small wording tweaks, grammar, punctuation, minor rewording
- no_change — no meaningful difference

Return only the category string. No explanation."""

async def classify_change(text_before: str, text_after: str) -> str:
    """
    Classify the nature of change between two page snapshots.
    Returns one of the 5 category strings. Falls back to 'minor_copy' on error.
    """
    # Truncate to 3000 chars each to stay within token budget
    before_trunc = text_before[:3000]
    after_trunc = text_after[:3000]

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": CLASSIFY_SYSTEM},
                {"role": "user", "content": f"BEFORE:\n{before_trunc}\n\nAFTER:\n{after_trunc}"},
            ],
            max_tokens=20,
            temperature=0,
        )
        result = response.choices[0].message.content.strip().lower()
        if result in VALID_CATEGORIES:
            return result
        return "minor_copy"  # safe fallback for unexpected output
    except Exception:
        return "minor_copy"
