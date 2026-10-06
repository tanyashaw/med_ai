from groq import Groq

from app.config import settings

_client: Groq | None = None


def get_groq() -> Groq:
    global _client
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client
