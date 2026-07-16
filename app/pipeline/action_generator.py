import app.llm as llm

client = llm.get_async_client()

ACTION_TYPES_BY_CHANGE = {
    "pricing_change": ["retention_email", "pricing_copy"],
    "feature_add": ["feature_response", "social_draft"],
    "repositioning": ["pricing_copy", "social_draft"],
    "minor_copy": [],
    "no_change": [],
}

PROMPTS = {
    "retention_email": {
        "system": """You are a SaaS copywriter helping a founder retain customers when a competitor changes their pricing.
Write a short retention email (150-200 words) that:
1. Subtly reinforces the founder's product value without mentioning the competitor by name
2. Reminds customers why they chose this product
3. Has a clear, warm tone, not panicked or defensive
Write ONLY the email body (no subject line). Start with the greeting.""",
        "user_template": "Our competitor ({competitor}) just made this change:\n{brief}\n\nOur product positioning: we serve {user_description}.\n\nWrite the retention email.",
    },
    "pricing_copy": {
        "system": """You are a SaaS copywriter helping a founder update their pricing page or homepage copy in response to a competitor move.
Write 2-3 short copy suggestions (1-2 sentences each) that:
1. Reinforce differentiation without attacking competitors
2. Address the specific angle the competitor is pushing
3. Are ready to drop into a pricing page or hero section
Format as a numbered list.""",
        "user_template": "Competitor ({competitor}) change:\n{brief}\n\nWrite 2-3 copy suggestions for our pricing or homepage.",
    },
    "feature_response": {
        "system": """You are a SaaS product marketer helping a founder respond to a competitor's new feature.
Write a short response asset (100-150 words) that could be:
- An email to current customers highlighting your roadmap or existing advantage
- Or a social post acknowledging the space is heating up and doubling down on your approach
Be confident, not defensive. Don't name the competitor.""",
        "user_template": "Competitor ({competitor}) just announced:\n{brief}\n\nWrite a feature response asset.",
    },
    "social_draft": {
        "system": """You are a SaaS founder's ghostwriter. Write a short social post (Twitter/X or LinkedIn, 150-220 chars) for a founder responding to a competitor's move in their market.
The post should:
1. Show market awareness without naming competitors
2. Reinforce the founder's unique angle
3. Sound like a confident, opinionated founder, not a press release
Write ONLY the post text. No hashtags unless they add value.""",
        "user_template": "Competitor ({competitor}) made this move:\n{brief}\n\nWrite a social post for the founder.",
    },
}

async def generate_action(
    action_type: str,
    competitor_name: str,
    competitor_url: str,
    brief_text: str,
    user_description: str = "SaaS founders and small teams",
) -> str | None:
    """
    Generate one action draft using DeepSeek (llm.MODEL) or a local heuristic fallback.
    Returns draft text or None on error.
    """
    prompt_config = PROMPTS.get(action_type)
    if not prompt_config:
        return None

    competitor_label = competitor_name or competitor_url
    user_msg = prompt_config["user_template"].format(
        competitor=competitor_label,
        brief=brief_text,
        user_description=user_description,
    )

    try:
        response = await client.chat.completions.create(
            model=llm.MODEL,
            messages=[
                {"role": "system", "content": prompt_config["system"]},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=400,
            temperature=0.7,
            extra_body=llm.THINKING_OFF,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return _generate_action_heuristically(action_type, competitor_name or competitor_url, brief_text, user_description)

def _generate_action_heuristically(action_type: str, competitor: str, brief: str, user_description: str) -> str | None:
    if action_type == "retention_email":
        return f"""Hi [Name],

I wanted to personally reach out and thank you for partnering with us. We've noticed some shifts in the market recently, with other platforms restructuring their plans and raising prices.

We want to reassure you that our focus remains on providing exceptional value and reliable tools for {user_description} at a sustainable, fair price. We are committed to keeping our pricing predictable as you scale.

We have some exciting performance and workflow updates coming next month that we can't wait to share. If you have any feedback or feature requests, feel free to hit reply and let me know.

Warm regards,
[Your Name]"""

    elif action_type == "pricing_copy":
        return f"""1. "Get all the power of premium team workflows without the pricing markup. Simple, predictable pricing for {user_description}."
2. "No surprise price hikes or arbitrary limits. Lock in our growth rate today and build with confidence."
3. "Why pay more per user elsewhere when you can get full integrations, custom dashboards, and high-performance workflows for a fraction of the cost?"""

    elif action_type == "feature_response":
        return f"""Hi everyone, the productivity workspace is heating up, and we've seen competitors launching integrated AI assistants. While text assistants are nice, we believe {user_description} need deeper automated integrations that actually perform tasks.

That is why we are focusing our upcoming product updates on hardware-accelerated automation and direct Git/Figma pipelines to eliminate administrative friction entirely. Let us build tools that do the work for you. Stay tuned!"""

    elif action_type == "social_draft":
        return f"Competitors are launching AI assistants to summarize text. But teams do not need more AI noise; they need automated integrations that execute tasks. We are keeping our focus on deep, hardware-accelerated workflows. Back to building."

    return None

async def generate_actions_for_change(
    change_type: str,
    competitor_name: str,
    competitor_url: str,
    brief_text: str,
) -> list[tuple[str, str]]:
    """
    Generate all relevant action drafts for a change event.
    Returns list of (action_type, draft_text) tuples.
    Skips action types where generation fails.
    """
    action_types = ACTION_TYPES_BY_CHANGE.get(change_type, [])
    results = []
    for action_type in action_types:
        draft = await generate_action(
            action_type=action_type,
            competitor_name=competitor_name,
            competitor_url=competitor_url,
            brief_text=brief_text,
        )
        if draft:
            results.append((action_type, draft))
    return results
