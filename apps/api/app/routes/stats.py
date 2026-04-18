from fastapi import APIRouter

from app.db import fetch_stats
from app.models import StatsResponse

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
async def stats() -> StatsResponse:
    return fetch_stats()
