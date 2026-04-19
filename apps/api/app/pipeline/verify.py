import json
import logging
from datetime import datetime, timezone

from app.clients.gemini import GeminiError, chat_grounded
from app.config import get_settings
from app.models import ClaimResult, Source

logger = logging.getLogger(__name__)

ALLOWED_VERDICTS = {"true", "false", "misleading", "unverifiable"}
MAX_SOURCES = 5


def _reference_date(posted_at: str | None) -> str:
    if posted_at:
        try:
            dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


SYSTEM = (
    "You are a fact-checker. Use the Google Search tool to verify the user's claim. "
    "Treat the reference date as \"today\" when evaluating any temporal expression in "
    'the claim (e.g. "today", "yesterday", "this week", "last month"). Do not use '
    "the actual current date. Reach a single verdict from this set: true, false, "
    "misleading, unverifiable. "
    'Reply ONLY with JSON: {"verdict": "...", "explanation": "<=2 sentences"}.'
)


def _user_prompt(claim_text: str, reference_date: str) -> str:
    return (
        f"Reference date (treat as today): {reference_date}\n"
        f"Claim: {claim_text}\n\n"
        "Return the JSON now."
    )


def _parse_verdict_json(text: str) -> tuple[str, str]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Last resort: find a JSON object in the text
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return "unverifiable", text.strip()[:400]
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return "unverifiable", text.strip()[:400]

    verdict = (data.get("verdict") or "").strip().lower()
    if verdict not in ALLOWED_VERDICTS:
        verdict = "unverifiable"
    explanation = (data.get("explanation") or "").strip()
    return verdict, explanation


def _normalize_sources(citations: list[dict[str, str]]) -> list[Source]:
    out: list[Source] = []
    for c in citations:
        url = (c.get("url") or "").strip()
        if not url:
            continue
        out.append(
            Source(
                url=url,
                title=(c.get("title") or "").strip() or None,
                excerpt=(c.get("excerpt") or "").strip() or None,
            )
        )
        if len(out) >= MAX_SOURCES:
            break
    return out


async def verify_claim(claim_text: str, posted_at: str | None = None) -> ClaimResult:
    settings = get_settings()
    reference_date = _reference_date(posted_at)
    try:
        result = await chat_grounded(
            model=settings.gemini_verify_model,
            system=SYSTEM,
            user=_user_prompt(claim_text, reference_date),
            temperature=0.1,
        )
    except GeminiError as exc:
        logger.warning("verify failed for %r: %s", claim_text[:80], exc)
        return ClaimResult(
            text=claim_text,
            claim_type="fact",
            verdict="unverifiable",
            explanation=f"Verification error: {exc}",
            sources=[],
        )

    verdict, explanation = _parse_verdict_json(result.get("text", ""))
    sources = _normalize_sources(result.get("citations", []))
    return ClaimResult(
        text=claim_text,
        claim_type="fact",
        verdict=verdict,  # type: ignore[arg-type]
        explanation=explanation,
        sources=sources,
    )
