from app.clients.gemini import chat
from app.config import get_settings

SYSTEM = (
    "You rewrite social-media posts in a neutral, factual tone. "
    "Strip emoji, hashtags, ALL-CAPS shouting, sarcasm, hyperbole, and rhetorical "
    "flourishes. Preserve every concrete claim, number, name, date, and quote. "
    "Output a single short paragraph. No preamble, no quoting, no commentary."
)


def _user_prompt(text: str) -> str:
    return f"Rewrite this post neutrally:\n\n{text}"


async def neutralize(text: str) -> str:
    settings = get_settings()
    out = await chat(
        model=settings.gemma_rewrite_model,
        system=SYSTEM,
        user=_user_prompt(text),
        temperature=0.2,
    )
    return out.strip() or text.strip()
