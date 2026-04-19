from app.clients.gemini import chat_json
from app.config import get_settings

ALLOWED_TYPES = {"fact", "opinion"}
MIN_SPAN_LEN = 3

SYSTEM = (
    "You decompose a neutral statement into atomic, independently checkable claims. "
    "Each claim is one short sentence containing exactly one assertion. "
    'Classify each claim as "fact" (an empirically checkable statement about the world) '
    'or "opinion" (a value judgment, prediction, or preference). '
    "For each claim, also return source_span: a VERBATIM contiguous substring of the ORIGINAL post "
    "(not the neutral statement) that corresponds to that claim. "
    "source_span MUST appear exactly in the original post — no paraphrasing, no ellipses, no punctuation changes. "
    "If no single contiguous substring captures the claim, return source_span as null. "
    'Respond ONLY with JSON of the form: '
    '{"claims": [{"text": "...", "type": "fact", "source_span": "..."}]}'
)


def _user_prompt(neutral_text: str, original_text: str) -> str:
    return (
        f"Neutral statement:\n{neutral_text}\n\n"
        f"Original post:\n{original_text}\n\n"
        "Return the JSON now."
    )


async def extract_claims(
    neutral_text: str, original_text: str
) -> list[dict[str, str | None]]:
    settings = get_settings()
    data = await chat_json(
        model=settings.gemma_extract_model,
        system=SYSTEM,
        user=_user_prompt(neutral_text, original_text),
        temperature=0.1,
    )
    raw = data.get("claims") or []
    out: list[dict[str, str | None]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        text = (item.get("text") or "").strip()
        ctype = (item.get("type") or "").strip().lower()
        if not text or ctype not in ALLOWED_TYPES:
            continue
        raw_span = item.get("source_span")
        source_span: str | None = None
        if isinstance(raw_span, str):
            candidate = raw_span.strip()
            if len(candidate) >= MIN_SPAN_LEN and candidate in original_text:
                source_span = candidate
        out.append({"text": text, "type": ctype, "source_span": source_span})
    return out
