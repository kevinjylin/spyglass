import hashlib
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings
from app.models import (
    CheckResponse,
    ClaimResult,
    Source,
    StatsResponse,
    VerdictBreakdown,
)

logger = logging.getLogger(__name__)


@lru_cache
def _client() -> Client | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _hash_handle(handle: str | None) -> str | None:
    if not handle:
        return None
    return hashlib.sha256(handle.strip().lower().encode("utf-8")).hexdigest()[:32]


def get_cached_tweet(tweet_id: str) -> CheckResponse | None:
    client = _client()
    if not client:
        return None
    try:
        tweet_resp = (
            client.table("tweets").select("*").eq("id", tweet_id).limit(1).execute()
        )
        rows = tweet_resp.data or []
        if not rows:
            return None
        tweet = rows[0]
        if not tweet.get("checked_at"):
            return None

        claims_resp = (
            client.table("claims").select("*").eq("tweet_id", tweet_id).execute()
        )
        claim_rows = claims_resp.data or []
        if not claim_rows:
            return None

        claim_ids = [c["id"] for c in claim_rows]
        verif_resp = (
            client.table("verifications").select("*").in_("claim_id", claim_ids).execute()
        )
        verif_rows = verif_resp.data or []
        sources_by_claim: dict[int, list[Source]] = {}
        for v in verif_rows:
            sources_by_claim.setdefault(v["claim_id"], []).append(
                Source(
                    url=v.get("source_url") or "",
                    title=v.get("source_title"),
                    excerpt=v.get("excerpt"),
                )
            )

        claims = [
            ClaimResult(
                text=c["text"],
                claim_type=(c.get("claim_type") or "fact"),
                verdict=(c.get("verdict") or "unverifiable"),
                explanation=c.get("explanation") or "",
                sources=sources_by_claim.get(c["id"], []),
            )
            for c in claim_rows
        ]

        return CheckResponse(
            tweet_id=tweet_id,
            neutral_text=tweet.get("neutral_text") or tweet.get("text", ""),
            overall_verdict=tweet.get("overall_verdict") or "unverifiable",
            claims=claims,
            cached=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("get_cached_tweet failed: %s", exc)
        return None


def persist_check(
    *, tweet_id: str, raw_text: str, author_handle: str | None, url: str | None, response: CheckResponse
) -> None:
    client = _client()
    if not client:
        return
    settings = get_settings()
    now = datetime.now(timezone.utc).isoformat()

    try:
        client.table("tweets").upsert(
            {
                "id": tweet_id,
                "text": raw_text,
                "neutral_text": response.neutral_text,
                "author_handle_hash": _hash_handle(author_handle),
                "url": url,
                "overall_verdict": response.overall_verdict,
                "checked_at": now,
            }
        ).execute()

        # Replace any prior claims for this tweet
        client.table("claims").delete().eq("tweet_id", tweet_id).execute()

        for claim in response.claims:
            inserted = (
                client.table("claims")
                .insert(
                    {
                        "tweet_id": tweet_id,
                        "text": claim.text,
                        "claim_type": claim.claim_type,
                        "verdict": claim.verdict,
                        "explanation": claim.explanation,
                    }
                )
                .execute()
            )
            new_rows = inserted.data or []
            if not new_rows:
                continue
            claim_id = new_rows[0]["id"]
            if not claim.sources:
                continue
            client.table("verifications").insert(
                [
                    {
                        "claim_id": claim_id,
                        "source_url": s.url,
                        "source_title": s.title,
                        "excerpt": s.excerpt,
                        "model": settings.gemini_verify_model,
                    }
                    for s in claim.sources
                ]
            ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("persist_check failed: %s", exc)


def fetch_stats() -> StatsResponse:
    client = _client()
    if not client:
        return StatsResponse(total_tweets=0, by_verdict=VerdictBreakdown(), last_24h=0)
    try:
        all_resp = client.table("tweets").select("overall_verdict, created_at").execute()
        rows = all_resp.data or []
        breakdown = VerdictBreakdown()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        last_24h = 0
        for r in rows:
            v = (r.get("overall_verdict") or "").lower()
            if v in {"true", "false", "misleading", "unverifiable", "opinion"}:
                setattr(breakdown, v, getattr(breakdown, v) + 1)
            ts = r.get("created_at")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if dt >= cutoff:
                        last_24h += 1
                except ValueError:
                    pass
        return StatsResponse(total_tweets=len(rows), by_verdict=breakdown, last_24h=last_24h)
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_stats failed: %s", exc)
        return StatsResponse(total_tweets=0, by_verdict=VerdictBreakdown(), last_24h=0)
