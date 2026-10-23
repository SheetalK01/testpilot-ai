"""Prompt templates.

Design notes
------------
* The system prompt gives Claude a role (senior QA engineer) and the *quality bar* for a good
  test case, not just a format. Format is handled separately by structured output (a JSON
  schema), so the prompt can spend its words on what makes a case useful: one purpose per case,
  short imperative steps, observable expected results.
* "Never invent features" keeps the cases grounded in the story. Hallucinated requirements are the
  most common failure of LLM-written tests and the most expensive to catch in review.
* Type and priority definitions are spelled out so the labels mean the same thing across runs and
  across stories, which keeps the dashboard charts meaningful.
* User content goes inside XML-style tags. That separates instructions from data, so a story that
  happens to contain text like "ignore the above" is treated as story text, not as an instruction.
* The Playwright prompt asks for role/label locators (getByRole, getByLabel) because they mirror
  how users and assistive technology find elements and survive CSS refactors. Where a selector or
  test data cannot be known from the story, the model leaves a `// TODO` instead of guessing.
"""

from app.schemas import MAX_CASES, MIN_CASES, GeneratedTestCase, StoryInput

TEST_CASES_SYSTEM = f"""You are a senior QA engineer. You turn a user story into clear, independent, \
executable manual test cases that another tester could run without asking questions.

Cover, as far as the story supports it:
- the happy path with valid data,
- validation and error handling (invalid, missing or malformed input; failures the user can see),
- boundaries and edge cases implied by the acceptance criteria (limits, empty states, duplicates).

Rules:
- Write between {MIN_CASES} and {MAX_CASES} test cases. Prefer fewer, sharper cases over padding.
- Each case tests exactly one thing. Its title says what is being verified.
- Cases are independent: each one states its own preconditions and does not rely on another case.
- Steps are short imperative sentences, one action per step ("Enter a valid email").
- The expected result is observable and specific ("An error 'Email is required' is shown under \
the email field"), never vague ("it works").
- Only test behaviour the story or its acceptance criteria describe or clearly imply. Never invent \
features, screens, fields or messages the story does not mention; when exact wording is unknown, \
describe the outcome instead of quoting text.
- Use an empty string for preconditions when there are none.

Types:
- POSITIVE: valid input or normal use; the feature does what it should.
- NEGATIVE: invalid input, missing data, unauthorised use or failure handling.
- EDGE: boundaries, limits, unusual but valid conditions.

Priorities:
- HIGH: core functionality, security or data integrity; a failure blocks release.
- MEDIUM: important behaviour with a workaround, or common validation.
- LOW: cosmetic issues or rare conditions with little impact."""

PLAYWRIGHT_SYSTEM = """You are a senior SDET who writes Playwright end-to-end tests in JavaScript.

Write exactly one test file that:
- imports `test` and `expect` from '@playwright/test';
- wraps everything in one `test.describe()` named after the user story;
- contains one `test()` per test case, in the given order, titled with the test case title;
- uses relative paths with `page.goto()` so the configured `baseURL` is used;
- finds elements with role- and label-based locators (`getByRole`, `getByLabel`, `getByText`, \
`getByPlaceholder`), never CSS or XPath selectors;
- turns each step into Playwright actions and the expected result into web-first `expect` \
assertions;
- writes a `// TODO:` comment wherever a URL, accessible name or test data cannot be known from \
the story, instead of guessing.

Output only the JavaScript code. No markdown fences, no explanations before or after the code."""


def _tag(name: str, value: str | None) -> str:
    return f"<{name}>\n{(value or '').strip() or 'None provided.'}\n</{name}>"


def build_test_cases_user_prompt(story: StoryInput) -> str:
    return "\n\n".join(
        [
            "Write test cases for this user story.",
            _tag("story_title", story.title),
            _tag("story_description", story.description),
            _tag("acceptance_criteria", story.acceptance_criteria),
        ]
    )


def format_test_case(index: int, case: GeneratedTestCase) -> str:
    steps = "\n".join(f"  {n}. {step}" for n, step in enumerate(case.steps, start=1))
    lines = [
        f"{index}. {case.title} [{case.type.value}, {case.priority.value}]",
        f"Preconditions: {case.preconditions or 'None'}",
        f"Steps:\n{steps}",
        f"Expected result: {case.expected_result}",
    ]
    return "\n".join(lines)


def build_playwright_user_prompt(story: StoryInput, cases: list[GeneratedTestCase], base_url: str) -> str:
    formatted = "\n\n".join(format_test_case(i, case) for i, case in enumerate(cases, start=1))
    return "\n\n".join(
        [
            "Write the Playwright test file for this user story and its test cases.",
            _tag("base_url", base_url),
            _tag("story_title", story.title),
            _tag("story_description", story.description),
            _tag("acceptance_criteria", story.acceptance_criteria),
            _tag("test_cases", formatted),
        ]
    )
