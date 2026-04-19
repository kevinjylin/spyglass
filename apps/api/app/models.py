from typing import Literal

from pydantic import BaseModel, Field

Verdict = Literal["true", "false", "misleading", "unverifiable", "opinion"]
ClaimType = Literal["fact", "opinion"]


class CheckRequest(BaseModel):
    tweet_id: str
    text: str
    author_handle: str | None = None
    url: str | None = None


class Source(BaseModel):
    url: str
    title: str | None = None
    excerpt: str | None = None


class ClaimResult(BaseModel):
    text: str
    claim_type: ClaimType
    verdict: Verdict
    explanation: str = ""
    sources: list[Source] = Field(default_factory=list)
    source_span: str | None = None


class CheckResponse(BaseModel):
    tweet_id: str
    neutral_text: str
    overall_verdict: Verdict
    claims: list[ClaimResult]
    cached: bool = False


class VerdictBreakdown(BaseModel):
    true: int = 0
    false: int = 0
    misleading: int = 0
    unverifiable: int = 0
    opinion: int = 0


class StatsResponse(BaseModel):
    total_tweets: int
    by_verdict: VerdictBreakdown
    last_24h: int
