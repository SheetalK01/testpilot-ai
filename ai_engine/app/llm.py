"""Claude client: turns stories into validated test cases and Playwright scripts."""

import json
import logging
import re
import time
from typing import Protocol

import anthropic
from pydantic import ValidationError

from app.prompts import (
    PLAYWRIGHT_SYSTEM,
    TEST_CASES_SYSTEM,
    build_playwright_user_prompt,
    build_test_cases_user_prompt,
)
from app.schemas import (
    TEST_CASES_JSON_SCHEMA,
    PlaywrightRequest,
    PlaywrightResponse,
    StoryInput,
    TestCasesResponse,
)

logger = logging.getLogger(__name__)

MAX_TOKENS = 16000
# Claude Opus 5.5 always thinks adaptively; effort is the only depth control (its default is
# "medium"). It is set explicitly so behaviour does not shift if the API default changes.
EFFORT = "medium"

_FENCE = re.compile(r"^\s*```[\w-]*\s*\n(?P<body>.*?)\n?\s*```\s*$", re.DOTALL)


class LlmError(Exception):
    """A generation failed in a way the caller should report as 502 with this message."""


class LlmClient(Protocol):
    async def generate_test_cases(self, story: StoryInput) -> TestCasesResponse: ...

    async def generate_playwright(self, request: PlaywrightRequest) -> PlaywrightResponse: ...


def strip_code_fences(text: str) -> str:
    """Remove a surrounding ```lang ... ``` fence if the model added one despite instructions."""
    match = _FENCE.match(text)
    return (match.group("body") if match else text).strip() + "\n"


def _check_stop_reason(response: anthropic.types.Message) -> None:
    if response.stop_reason == "refusal":
        raise LlmError("Model declined the request")
    if response.stop_reason == "max_tokens":
        raise LlmError("Response was cut off")


def _first_text(response: anthropic.types.Message) -> str:
    text = next((block.text for block in response.content if block.type == "text"), "")
    if not text.strip():
        raise LlmError("Model returned an empty response")
    return text


class LiveLlmClient:
    def __init__(self, client: anthropic.AsyncAnthropic, model: str) -> None:
        self._client = client
        self._model = model

    async def generate_test_cases(self, story: StoryInput) -> TestCasesResponse:
        response = await self._create(
            kind="test_cases",
            system=TEST_CASES_SYSTEM,
            prompt=build_test_cases_user_prompt(story),
            output_config={"effort": EFFORT, "format": {"type": "json_schema", "schema": TEST_CASES_JSON_SCHEMA}},
        )
        try:
            data = json.loads(_first_text(response))
            return TestCasesResponse.model_validate({"model": response.model, "testCases": data["testCases"]})
        except (json.JSONDecodeError, KeyError, TypeError, ValidationError) as exc:
            logger.warning("Model output failed validation", extra={"error": str(exc)[:300]})
            raise LlmError("Model returned invalid test cases") from exc

    async def generate_playwright(self, request: PlaywrightRequest) -> PlaywrightResponse:
        response = await self._create(
            kind="playwright",
            system=PLAYWRIGHT_SYSTEM,
            prompt=build_playwright_user_prompt(request.story, request.test_cases, request.base_url),
            output_config={"effort": EFFORT},
        )
        return PlaywrightResponse(model=response.model, script=strip_code_fences(_first_text(response)))

    async def _create(self, *, kind: str, system: str, prompt: str, output_config: dict) -> anthropic.types.Message:
        started = time.perf_counter()
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=MAX_TOKENS,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_config=output_config,
            )
        # Most specific first: APITimeoutError is a subclass of APIConnectionError, and
        # RateLimitError / AuthenticationError are subclasses of APIStatusError.
        except anthropic.APITimeoutError as exc:
            raise LlmError("Claude API timed out") from exc
        except anthropic.RateLimitError as exc:
            raise LlmError("Claude API rate limit reached, try again shortly") from exc
        except anthropic.AuthenticationError as exc:
            raise LlmError("Claude API rejected the API key") from exc
        except anthropic.APIStatusError as exc:
            raise LlmError(f"Claude API error (HTTP {exc.status_code})") from exc
        except anthropic.APIConnectionError as exc:
            raise LlmError("Could not reach the Claude API") from exc

        logger.info(
            "Claude call finished",
            extra={
                "kind": kind,
                "model": response.model,
                "stopReason": response.stop_reason,
                "inputTokens": response.usage.input_tokens,
                "outputTokens": response.usage.output_tokens,
                "durationMs": round((time.perf_counter() - started) * 1000),
            },
        )
        _check_stop_reason(response)
        return response


def build_live_client(api_key: str, model: str, timeout_seconds: float) -> LiveLlmClient:
    # No SDK retries: the backend waits AI_ENGINE_TIMEOUT_SECONDS (120 s) for us, and a retried
    # 90 s call would overrun it. A failed generation is reported and the user can retry.
    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout_seconds, max_retries=0)
    return LiveLlmClient(client, model)
