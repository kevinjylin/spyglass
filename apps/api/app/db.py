import hashlib
import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.config import get_settings
from app.models import (
    CheckResponse,
    ClaimResult,
    Source,
    StatsResponse,
    TweetContext,
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


def _clean_str(value: str | None) -> str | None:
    if not value:
        return None
    text = " ".join(value.strip().split())
    return text or None


def _clean_handle(value: str | None) -> str | None:
    handle = _clean_str(value)
    if not handle:
        return None
    return handle.removeprefix("@")


def _clean_metadata_ts(value: str | None) -> str | None:
    text = _clean_str(value)
    if not text:
        return None
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return text


def _non_negative_int(value: int | None) -> int | None:
    if value is None:
        return None
    return max(0, int(value))


def _unique_texts(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = _clean_str(value)
        if text and text not in seen:
            out.append(text)
            seen.add(text)
    return out


def _tweet_context_payload(
    tweet_context: TweetContext | None,
    *,
    author_handle: str | None,
    url: str | None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    handle = _clean_handle(tweet_context.author_handle if tweet_context else None) or _clean_handle(
        author_handle
    )
    if handle:
        payload["author_handle"] = handle
        payload["author_handle_hash"] = _hash_handle(handle)

    clean_url = _clean_str(url)
    if clean_url:
        payload["url"] = clean_url

    if not tweet_context:
        return payload

    for model_field, db_field in (
        ("author_name", "author_name"),
        ("author_avatar_url", "author_avatar_url"),
        ("image_url", "image_url"),
    ):
        value = _clean_str(getattr(tweet_context, model_field))
        if value:
            payload[db_field] = value

    media_urls = _unique_texts(tweet_context.media_urls or [])
    if media_urls:
        payload["media_urls"] = media_urls
        payload.setdefault("image_url", media_urls[0])

    links: list[dict[str, str | None]] = []
    for link in tweet_context.links or []:
        link_url = _clean_str(link.url)
        if not link_url or any(existing["url"] == link_url for existing in links):
            continue
        links.append({"url": link_url, "label": _clean_str(link.label)})
    if links:
        payload["links"] = links

    for model_field, db_field in (
        ("reply_count", "reply_count"),
        ("retweet_count", "retweet_count"),
        ("quote_count", "quote_count"),
        ("like_count", "like_count"),
        ("view_count", "view_count"),
    ):
        value = _non_negative_int(getattr(tweet_context, model_field))
        if value is not None:
            payload[db_field] = value

    metadata_captured_at = _clean_metadata_ts(tweet_context.metadata_captured_at)
    if metadata_captured_at:
        payload["metadata_captured_at"] = metadata_captured_at

    return payload


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
                source_span=c.get("source_span"),
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
    *,
    tweet_id: str,
    raw_text: str,
    author_handle: str | None,
    url: str | None,
    tweet_context: TweetContext | None,
    response: CheckResponse,
) -> None:
    client = _client()
    if not client:
        return
    settings = get_settings()
    now = datetime.now(timezone.utc).isoformat()

    try:
        tweet_payload = {
            "id": tweet_id,
            "text": raw_text,
            "neutral_text": response.neutral_text,
            "author_handle_hash": _hash_handle(author_handle),
            "url": url,
            "overall_verdict": response.overall_verdict,
            "checked_at": now,
        }
        tweet_payload.update(
            _tweet_context_payload(tweet_context, author_handle=author_handle, url=url)
        )
        client.table("tweets").upsert(tweet_payload).execute()

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
                        "source_span": claim.source_span,
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


def update_tweet_context(
    *,
    tweet_id: str,
    author_handle: str | None,
    url: str | None,
    tweet_context: TweetContext | None,
) -> None:
    client = _client()
    if not client:
        return
    payload = _tweet_context_payload(tweet_context, author_handle=author_handle, url=url)
    if not payload:
        return
    try:
        client.table("tweets").update(payload).eq("id", tweet_id).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("update_tweet_context failed: %s", exc)


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
