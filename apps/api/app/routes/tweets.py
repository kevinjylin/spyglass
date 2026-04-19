import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.db import get_cached_tweet, persist_check, update_tweet_context
from app.models import CheckRequest, CheckResponse
from app.pipeline.orchestrator import run_pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tweets", tags=["tweets"])


@router.post("/check", response_model=CheckResponse)
async def check_tweet(req: CheckRequest, background: BackgroundTasks) -> CheckResponse:
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    cached = get_cached_tweet(req.tweet_id)
    if cached:
        background.add_task(
            update_tweet_context,
            tweet_id=req.tweet_id,
            author_handle=req.author_handle,
            url=req.url,
            tweet_context=req.tweet_context,
        )
        return cached

    try:
        response = await run_pipeline(req.tweet_id, req.text)
    except Exception as exc:  # noqa: BLE001
        logger.exception("pipeline failed")
        raise HTTPException(status_code=502, detail=f"pipeline error: {exc}") from exc

    background.add_task(
        persist_check,
        tweet_id=req.tweet_id,
        raw_text=req.text,
        author_handle=req.author_handle,
        url=req.url,
        tweet_context=req.tweet_context,
        response=response,
    )
    return response
