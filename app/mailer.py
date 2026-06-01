import httpx
from app.config import MAILGUN_API_KEY, MAILGUN_DOMAIN, APP_BASE_URL

async def send_weekly_brief(
    user_email: str,
    user_id: str,
    change_summaries: list[dict],  # [{competitor_name, url, change_type, brief_text}]
    pending_action_count: int,
) -> bool:
    """
    Send the Monday 8am weekly brief email.
    change_summaries: list of competitor changes for this week.
    Returns True on success, False on failure (non-blocking).
    """
    if not change_summaries:
        subject = "This week: no meaningful competitor changes detected"
    else:
        subject = f"This week: {len(change_summaries)} competitor update{'s' if len(change_summaries) != 1 else ''}"

    # Build plain text body
    lines = ["Your Competitor Brief — Week of Monday\n"]
    for s in change_summaries:
        name = s.get("competitor_name") or s.get("url", "Unknown")
        change_type = s.get("change_type", "").replace("_", " ").title()
        brief = s.get("brief_text") or "Updated site — no significant text change detected."
        lines.append(f"## {name}")
        lines.append(f"Change: {change_type}")
        lines.append(brief)
        lines.append("")

    if pending_action_count > 0:
        lines.append(f"---")
        lines.append(f"You have {pending_action_count} action draft{'s' if pending_action_count != 1 else ''} waiting for approval.")
        lines.append(f"Review them: {APP_BASE_URL}/queue")
    else:
        lines.append(f"No new action drafts this week.")

    lines.append(f"\n---\nManage your competitors: {APP_BASE_URL}/competitors")

    text_body = "\n".join(lines)

    # Compile HTML body using Jinja2
    import os
    from jinja2 import Environment, FileSystemLoader
    
    html_body = ""
    try:
        templates_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates")
        env = Environment(loader=FileSystemLoader(templates_dir))
        template = env.get_template("email_brief.html")
        html_body = template.render(
            change_summaries=change_summaries,
            pending_action_count=pending_action_count,
            app_base_url=APP_BASE_URL
        )
    except Exception as e:
        # Fallback to empty html if compilation fails, log it
        print(f"Failed to render HTML email brief: {e}")

    # Print to stdout/console for dev environments/tests if mailgun details are dummy/empty
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN or "dummy" in MAILGUN_API_KEY.lower():
        print(f"\n--- [LOCAL DEV EMAIL] Weekly Brief sent to {user_email} ---\nSubject: {subject}\n{text_body}")
        if html_body:
            print(f"--- [LOCAL DEV HTML EMAIL (SIMULATED)] ---\n{html_body[:300]}...\n[HTML email content length: {len(html_body)} bytes]")
        print("---------------------------------------\n")
        return True

    try:
        async with httpx.AsyncClient() as client:
            post_data = {
                "from": f"Competitor Analyzer <weekly@{MAILGUN_DOMAIN}>",
                "to": user_email,
                "subject": subject,
                "text": text_body,
            }
            if html_body:
                post_data["html"] = html_body
                
            resp = await client.post(
                f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
                auth=("api", MAILGUN_API_KEY),
                data=post_data,
            )
            return resp.status_code == 200
    except Exception:
        return False
