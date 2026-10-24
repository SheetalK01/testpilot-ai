import logging

from fastapi.testclient import TestClient

from app.main import build_llm_client, create_app
from app.mock import MockLlmClient
from tests.conftest import STORY, case_dict, mock_settings


def test_health_reports_mock_mode(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "mode": "mock", "model": "mock"}


def test_live_mode_without_key_falls_back_to_mock_with_warning(caplog) -> None:
    settings = mock_settings(ai_mode="live", anthropic_api_key=None)
    with caplog.at_level(logging.WARNING):
        llm = build_llm_client(settings)
    assert isinstance(llm, MockLlmClient)
    assert "falling back to mock" in caplog.text
    with TestClient(create_app(settings)) as api:
        assert api.get("/health").json()["mode"] == "mock"


def test_health_reports_live_mode_and_model_when_key_is_set() -> None:
    settings = mock_settings(ai_mode="live", anthropic_api_key="test-key", anthropic_model="claude-opus-5-5")
    with TestClient(create_app(settings, MockLlmClient(0))) as api:
        assert api.get("/health").json() == {"status": "ok", "mode": "live", "model": "claude-opus-5-5"}


def test_generate_returns_camel_case_test_cases(client: TestClient) -> None:
    response = client.post("/v1/test-cases/generate", json=STORY)
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "mock"
    assert len(body["testCases"]) == 6
    first = body["testCases"][0]
    assert set(first) == {"title", "type", "priority", "preconditions", "steps", "expectedResult"}
    assert first["type"] in {"POSITIVE", "NEGATIVE", "EDGE"}
    assert first["priority"] in {"HIGH", "MEDIUM", "LOW"}
    assert all(isinstance(step, str) and step for step in first["steps"])


def test_generate_accepts_snake_case_too(client: TestClient) -> None:
    story = {"title": "Login", "description": "desc", "acceptance_criteria": "AC"}
    assert client.post("/v1/test-cases/generate", json=story).status_code == 200


def test_generate_validates_input(client: TestClient) -> None:
    cases = [
        {"description": "missing title"},
        {"title": "   ", "description": "blank title"},
        {"title": "t" * 201, "description": "too long title"},
        {"title": "ok", "description": "d" * 5001},
        {"title": "ok", "description": "ok", "acceptanceCriteria": "a" * 5001},
    ]
    for body in cases:
        response = client.post("/v1/test-cases/generate", json=body)
        assert response.status_code == 422, body
        assert "detail" in response.json()


def test_playwright_generation_in_mock_mode(client: TestClient) -> None:
    body = {"story": STORY, "testCases": [case_dict("Valid login"), case_dict("Bad password", "NEGATIVE")]}
    response = client.post("/v1/playwright/generate", json=body)
    assert response.status_code == 200
    script = response.json()["script"]
    assert response.json()["model"] == "mock"
    assert "import { test, expect } from '@playwright/test';" in script
    assert "test.describe('Login'" in script
    assert script.count("  test(") == 2
    assert "http://localhost:3000" in script


def test_playwright_validates_case_count(client: TestClient) -> None:
    assert client.post("/v1/playwright/generate", json={"story": STORY, "testCases": []}).status_code == 422
    too_many = [case_dict(f"c{i}") for i in range(51)]
    assert client.post("/v1/playwright/generate", json={"story": STORY, "testCases": too_many}).status_code == 422


def test_playwright_rejects_bad_enum(client: TestClient) -> None:
    bad = case_dict("x") | {"type": "SMOKE"}
    assert client.post("/v1/playwright/generate", json={"story": STORY, "testCases": [bad]}).status_code == 422


def test_request_id_is_echoed_or_generated(client: TestClient) -> None:
    assert client.get("/health", headers={"X-Request-Id": "req-42"}).headers["X-Request-Id"] == "req-42"
    generated = client.get("/health", headers={"X-Request-Id": "bad id with spaces"}).headers["X-Request-Id"]
    assert generated != "bad id with spaces"
    assert len(generated) == 36


def test_openapi_docs_are_served(client: TestClient) -> None:
    assert client.get("/docs").status_code == 200
    paths = client.get("/openapi.json").json()["paths"]
    assert {"/health", "/v1/test-cases/generate", "/v1/playwright/generate"} <= set(paths)


def test_generation_requires_the_internal_token_when_configured() -> None:
    settings = mock_settings(ai_engine_token="s3cret")
    with TestClient(create_app(settings, MockLlmClient(0))) as api:
        assert api.get("/health").status_code == 200  # health stays public for platform checks
        missing = api.post("/v1/test-cases/generate", json=STORY)
        wrong = api.post("/v1/test-cases/generate", json=STORY, headers={"X-Internal-Token": "nope"})
        right = api.post("/v1/test-cases/generate", json=STORY, headers={"X-Internal-Token": "s3cret"})
    assert missing.status_code == 401
    assert missing.json() == {"detail": "Missing or invalid internal token"}
    assert wrong.status_code == 401
    assert right.status_code == 200
