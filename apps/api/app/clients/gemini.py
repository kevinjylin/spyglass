import asyncio
import json
import logging
import random
from typing import Any

import google.auth
import google.auth.transport.requests
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 4
BASE_BACKOFF_S = 0.75

_credentials = None
_credentials_lock = asyncio.Lock()


class GeminiError(RuntimeError):
    pass


async def _get_bearer_token() -> str:
    global _credentials
    async with _credentials_lock:
        if _credentials is None:
            _credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
        if not _credentials.valid:
            loop = asyncio.get_running_loop()
            request = google.auth.transport.requests.Request()
            await loop.run_in_executor(None, _credentials.refresh, request)
    return _credentials.token


def _endpoint(project: str, region: str, model: str) -> str:
    return (
        f"https://{region}-aiplatform.googleapis.com/v1"
        f"/projects/{project}/locations/{region}"
        f"/publishers/google/models/{model}:generateContent"
    )


def _build_payload(
    system: str,
    user: str,
    temperature: float,
    response_mime_type: str | None = None,
    grounded: bool = False,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": temperature},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    if response_mime_type:
        payload["generationConfig"]["responseMimeType"] = response_mime_type
    if grounded:
        payload["tools"] = [{"googleSearch": {}}]
    return payload


async def _post(model: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.gcp_project:
        raise GeminiError("GCP_PROJECT is not set")

    url = _endpoint(settings.gcp_project, settings.gcp_region, model)
    token = await _get_bearer_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=settings.request_timeout_s) as client:
        for attempt in range(MAX_RETRIES):
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 429 or resp.status_code >= 500:
                    raise GeminiError(f"retryable status {resp.status_code}: {resp.text[:300]}")
                if resp.status_code == 401:
                    global _credentials
                    async with _credentials_lock:
                        if _credentials is not None:
                            _credentials.expiry = None
                    raise GeminiError(f"auth error 401: {resp.text[:300]}")
                if resp.status_code >= 400:
                    raise GeminiError(f"vertex {resp.status_code}: {resp.text[:300]}")
                return resp.json()
            except (httpx.HTTPError, GeminiError) as exc:
                last_err = exc
                if attempt == MAX_RETRIES - 1:
                    break
                delay = BASE_BACKOFF_S * (2**attempt) + random.uniform(0, 0.25)
                logger.warning("vertex retry %d/%d after %.2fs: %s", attempt + 1, MAX_RETRIES, delay, exc)
                await asyncio.sleep(delay)
    raise GeminiError(f"vertex failed after {MAX_RETRIES} attempts: {last_err}")


def _extract_text(data: dict[str, Any]) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts).strip()


def _extract_citations(data: dict[str, Any]) -> list[dict[str, str]]:
    candidates = data.get("candidates") or []
    if not candidates:
        return []
    meta = candidates[0].get("groundingMetadata") or {}
    chunks = meta.get("groundingChunks") or []
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for chunk in chunks:
        web = chunk.get("web") or {}
        url = (web.get("uri") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append({
            "url": url,
            "title": (web.get("title") or "").strip(),
            "excerpt": "",
        })
    # Attach snippets from groundingSupports when present
    supports = meta.get("groundingSupports") or []
    snippet_by_idx: dict[int, str] = {}
    for sup in supports:
        seg = (sup.get("segment") or {}).get("text", "")
        for idx in sup.get("groundingChunkIndices") or []:
            if isinstance(idx, int) and idx not in snippet_by_idx and seg:
                snippet_by_idx[idx] = seg.strip()
    for idx, item in enumerate(out):
        if idx in snippet_by_idx:
            item["excerpt"] = snippet_by_idx[idx]
    return out


async def chat(model: str, system: str, user: str, temperature: float = 0.2) -> str:
    data = await _post(model, _build_payload(system, user, temperature))
    return _extract_text(data)


async def chat_json(model: str, system: str, user: str, temperature: float = 0.1) -> dict[str, Any]:
    data = await _post(
        model,
        _build_payload(system, user, temperature, response_mime_type="application/json"),
    )
    text = _extract_text(data)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise GeminiError(f"chat_json invalid json: {exc}: {text[:300]}") from exc


async def chat_grounded(
    model: str, system: str, user: str, temperature: float = 0.1
) -> dict[str, Any]:
    data = await _post(model, _build_payload(system, user, temperature, grounded=True))
    return {"text": _extract_text(data), "citations": _extract_citations(data)}
