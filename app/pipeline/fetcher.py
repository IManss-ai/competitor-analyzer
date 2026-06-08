import httpx
import re
from app.config import SCRAPER_URL
from app.observability import note_degraded

def generate_mock_webpage(url: str, snapshot_count: int) -> str:
    brand_name = url.split("://")[-1].split("/")[0].replace("www.", "").split(".")[0].capitalize()
    if not brand_name or len(brand_name) < 2:
        brand_name = "AcmeSaaS"
        
    base_desc = f"{brand_name} is the leading enterprise platform for team collaboration and project tracking. Over 10,000 businesses use our software to optimize their workflows, automate repetitive tasks, and measure productivity. Our unified workspace features chat channels, shared boards, docs, and direct integrations with GitHub, Slack, and Figma."
    
    if snapshot_count == 0:
        return f"""Welcome to {brand_name} — The Unified Workspace for Modern Teams.
        
{base_desc}

Pricing and Plans:
- Starter Plan: $19 per user per month. Perfect for small teams of up to 10 members. Includes basic task management and 5GB storage.
- Growth Plan: $49 per user per month. Designed for scaling startups. Includes advanced analytics, unlimited integrations, and 50GB storage.
- Enterprise Plan: Custom pricing. Designed for large scale organizations requiring single sign-on (SSO), dedicated account managers, and custom compliance controls.

Features and Benefits:
Our platform provides drag-and-drop workflow builders, real-time activity feeds, customizable workspace dashboards, and deep performance insights. Get started in minutes with our 14-day free trial. No credit card required.
"""
    elif snapshot_count == 1:
        return f"""Welcome to {brand_name} — The Unified Workspace for Modern Teams.
        
{base_desc}

Pricing and Plans Update (Effective June 2026):
We are announcing changes to our subscription pricing structures to support major performance upgrades. The Starter Plan is now priced at $29 per user per month (previously $19). This plan still supports up to 10 members and includes basic task management with an upgraded 10GB storage limit. The Growth Plan is now priced at $59 per user per month (previously $49) and includes unlimited integrations, advanced team metrics, and priority support. Enterprise plans remain custom. In addition, all users now receive premium storage allocations, unified search indexing across Slack and Git histories, and custom email notification triggers for team projects to streamline workflows.

Features and Benefits:
Our platform provides drag-and-drop workflow builders, real-time activity feeds, customizable workspace dashboards, and deep performance insights. Get started in minutes with our 14-day free trial. No credit card required.
"""
    elif snapshot_count == 2:
        return f"""Welcome to {brand_name} — The Unified Workspace for Modern Teams.
        
{base_desc}

What is New:
Announcing {brand_name} AI Copilot! We are launching our fully integrated AI assistant that helps you write project specs, summarize chat threads, and automatically generate progress reports. Standard on all Growth and Enterprise accounts. We have spent the last six months engineering this language model integration to ensure that teams can automatically create documentation, execute workflow automations, and coordinate project management tasks directly from their workspace.

Pricing and Plans:
- Starter Plan: $29 per user per month. Perfect for small teams of up to 10 members. Includes basic task management and 5GB storage.
- Growth Plan: $59 per user per month. Designed for scaling startups. Includes advanced analytics, unlimited integrations, and 50GB storage. Includes {brand_name} AI Copilot.
- Enterprise Plan: Custom pricing. Designed for large scale organizations requiring single sign-on (SSO), dedicated account managers, and custom compliance controls.

Features and Benefits:
Our platform provides drag-and-drop workflow builders, real-time activity feeds, customizable workspace dashboards, and deep performance insights. Get started in minutes with our 14-day free trial. No credit card required.
"""
    else:
        return f"""Welcome to {brand_name} — The AI-Powered Operating System for Enterprise Productivity.
        
{brand_name} is the world's first AI-native work operating system designed for the automated enterprise. We help multinational organizations replace fragmented tools with a single intelligent workspace that drafts documentation, routes tasks, and optimizes operations. Over 10,000 global teams use {brand_name} to orchestrate enterprise engineering and product execution.

What is New:
Announcing {brand_name} AI Copilot! We are launching our fully integrated AI assistant that helps you write project specs, summarize chat threads, and automatically generate progress reports. Standard on all Growth and Enterprise accounts.

Pricing and Plans:
- Starter Plan: $29 per user per month. Perfect for small teams of up to 10 members. Includes basic task management and 5GB storage.
- Growth Plan: $59 per user per month. Designed for scaling startups. Includes advanced analytics, unlimited integrations, and 50GB storage. Includes {brand_name} AI Copilot.
- Enterprise Plan: Custom pricing. Designed for large scale organizations requiring single sign-on (SSO), dedicated account managers, and custom compliance controls.
"""

async def fetch_page_text(url: str, snapshot_count: int = 0) -> tuple[str, str | None]:
    """
    Fetch page text via the Playwright/llm-scraper sidecar, falling back to mock
    (local dev) or a direct HTTP + regex strip (sidecar down).
    Returns (text, error_message): (extracted_text, None) on success, ("", error) on failure.
    """
    is_dummy = (not SCRAPER_URL) or (SCRAPER_URL == "dummy")
    if is_dummy:
        note_degraded("fetcher", "mock", "scraper_url_unset")
        return generate_mock_webpage(url, snapshot_count), None

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(f"{SCRAPER_URL}/scrape", json={"url": url})
            resp.raise_for_status()
            text = (resp.json().get("text") or "").strip()
            return text, None
    except Exception as scraper_err:
        # Sidecar down/failed → direct fetch + regex strip last resort.
        note_degraded("fetcher", "direct_http", "sidecar_down", scraper_err)
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as d_client:
                d_resp = await d_client.get(url)
                d_resp.raise_for_status()
                html_content = d_resp.text
                text_content = re.sub(r'<script.*?</script>', ' ', html_content, flags=re.DOTALL)
                text_content = re.sub(r'<style.*?</style>', ' ', text_content, flags=re.DOTALL)
                text_content = re.sub(r'<[^>]+>', ' ', text_content)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                return text_content[:10000], None
        except Exception as e:
            return "", f"Scraper sidecar failed ({scraper_err}); direct fallback failed: {e}"

def extract_main_content(raw_text: str) -> str:
    """
    Strip navigation, headers, footers from Jina-extracted text.
    Heuristic: take the longest continuous block of text (>200 chars per paragraph).
    This suppresses nav link noise and A/B test header changes.
    """
    paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 200]
    return "\n\n".join(paragraphs) if paragraphs else raw_text
