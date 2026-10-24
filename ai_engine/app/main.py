"""FastAPI entry point for the TestPilot AI engine.

The engine is stateless: it turns a story into JSON and never stores anything. Only the backend
calls it; the Anthropic API key lives only in this service's environment.
"""

import logging
import re
import secrets
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.llm import LlmClient, LlmError, build_live_client
from app.logging import configure_logging, request_id_var
from app.mock import MOCK_MODEL, MockLlmClient
from app.schemas import (
    HealthResponse,
    PlaywrightRequest,
    PlaywrightResponse,
    StoryInput,
    TestCasesResponse,
)

logger = logging.getLogger("app")

REQUEST_ID_HEADER = "X-Request-Id"
TOKEN_HEADER = "X-Internal-Token"  # noqa: S105 - a header name, not a secret
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def build_llm_client(settings: Settings) -> LlmClient:
    if settings.ai_mode == "live" and not settings.anthropic_api_key:
        logger.warning("AI_MODE=live but ANTHROPIC_API_KEY is not set; falling back to mock mode")
    if settings.effective_mode == "live":
        return build_live_client(settings.anthropic_api_key, settings.anthropic_model, settings.llm_timeout_seconds)
    return MockLlmClient(delay_seconds=settings.mock_delay_seconds)


def create_app(settings: Settings | None = None, llm: LlmClient | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.llm = llm or build_llm_client(settings)
        logger.info("AI engine started", extra={"mode": settings.effective_mode, "model": model_name()})
        yield

    def model_name() -> str:
        return settings.anthropic_model if settings.effective_mode == "live" else MOCK_MODEL

    app = FastAPI(
        title="TestPilot AI engine",
        version="1.0.0",
        description="Stateless service that turns user stories into test cases and Playwright scripts.",
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else str(uuid.uuid4())
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            if not _authorized(request):
                response = JSONResponse(status_code=401, content={"detail": "Missing or invalid internal token"})
            else:
                response = await call_next(request)
            response.headers[REQUEST_ID_HEADER] = request_id
            logger.info(
                "request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "durationMs": round((time.perf_counter() - started) * 1000),
                },
            )
            return response
        finally:
            request_id_var.reset(token)

    def _authorized(request: Request) -> bool:
        # Health and docs stay public so the platform's health checks and the wake-up ping work.
        if not settings.ai_engine_token or not request.url.path.startswith("/v1/"):
            return True
        return secrets.compare_digest(request.headers.get(TOKEN_HEADER, ""), settings.ai_engine_token)

    @app.exception_handler(LlmError)
    async def llm_error_handler(_: Request, exc: LlmError) -> JSONResponse:
        logger.warning("Generation failed", extra={"reason": str(exc)})
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    def get_llm(request: Request) -> LlmClient:
        return request.app.state.llm

    Llm = Annotated[LlmClient, Depends(get_llm)]  # noqa: N806 - type alias, not a variable

    @app.get("/health", response_model=HealthResponse, tags=["health"], summary="Liveness and mode")
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", mode=settings.effective_mode, model=model_name())

    @app.post(
        "/v1/test-cases/generate",
        response_model=TestCasesResponse,
        response_model_by_alias=True,
        tags=["generation"],
        summary="Generate test cases for a user story",
        responses={422: {"description": "Invalid input"}, 502: {"description": "LLM failure or refusal"}},
    )
    async def generate_test_cases(story: StoryInput, llm: Llm) -> TestCasesResponse:
        return await llm.generate_test_cases(story)

    @app.post(
        "/v1/playwright/generate",
        response_model=PlaywrightResponse,
        tags=["generation"],
        summary="Generate a Playwright test file for a story and its test cases",
        responses={422: {"description": "Invalid input"}, 502: {"description": "LLM failure or refusal"}},
    )
    async def generate_playwright(request: PlaywrightRequest, llm: Llm) -> PlaywrightResponse:
        return await llm.generate_playwright(request)

    return app


app = create_app()
