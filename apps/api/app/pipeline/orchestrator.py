import asyncio

from app.config import get_settings
from app.models import CheckResponse, ClaimResult, Verdict
from app.pipeline.extract_claims import extract_claims
from app.pipeline.neutralize import neutralize
from app.pipeline.verify import verify_claim


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


async def run_pipeline(tweet_id: str, text: str) -> CheckResponse:
    neutral = await neutralize(text)
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
            result = await verify_claim(ctext)
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
