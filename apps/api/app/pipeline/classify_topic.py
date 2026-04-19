"""Topic classification for fact claims.

This runs *alongside* verify_claim in the orchestrator. It is intentionally
isolated and fail-closed: any error returns None and the claim simply has no
topic (the bubble-chart view filters those out). The verdict flow never sees
the classifier's errors.
"""

from __future__ import annotations

import logging

from app.clients.gemini import GeminiError, chat_json
from app.config import get_settings

logger = logging.getLogger(__name__)

# Keep this taxonomy short, stable, and single-word where possible so the
# bubble chart stays legible. If you change labels, update the SYSTEM prompt.
TOPIC_TAXONOMY: tuple[str, ...] = (
    "politics",
    "elections",
    "health",
    "climate",
    "economy",
    "technology",
    "science",
    "world",
    "crime",
    "immigration",
    "military",
    "education",
    "entertainment",
    "sports",
    "other",
)

_ALLOWED: frozenset[str] = frozenset(TOPIC_TAXONOMY)

SYSTEM = (
    "You classify a single factual claim into exactly one topic label from this closed set: "
    + ", ".join(TOPIC_TAXONOMY)
    + ". Pick the best single match. If the claim doesn't fit any, use \"other\". "
    "Respond ONLY with JSON of the form: {\"topic\": \"...\"}."
)


def _user_prompt(claim_text: str) -> str:
    return f"Claim: {claim_text}\n\nReturn the JSON now."


async def classify_topic(claim_text: str) -> str | None:
    """Return one topic label from TOPIC_TAXONOMY, or None on any failure.

    Never raises. Safe to run in parallel with verify_claim — failures here
    never affect the verdict path.
    """
    text = (claim_text or "").strip()
    if not text:
        return None

    settings = get_settings()
    try:
        data = await chat_json(
            model=settings.gemini_classify_model,
            system=SYSTEM,
            user=_user_prompt(text),
            temperature=0.0,
        )
    except GeminiError as exc:
        logger.warning("classify_topic failed for %r: %s", text[:80], exc)
        return None
    except Exception as exc:  # noqa: BLE001 — classifier must never propagate
        logger.warning("classify_topic unexpected error: %s", exc)
        return None

    topic_raw = data.get("topic") if isinstance(data, dict) else None
    if not isinstance(topic_raw, str):
        return None
    topic = topic_raw.strip().lower()
    if topic not in _ALLOWED:
        return None
    return topic
