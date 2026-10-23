from app.llm import strip_code_fences
from app.prompts import (
    PLAYWRIGHT_SYSTEM,
    TEST_CASES_SYSTEM,
    build_playwright_user_prompt,
    build_test_cases_user_prompt,
)
from app.schemas import GeneratedTestCase, StoryInput
from tests.conftest import case_dict


def test_test_case_prompt_wraps_story_fields_in_tags() -> None:
    story = StoryInput(title="Checkout", description="As a shopper...", acceptance_criteria="Total includes tax")
    prompt = build_test_cases_user_prompt(story)
    assert "<story_title>\nCheckout\n</story_title>" in prompt
    assert "<story_description>\nAs a shopper...\n</story_description>" in prompt
    assert "<acceptance_criteria>\nTotal includes tax\n</acceptance_criteria>" in prompt


def test_missing_criteria_is_explicit() -> None:
    prompt = build_test_cases_user_prompt(StoryInput(title="t", description="d"))
    assert "<acceptance_criteria>\nNone provided.\n</acceptance_criteria>" in prompt


def test_system_prompt_defines_types_priorities_and_grounding() -> None:
    for word in ("POSITIVE", "NEGATIVE", "EDGE", "HIGH", "MEDIUM", "LOW", "Never invent", "between 3 and 15"):
        assert word in TEST_CASES_SYSTEM


def test_playwright_prompt_lists_numbered_cases_and_base_url() -> None:
    story = StoryInput(title="Login", description="d")
    cases = [GeneratedTestCase.model_validate(case_dict("Valid login"))]
    prompt = build_playwright_user_prompt(story, cases, "https://shop.example.com")
    assert "<base_url>\nhttps://shop.example.com\n</base_url>" in prompt
    assert "1. Valid login [POSITIVE, HIGH]" in prompt
    assert "  1. Open the login page\n  2. Submit valid credentials" in prompt
    assert "getByRole" in PLAYWRIGHT_SYSTEM and "// TODO" in PLAYWRIGHT_SYSTEM


def test_strip_code_fences() -> None:
    assert strip_code_fences("```javascript\nconst a = 1;\n```") == "const a = 1;\n"
    assert strip_code_fences("```js\nconst a = 1;\n```\n") == "const a = 1;\n"
    assert strip_code_fences("```\nconst a = 1;\n```") == "const a = 1;\n"
    assert strip_code_fences("const a = 1;") == "const a = 1;\n"
    # A fence that does not wrap the whole output is left alone.
    assert strip_code_fences("Here:\n```js\nx\n```") == "Here:\n```js\nx\n```\n"


def test_steps_are_normalised_to_single_lines() -> None:
    case = GeneratedTestCase.model_validate(case_dict("x") | {"steps": ["  Open\n the   page "]})
    assert case.steps == ["Open the page"]
