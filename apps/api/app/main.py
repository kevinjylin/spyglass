import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import stats, tweets

logging.basicConfig(level=logging.INFO)

settings = get_settings()
app = FastAPI(title="precitrus api", version="0.1.0")

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(tweets.router)
app.include_router(stats.router)


@app.get("/healthz")
def healthz() -> dict[str, object]:
    return {
        "ok": True,
        "gemini": bool(settings.gemini_api_key),
        "supabase": bool(settings.supabase_url and settings.supabase_service_role_key),
    }
