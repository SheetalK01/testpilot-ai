import json
from collections.abc import Iterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from anthropic.types import Message
from fastapi.testclient import TestClient

from app.config import Settings
from app.llm import LiveLlmClient
from app.main import create_app
from app.mock import MockLlmClient

STORY = {"title": "Login", "description": "As a user I want to log in", "acceptanceCriteria": "Valid login works"}


def mock_settings(**overrides) -> Settings:
    # _env_file=None: tests never read a developer's real .env (which may hold AI_MODE=live).
    values = {"ai_mode": "mock", "mock_delay_seconds": 0, "anthropic_api_key": None} | overrides
    return Settings(_env_file=None, **values)


def make_message(text: str, stop_reason: str = "end_turn", model: str = "claude-opus-5-5") -> Message:
    return Message.model_validate(
        {
            "id": "msg_test",
            "type": "message",
            "role": "assistant",
            "model": model,
            "content": [{"type": "text", "text": text}],
            "stop_reason": stop_reason,
            "stop_sequence": None,
            "usage": {"input_tokens": 120, "output_tokens": 480},
        }
    )


def case_dict(title: str, case_type: str = "POSITIVE", priority: str = "HIGH") -> dict:
    return {
        "title": title,
        "type": case_type,
        "priority": priority,
        "preconditions": "",
        "steps": ["Open the login page", "Submit valid credentials"],
        "expectedResult": "The dashboard is shown",
    }


def valid_cases_json(count: int = 3) -> str:
    types = ["POSITIVE", "NEGATIVE", "EDGE"]
    return json.dumps({"testCases": [case_dict(f"Case {i}", types[i % 3]) for i in range(count)]})


@pytest.fixture
def anthropic_client() -> MagicMock:
    """Stand-in for anthropic.AsyncAnthropic; set `.messages.create.return_value` or `.side_effect`."""
    client = MagicMock()
    client.messages.create = AsyncMock()
    return client


@pytest.fixture
def live_llm(anthropic_client: MagicMock) -> LiveLlmClient:
    return LiveLlmClient(anthropic_client, "claude-opus-5-5")


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app(mock_settings(), MockLlmClient(delay_seconds=0))) as test_client:
        yield test_client


@pytest.fixture
def live_api(live_llm: LiveLlmClient) -> Iterator[TestClient]:
    """The HTTP API wired to the live client, whose Anthropic SDK client is mocked."""
    settings = mock_settings(ai_mode="live", anthropic_api_key="test-key")
    with TestClient(create_app(settings, live_llm)) as test_client:
        yield test_client
