import asyncio
import re

from app.config import get_settings
from app.models import CheckResponse, ClaimResult, Verdict
from app.pipeline.extract_claims import extract_claims
from app.pipeline.neutralize import neutralize
from app.pipeline.verify import verify_claim

SHORT_TWEET_MAX_LEN = 100

# Signals that a tweet carries tone the neutralize stage should strip.
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F9FF]"
)
_ALLCAPS_WORD_RE = re.compile(r"\b[A-Z]{3,}\b")
_MULTI_PUNCT_RE = re.compile(r"[!?]{2,}")
_SARCASM_TOKENS = {"lol", "lmao", "lmfao", "smh", "rofl", "yikes"}
_TOKEN_RE = re.compile(r"[a-z]+")
_URL_RE = re.compile(r"https?://\S+")
_MENTION_HASH_RE = re.compile(r"[@#]\w+")


def _is_question_only(text: str) -> bool:
    stripped = _MENTION_HASH_RE.sub(" ", _URL_RE.sub(" ", text)).strip()
    if not stripped:
        return False
    terminals = re.findall(r"[.!?]+", stripped)
    if not terminals:
        return False  # no sentence terminator — let the pipeline decide
    return all(t.endswith("?") for t in terminals)


def _needs_neutralize(text: str) -> bool:
    if len(text) >= SHORT_TWEET_MAX_LEN:
        return True
    if _EMOJI_RE.search(text):
        return True
    if _ALLCAPS_WORD_RE.search(text):
        return True
    if _MULTI_PUNCT_RE.search(text):
        return True
    tokens = set(_TOKEN_RE.findall(text.lower()))
    if tokens & _SARCASM_TOKENS:
        return True
    return False


def _overall_verdict(claims: list[ClaimResult]) -> Verdict:
    if not claims:
        return "unverifiable"
    facts = [c for c in claims if c.claim_type == "fact"]
    if not facts:
        return "opinion"
    verdicts = [c.verdict for c in facts]
    if "false" in verdicts:
        return "false"
    if "misleading" in verdicts:
        return "misleading"
    if "unverifiable" in verdicts:
        return "unverifiable"
    return "true"


async def run_pipeline(tweet_id: str, text: str, posted_at: str | None = None) -> CheckResponse:
    if _is_question_only(text):
        claim = ClaimResult(
            text=text.strip(),
            claim_type="fact",
            verdict="unverifiable",
            explanation="This tweet is a question; no verifiable claim was found.",
            sources=[],
        )
        return CheckResponse(
            tweet_id=tweet_id,
            neutral_text=text,
            overall_verdict="unverifiable",
            claims=[claim],
            cached=False,
        )

    neutral = text if not _needs_neutralize(text) else await neutralize(text)
    raw = await extract_claims(neutral, text)

    settings = get_settings()
    sem = asyncio.Semaphore(max(1, settings.verify_concurrency))

    async def one(item: dict[str, str | None]) -> ClaimResult:
        ctype = ((item.get("type") or "")).strip().lower() if isinstance(item.get("type"), str) else ""
        ctext = ((item.get("text") or "")).strip() if isinstance(item.get("text"), str) else ""
        raw_span = item.get("source_span")
        source_span = raw_span if isinstance(raw_span, str) and raw_span else None
        if ctype == "opinion":
            return ClaimResult(
                text=ctext,
                claim_type="opinion",
                verdict="opinion",
                explanation="Subjective or predictive; not treated as an empirically verifiable fact.",
                sources=[],
                source_span=source_span,
            )
        async with sem:
            result = await verify_claim(ctext, posted_at=posted_at)
        return result.model_copy(update={"source_span": source_span})

    claims: list[ClaimResult] = list(await asyncio.gather(*[one(x) for x in raw])) if raw else []

    if not claims:
        claims = [
            ClaimResult(
                text=neutral.strip() or text.strip(),
                claim_type="fact",
                verdict="unverifiable",
                explanation="No atomic claims could be extracted from this text.",
                sources=[],
            )
        ]

    return CheckResponse(
        tweet_id=tweet_id,
        neutral_text=neutral,
        overall_verdict=_overall_verdict(claims),
        claims=claims,
        cached=False,
    )
