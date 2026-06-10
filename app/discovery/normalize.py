import re
from urllib.parse import urlparse


def normalize_url(url: str) -> str:
    """Canonical form for dedup: lowercase host, no scheme/www/query/fragment,
    no trailing slash. 'https://www.Acme.io/' -> 'acme.io'."""
    url = (url or "").strip()
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "https://" + url
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parsed.path.rstrip("/")
    return f"{host}{path}"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug or "app"
