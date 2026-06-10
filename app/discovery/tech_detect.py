import re

# (technology, category, regex on raw HTML). Order = display order.
_SIGNATURES: list[tuple[str, str, str]] = [
    ("nextjs", "framework", r"/_next/static|__NEXT_DATA__"),
    ("react", "framework", r"react(-dom)?(\.production)?(\.min)?\.js|data-reactroot"),
    ("vue", "framework", r"vue(\.runtime)?(\.global)?(\.prod)?\.js|data-v-app"),
    ("angular", "framework", r"ng-version="),
    ("svelte", "framework", r"svelte-[a-z0-9]{6}"),
    ("webflow", "framework", r"assets\.website-files\.com"),
    ("wordpress", "framework", r"wp-content/|wp-includes/"),
    ("framer", "framework", r"framerusercontent\.com"),
    ("stripe", "payments", r"js\.stripe\.com|checkout\.stripe\.com"),
    ("paddle", "payments", r"cdn\.paddle\.com|paddle_button"),
    ("lemonsqueezy", "payments", r"lemonsqueezy\.com"),
    ("polar", "payments", r"polar\.sh"),
    ("google-analytics", "analytics", r"googletagmanager\.com/gtag|google-analytics\.com"),
    ("plausible", "analytics", r"plausible\.io/js"),
    ("posthog", "analytics", r"posthog\.com|posthog\.init"),
    ("mixpanel", "analytics", r"cdn\.mxpnl\.com|mixpanel\.init"),
    ("segment", "analytics", r"cdn\.segment\.com"),
    ("hotjar", "analytics", r"static\.hotjar\.com"),
    ("intercom", "support", r"intercomSettings|widget\.intercom\.io"),
    ("crisp", "support", r"client\.crisp\.chat"),
    ("zendesk", "support", r"static\.zdassets\.com"),
    ("hubspot", "marketing", r"js\.hs-scripts\.com|hubspot\.com"),
    ("mailchimp", "marketing", r"chimpstatic\.com|list-manage\.com"),
]


def detect_technologies(html: str) -> list[dict]:
    """Regex-signature tech detection from raw page HTML. Zero AI cost."""
    if not html:
        return []
    found = []
    seen = set()
    for tech, category, pattern in _SIGNATURES:
        if tech not in seen and re.search(pattern, html, re.IGNORECASE):
            seen.add(tech)
            found.append({"technology": tech, "tech_category": category})
    return found
