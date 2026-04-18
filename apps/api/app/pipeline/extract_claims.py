from app.clients.gemini import chat_json
from app.config import get_settings

ALLOWED_TYPES = {"fact", "opinion"}

SYSTEM = (
    "You decompose a neutral statement into atomic, independently checkable claims. "
    "Each claim is one short sentence containing exactly one assertion. "
    'Classify each claim as "fact" (an empirically checkable statement about the world) '
    'or "opinion" (a value judgment, prediction, or preference). '
    'Respond ONLY with JSON of the form: {"claims": [{"text": "...", "type": "fact"}]}'
)


def _user_prompt(neutral_text: str) -> str:
    return f"Statement:\n{neutral_text}\n\nReturn the JSON now."


async def extract_claims(neutral_text: str) -> list[dict[str, str]]:
    settings = get_settings()
    data = await chat_json(
        model=settings.gemma_extract_model,
        system=SYSTEM,
        user=_user_prompt(neutral_text),
        temperature=0.1,
    )
    raw = data.get("claims") or []
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        text = (item.get("text") or "").strip()
        ctype = (item.get("type") or "").strip().lower()
        if not text or ctype not in ALLOWED_TYPES:
            continue
        out.append({"text": text, "type": ctype})
    return out
