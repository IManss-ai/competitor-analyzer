import httpx
from app.config import JINA_API_KEY

JINA_BASE = "https://r.jina.ai/"

async def fetch_page_text(url: str) -> tuple[str, str | None]:
    """
    Fetch page text via Jina AI reader.
    Returns (text, error_message).
    On success: (extracted_text, None)
    On failure: ("", error_message)
    """
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
        return "", f"HTTP {e.response.status_code}: {e.response.reason_phrase}"
    except httpx.TimeoutException:
        return "", "Request timed out after 30s"
    except Exception as e:
        return "", f"Fetch error: {str(e)}"

def extract_main_content(raw_text: str) -> str:
    """
    Strip navigation, headers, footers from Jina-extracted text.
    Heuristic: take the longest continuous block of text (>200 chars per paragraph).
    This suppresses nav link noise and A/B test header changes.
    """
    paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 200]
    return "\n\n".join(paragraphs) if paragraphs else raw_text
