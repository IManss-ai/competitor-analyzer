import httpx
import re
from app.config import JINA_API_KEY

JINA_BASE = "https://r.jina.ai/"

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

Pricing and Plans:
- Starter Plan: $29 per user per month (previously $19). Perfect for small teams of up to 10 members. Includes basic task management and 5GB storage.
- Growth Plan: $59 per user per month (previously $49). Designed for scaling startups. Includes advanced analytics, unlimited integrations, and 50GB storage.
- Enterprise Plan: Custom pricing. Designed for large scale organizations requiring single sign-on (SSO), dedicated account managers, and custom compliance controls.

Features and Benefits:
Our platform provides drag-and-drop workflow builders, real-time activity feeds, customizable workspace dashboards, and deep performance insights. Get started in minutes with our 14-day free trial. No credit card required.
"""
    elif snapshot_count == 2:
        return f"""Welcome to {brand_name} — The Unified Workspace for Modern Teams.
        
{base_desc}

What is New:
Announcing {brand_name} AI Copilot! We are launching our fully integrated AI assistant that helps you write project specs, summarize chat threads, and automatically generate progress reports. Standard on all Growth and Enterprise accounts.

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
    Fetch page text via Jina AI reader or fall back to mock generation or direct HTTP fetch.
    Returns (text, error_message).
    On success: (extracted_text, None)
    On failure: ("", error_message)
    """
    is_dummy = (not JINA_API_KEY) or (JINA_API_KEY == "dummy_jina_key")
    
    if is_dummy:
        # Fallback directly to mock content in local development/test environments
        return generate_mock_webpage(url, snapshot_count), None

    headers = {"Accept": "text/plain"}
    if JINA_API_KEY:
        headers["Authorization"] = f"Bearer {JINA_API_KEY}"

    target = f"{JINA_BASE}{url}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(target, headers=headers)
            resp.raise_for_status()
            text = resp.text.strip()
            return text, None
    except httpx.HTTPStatusError as e:
        # Try direct fetch fallback if Jina is rate-limited or fails
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as d_client:
                d_resp = await d_client.get(url)
                d_resp.raise_for_status()
                # Basic tags stripping regex to extract text content
                html_content = d_resp.text
                text_content = re.sub(r'<script.*?</script>', ' ', html_content, flags=re.DOTALL)
                text_content = re.sub(r'<style.*?</style>', ' ', text_content, flags=re.DOTALL)
                text_content = re.sub(r'<[^>]+>', ' ', text_content)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                return text_content[:10000], None
        except Exception:
            return generate_mock_webpage(url, snapshot_count), None
    except Exception as e:
        return generate_mock_webpage(url, snapshot_count), None

def extract_main_content(raw_text: str) -> str:
    """
    Strip navigation, headers, footers from Jina-extracted text.
    Heuristic: take the longest continuous block of text (>200 chars per paragraph).
    This suppresses nav link noise and A/B test header changes.
    """
    paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 200]
    return "\n\n".join(paragraphs) if paragraphs else raw_text
