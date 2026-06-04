import httpx
from app.config import RESEND_API_KEY, FROM_EMAIL, APP_BASE_URL

RESEND_API = "https://api.resend.com/emails"

async def send_weekly_brief(
    user_email: str,
    user_id: str,
    change_summaries: list[dict],
    pending_action_count: int,
) -> bool:
    if not change_summaries:
        subject = "Your Battle Card is ready — 0 competitor moves this week"
    else:
        subject = f"Your Battle Card is ready — {len(change_summaries)} competitor move{'s' if len(change_summaries) != 1 else ''} this week"

    lines = ["Your Battle Card — Week of Monday\n"]
    for s in change_summaries:
        name = s.get("competitor_name") or s.get("url", "Unknown")
        change_type = s.get("change_type", "").replace("_", " ").title()
        brief = s.get("brief_text") or "Updated site — no significant text change detected."
        lines.append(f"## {name}")
        lines.append(f"Change: {change_type}")
        lines.append(brief)
        lines.append("")

    if pending_action_count > 0:
        lines.append("---")
        lines.append(f"You have {pending_action_count} action draft{'s' if pending_action_count != 1 else ''} waiting for approval.")
        lines.append(f"Review them: {APP_BASE_URL}/queue")
    else:
        lines.append("No new action drafts this week.")

    lines.append(f"\n---\nManage your competitors: {APP_BASE_URL}/competitors")
    text_body = "\n".join(lines)

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
            app_base_url=APP_BASE_URL,
        )
    except Exception as e:
        print(f"Failed to render HTML email brief: {e}")

    if not RESEND_API_KEY or "dummy" in RESEND_API_KEY.lower():
        print(f"\n--- [LOCAL DEV EMAIL] Battle Card → {user_email}\nSubject: {subject}\n{text_body}\n---\n")
        return True

    try:
        payload = {
            "from": f"Competitor Analyzer <{FROM_EMAIL}>",
            "to": [user_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            payload["html"] = html_body

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                RESEND_API,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
            return resp.status_code in (200, 201)
    except Exception:
        return False
