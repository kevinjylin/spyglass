from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gcp_project: str = ""
    gcp_region: str = "us-central1"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    allowed_origins: str = "http://localhost:3000"

    gemma_rewrite_model: str = "gemini-2.5-flash"
    gemma_extract_model: str = "gemini-2.5-flash"
    gemini_verify_model: str = "gemini-2.5-flash"

    verify_concurrency: int = 3
    request_timeout_s: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
