"""Deterministic stand-in for Claude, used by tests, CI and E2E (AI_MODE=mock)."""

import asyncio

from app.schemas import (
    GeneratedTestCase,
    PlaywrightRequest,
    PlaywrightResponse,
    Priority,
    StoryInput,
    TestCasesResponse,
    TestCaseType,
)

MOCK_MODEL = "mock"


def mock_test_cases(story: StoryInput) -> list[GeneratedTestCase]:
    """Exactly six cases: 2 POSITIVE (HIGH, MEDIUM), 3 NEGATIVE (HIGH, MEDIUM, LOW), 1 EDGE (MEDIUM)."""
    t = story.title
    specs = [
        (
            f"{t}: happy path with valid data",
            TestCaseType.POSITIVE,
            Priority.HIGH,
            ["Open the feature", "Enter valid data in every required field", "Submit the form"],
            "The action succeeds and a confirmation is shown",
        ),
        (
            f"{t}: optional fields left empty",
            TestCaseType.POSITIVE,
            Priority.MEDIUM,
            ["Open the feature", "Fill only the required fields", "Submit the form"],
            "The action succeeds without the optional data",
        ),
        (
            f"{t}: required field missing",
            TestCaseType.NEGATIVE,
            Priority.HIGH,
            ["Open the feature", "Leave a required field empty", "Submit the form"],
            "Submission is blocked and the missing field is highlighted with an error",
        ),
        (
            f"{t}: invalid format rejected",
            TestCaseType.NEGATIVE,
            Priority.MEDIUM,
            ["Open the feature", "Enter data in an invalid format", "Submit the form"],
            "A validation message explains the expected format",
        ),
        (
            f"{t}: server error handled gracefully",
            TestCaseType.NEGATIVE,
            Priority.LOW,
            ["Simulate a server error", "Submit valid data"],
            "A friendly error is shown and the entered data is kept",
        ),
        (
            f"{t}: maximum length input",
            TestCaseType.EDGE,
            Priority.MEDIUM,
            ["Open the feature", "Enter values at the maximum allowed length", "Submit the form"],
            "The values are accepted and stored without truncation",
        ),
    ]
    return [
        GeneratedTestCase(
            title=title,
            type=case_type,
            priority=priority,
            preconditions="The user is signed in" if i < 2 else "",
            steps=steps,
            expected_result=expected,
        )
        for i, (title, case_type, priority, steps, expected) in enumerate(specs)
    ]


def _js_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'"


def mock_playwright_script(request: PlaywrightRequest) -> str:
    tests = []
    for case in request.test_cases:
        steps = "\n".join(f"    // {n}. {step}" for n, step in enumerate(case.steps, start=1))
        tests.append(
            f"  test({_js_string(case.title)}, async ({{ page }}) => {{\n"
            f"    await page.goto('/');\n"
            f"{steps}\n"
            f"    // TODO: implement the steps above with getByRole / getByLabel locators.\n"
            f"    // Expected: {case.expected_result}\n"
            f"    await expect(page).toHaveTitle(/.+/);\n"
            f"  }});"
        )
    body = "\n\n".join(tests)
    return (
        "import { test, expect } from '@playwright/test';\n\n"
        f"// Base URL: {request.base_url} (set `use.baseURL` in playwright.config.js)\n"
        f"test.describe({_js_string(request.story.title)}, () => {{\n{body}\n}});\n"
    )


class MockLlmClient:
    def __init__(self, delay_seconds: float = 0.8) -> None:
        self._delay = delay_seconds

    async def generate_test_cases(self, story: StoryInput) -> TestCasesResponse:
        await asyncio.sleep(self._delay)
        return TestCasesResponse(model=MOCK_MODEL, test_cases=mock_test_cases(story))

    async def generate_playwright(self, request: PlaywrightRequest) -> PlaywrightResponse:
        await asyncio.sleep(self._delay)
        return PlaywrightResponse(model=MOCK_MODEL, script=mock_playwright_script(request))
