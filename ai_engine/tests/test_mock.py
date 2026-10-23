from collections import Counter

from app.mock import MockLlmClient, mock_playwright_script, mock_test_cases
from app.schemas import PlaywrightRequest, StoryInput
from tests.conftest import STORY

STORY_INPUT = StoryInput.model_validate(STORY)


def test_exactly_six_cases_with_fixed_type_and_priority_mix() -> None:
    cases = mock_test_cases(STORY_INPUT)
    assert len(cases) == 6
    pairs = Counter((case.type.value, case.priority.value) for case in cases)
    assert pairs == Counter(
        {
            ("POSITIVE", "HIGH"): 1,
            ("POSITIVE", "MEDIUM"): 1,
            ("NEGATIVE", "HIGH"): 1,
            ("NEGATIVE", "MEDIUM"): 1,
            ("NEGATIVE", "LOW"): 1,
            ("EDGE", "MEDIUM"): 1,
        }
    )


def test_cases_are_deterministic_and_use_the_story_title() -> None:
    first, second = mock_test_cases(STORY_INPUT), mock_test_cases(STORY_INPUT)
    assert first == second
    assert first[0].title == "Login: happy path with valid data"
    assert all(case.title.startswith("Login: ") for case in first)


async def test_mock_client_reports_mock_model() -> None:
    result = await MockLlmClient(delay_seconds=0).generate_test_cases(STORY_INPUT)
    assert result.model == "mock"


def test_playwright_template_escapes_quotes_in_titles() -> None:
    story = STORY | {"title": "User's login"}
    cases = [case.model_dump(by_alias=True) for case in mock_test_cases(StoryInput.model_validate(story))]
    script = mock_playwright_script(PlaywrightRequest.model_validate({"story": story, "testCases": cases}))
    assert "test.describe('User\\'s login'" in script
    assert script.count("  test(") == 6
