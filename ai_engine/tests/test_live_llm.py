"""The live path, with the Anthropic SDK client mocked: no network, no key, no cost."""

import httpx2
import pytest
from anthropic import APIConnectionError, APIStatusError, APITimeoutError, AuthenticationError, RateLimitError
from fastapi.testclient import TestClient

from app.llm import MAX_TOKENS, LiveLlmClient, LlmError, build_live_client
from app.schemas import TEST_CASES_JSON_SCHEMA, PlaywrightRequest, StoryInput
from tests.conftest import STORY, case_dict, make_message, valid_cases_json

STORY_INPUT = StoryInput.model_validate(STORY)
_REQUEST = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def _response(status: int) -> httpx2.Response:
    return httpx2.Response(status, request=_REQUEST)


async def test_valid_json_becomes_validated_test_cases(live_llm: LiveLlmClient, anthropic_client) -> None:
    anthropic_client.messages.create.return_value = make_message(valid_cases_json(4))

    result = await live_llm.generate_test_cases(STORY_INPUT)

    assert result.model == "claude-opus-5-5"
    assert [case.title for case in result.test_cases] == ["Case 0", "Case 1", "Case 2", "Case 3"]


async def test_request_uses_structured_output_and_no_sampling_params(live_llm: LiveLlmClient, anthropic_client) -> None:
    anthropic_client.messages.create.return_value = make_message(valid_cases_json())

    await live_llm.generate_test_cases(STORY_INPUT)

    kwargs = anthropic_client.messages.create.call_args.kwargs
    assert kwargs["model"] == "claude-opus-5-5"
    assert kwargs["max_tokens"] == MAX_TOKENS == 16000
    assert kwargs["output_config"]["format"] == {"type": "json_schema", "schema": TEST_CASES_JSON_SCHEMA}
    assert "<story_title>\nLogin\n</story_title>" in kwargs["messages"][0]["content"]
    for forbidden in ("temperature", "top_p", "top_k", "thinking"):
        assert forbidden not in kwargs


def test_schema_is_closed_and_fully_required() -> None:
    item = TEST_CASES_JSON_SCHEMA["properties"]["testCases"]["items"]
    assert TEST_CASES_JSON_SCHEMA["additionalProperties"] is False
    assert item["additionalProperties"] is False
    assert set(item["required"]) == set(item["properties"])
    assert item["properties"]["type"]["enum"] == ["POSITIVE", "NEGATIVE", "EDGE"]
    assert item["properties"]["priority"]["enum"] == ["HIGH", "MEDIUM", "LOW"]


@pytest.mark.parametrize(
    ("stop_reason", "message"),
    [("refusal", "Model declined the request"), ("max_tokens", "Response was cut off")],
)
async def test_bad_stop_reasons_raise(
    live_llm: LiveLlmClient, anthropic_client, stop_reason: str, message: str
) -> None:
    anthropic_client.messages.create.return_value = make_message("{}", stop_reason=stop_reason)

    with pytest.raises(LlmError, match=message):
        await live_llm.generate_test_cases(STORY_INPUT)


@pytest.mark.parametrize(
    "text",
    [
        "not json at all",
        '{"wrong": []}',
        valid_cases_json(2),  # fewer than 3 cases
        valid_cases_json(16),  # more than 15 cases
        '{"testCases": [{"title": "x", "type": "SMOKE", "priority": "HIGH", "preconditions": "", '
        '"steps": ["a"], "expectedResult": "b"}]}',
        '{"testCases": ['
        + ",".join(
            [
                '{"title": "x", "type": "EDGE", "priority": "LOW", "preconditions": "", '
                '"steps": ["  "], "expectedResult": "b"}'
            ]
            * 3
        )
        + "]}",
        "   ",
    ],
)
async def test_invalid_model_output_raises(live_llm: LiveLlmClient, anthropic_client, text: str) -> None:
    anthropic_client.messages.create.return_value = make_message(text)

    with pytest.raises(LlmError):
        await live_llm.generate_test_cases(STORY_INPUT)


@pytest.mark.parametrize(
    ("error", "message"),
    [
        (APITimeoutError(request=_REQUEST), "Claude API timed out"),
        (RateLimitError("slow down", response=_response(429), body=None), "rate limit"),
        (AuthenticationError("bad key", response=_response(401), body=None), "rejected the API key"),
        (APIStatusError("overloaded", response=_response(529), body=None), r"HTTP 529"),
        (APIConnectionError(request=_REQUEST), "Could not reach the Claude API"),
    ],
)
async def test_sdk_errors_map_to_clear_messages(live_llm: LiveLlmClient, anthropic_client, error, message) -> None:
    anthropic_client.messages.create.side_effect = error

    with pytest.raises(LlmError, match=message):
        await live_llm.generate_test_cases(STORY_INPUT)


async def test_playwright_script_has_fences_stripped(live_llm: LiveLlmClient, anthropic_client) -> None:
    code = "import { test } from '@playwright/test';\ntest('x', async () => {});"
    anthropic_client.messages.create.return_value = make_message(f"```javascript\n{code}\n```")
    request = PlaywrightRequest.model_validate({"story": STORY, "testCases": [case_dict("Valid login")]})

    result = await live_llm.generate_playwright(request)

    assert result.script == code + "\n"
    kwargs = anthropic_client.messages.create.call_args.kwargs
    assert "format" not in kwargs["output_config"]
    assert "<base_url>\nhttp://localhost:3000\n</base_url>" in kwargs["messages"][0]["content"]


def test_api_maps_refusal_to_502(live_api: TestClient, anthropic_client) -> None:
    anthropic_client.messages.create.return_value = make_message("", stop_reason="refusal")

    response = live_api.post("/v1/test-cases/generate", json=STORY)

    assert response.status_code == 502
    assert response.json() == {"detail": "Model declined the request"}


def test_api_maps_invalid_json_and_timeout_to_502(live_api: TestClient, anthropic_client) -> None:
    anthropic_client.messages.create.return_value = make_message("{oops")
    assert live_api.post("/v1/test-cases/generate", json=STORY).json() == {
        "detail": "Model returned invalid test cases"
    }

    anthropic_client.messages.create.side_effect = APITimeoutError(request=_REQUEST)
    response = live_api.post("/v1/test-cases/generate", json=STORY)
    assert response.status_code == 502
    assert response.json() == {"detail": "Claude API timed out"}


def test_api_returns_live_cases(live_api: TestClient, anthropic_client) -> None:
    anthropic_client.messages.create.return_value = make_message(valid_cases_json(3))

    body = live_api.post("/v1/test-cases/generate", json=STORY).json()

    assert body["model"] == "claude-opus-5-5"
    assert len(body["testCases"]) == 3


def test_build_live_client_disables_sdk_retries() -> None:
    llm = build_live_client("test-key", "claude-opus-5-5", 90)
    assert llm._client.max_retries == 0
    assert llm._client.timeout == 90
