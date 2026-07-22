"""Single source of truth for the AI provider (DeepSeek V4, OpenAI-compatible).

Every AI call site builds its module-level `client` from here and uses `MODEL`.
Switching provider/model is a one-place change.
"""
from openai import OpenAI, AsyncOpenAI
from app.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL

MODEL = "deepseek-v4-flash"
MODEL_FLAGSHIP = "deepseek-v4-pro"  # defined for a future battlecard-only upgrade; unused today

# deepseek-v4-flash defaults to THINKING mode — reasoning tokens eat the budget
# before content is emitted. Force direct content output on every call.
THINKING_OFF = {"thinking": {"type": "disabled"}}

# openai 2.x defaults to a 600s read timeout and 2 retries. A hung DeepSeek
# endpoint would then block a scan coroutine for ~10 min/call. Cap it: a
# classify/synth call that hasn't responded in 30s is not going to. One retry
# is enough headroom for a transient blip without multiplying the stall.
REQUEST_TIMEOUT = 30.0
MAX_RETRIES = 1

_DUMMY_KEYS = {"", "dummy", "dummy_key", "dummy_anthropic_key", "dummy_openai_key"}


def ai_available() -> bool:
    """True when a real (non-placeholder) DeepSeek key is configured."""
    return DEEPSEEK_API_KEY not in _DUMMY_KEYS


def get_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=DEEPSEEK_API_KEY or "dummy",
        base_url=DEEPSEEK_BASE_URL,
        timeout=REQUEST_TIMEOUT,
        max_retries=MAX_RETRIES,
    )


def get_sync_client() -> OpenAI:
    return OpenAI(
        api_key=DEEPSEEK_API_KEY or "dummy",
        base_url=DEEPSEEK_BASE_URL,
        timeout=REQUEST_TIMEOUT,
        max_retries=MAX_RETRIES,
    )
