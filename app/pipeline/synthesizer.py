import app.llm as llm
from app.observability import note_degraded

client = llm.get_async_client()

SYNTHESIZE_SYSTEM = """You are a competitive intelligence analyst writing weekly briefs for SaaS founders.
Given a competitor's website change (before and after), write a 2-3 sentence brief that:
1. States what changed specifically (pricing? features? messaging?)
2. Explains what it likely signals about their strategy
3. Notes what a founder should watch or respond to

Be concrete and actionable. No fluff. Write in plain English.
Style: never use em dashes. Never mention "the input", "the data provided", or missing information; if the change is trivial, say so plainly."""

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
            model=llm.MODEL,
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
            extra_body=llm.THINKING_OFF,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        note_degraded("synthesizer", "heuristic", "api_error", e)
        return _synthesize_heuristically(competitor_name or competitor_url, change_type)

SUMMARIZE_PROFILE_SYSTEM = """You are a competitive intelligence analyst. A SaaS founder just started tracking a competitor.
Given the competitor's CURRENT homepage content, write a 2-3 sentence intelligence brief that captures:
1. What this competitor does: their core product and who it's for
2. How they position themselves (pricing, target market, or main value prop) if visible in the content
3. One concrete angle the founder could use to compete, or one thing worth watching

Be specific to THIS competitor using details from their page. No generic filler, no fluff. Plain English.
Style: never use em dashes. Never mention "the input", "the content provided", or missing information."""


async def summarize_competitor_profile(
    competitor_name: str,
    competitor_url: str,
    content: str,
) -> str:
    """
    Generate a 2-3 sentence "here's what this competitor is doing right now" brief
    from a competitor's current homepage content. Used on the FIRST scan, where there
    is no prior snapshot to diff against, so the Intel Feed has real intel immediately.
    Falls back to a local heuristic brief on error or dummy key.
    """
    content_trunc = (content or "")[:3500]

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            messages=[
                {"role": "system", "content": SUMMARIZE_PROFILE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {competitor_name or competitor_url}\n"
                        f"URL: {competitor_url}\n\n"
                        f"CURRENT HOMEPAGE CONTENT:\n{content_trunc}"
                    ),
                },
            ],
            max_tokens=220,
            temperature=0.3,
            extra_body=llm.THINKING_OFF,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        note_degraded("synthesizer", "heuristic", "api_error", e)
        return _summarize_profile_heuristically(competitor_name or competitor_url, content)


def _summarize_profile_heuristically(name: str, content: str) -> str:
    body = " ".join((content or "").split())
    if body:
        snippet = body[:240].rstrip()
        return (
            f"Now tracking {name}. We captured a baseline of their site — here's what's on their page right now: "
            f"“{snippet}…” Pricing, feature, and messaging changes will surface here automatically as they happen."
        )
    return (
        f"Now tracking {name}. We captured a baseline of their site and will surface pricing, feature, "
        f"and messaging changes here as they happen."
    )


def _synthesize_heuristically(name: str, change_type: str) -> str:
    """Number-free, change-type-grounded brief for the AI-unavailable path.

    This runs only when the model call fails, so it knows just the competitor
    name and the classified change_type — NOT the actual before/after copy. It
    must therefore state the honest, generic implication of the change class and
    point the founder at the source, never invent specifics (prices, feature
    names, taglines). Fabricating those shipped false facts in the weekly email
    for every competitor — same bug class as the battle-card fix (issue #3).
    See tests/test_synthesizer_honesty.py.
    """
    if change_type == "pricing_change":
        return (
            f"{name} changed their pricing this week. Open their pricing page to see exactly what "
            f"moved and decide whether it opens room for you to win on price, packaging, or terms."
        )
    elif change_type == "feature_add":
        return (
            f"{name} shipped a feature or product update. Check what they added and whether it "
            f"overlaps your roadmap or targets a segment you also serve, then weigh a response."
        )
    elif change_type == "repositioning":
        return (
            f"{name} shifted how they position themselves on their homepage. Compare their new "
            f"messaging against yours to spot where their story now lands stronger — or weaker."
        )
    else:
        return (
            f"{name} made minor copy or layout updates to their homepage. No clear strategic shift "
            f"is evident, but it is worth a quick look to confirm nothing material changed."
        )
