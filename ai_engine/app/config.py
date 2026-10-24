"""Runtime settings, read from environment variables (and an optional .env file)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # The repo-root .env (shared with docker-compose) is read first; ai_engine/.env can override it.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    ai_mode: Literal["live", "mock"] = "mock"
    anthropic_api_key: str | None = Field(default=None, repr=False)
    anthropic_model: str = "claude-opus-5-5"
    llm_timeout_seconds: float = Field(default=90, gt=0)
    # Mock mode pauses briefly so the frontend's "AI is generating..." animation is visible.
    mock_delay_seconds: float = Field(default=0.8, ge=0)
    log_level: str = "INFO"
    # Shared secret the backend sends as X-Internal-Token. Empty = no check (local dev, tests).
    # Set it on free hosting, where this service has a public URL.
    ai_engine_token: str | None = Field(default=None, repr=False)

    @property
    def effective_mode(self) -> Literal["live", "mock"]:
        """Live mode needs a key; without one the engine falls back to mock (see main.py warning)."""
        if self.ai_mode == "live" and self.anthropic_api_key:
            return "live"
        return "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
