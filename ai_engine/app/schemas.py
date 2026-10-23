"""Request/response models. JSON is camelCase on the wire, snake_case in Python."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

MIN_CASES = 3
MAX_CASES = 15


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TestCaseType(StrEnum):
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    EDGE = "EDGE"


class Priority(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class StoryInput(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    acceptance_criteria: str | None = Field(default=None, max_length=5000)

    @field_validator("title", "description")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class GeneratedTestCase(CamelModel):
    title: str = Field(min_length=1, max_length=255)
    type: TestCaseType
    priority: Priority
    preconditions: str = Field(default="", max_length=2000)
    steps: list[str] = Field(min_length=1, max_length=30)
    expected_result: str = Field(min_length=1, max_length=2000)

    @field_validator("steps")
    @classmethod
    def steps_not_blank(cls, steps: list[str]) -> list[str]:
        cleaned = [" ".join(step.split()) for step in steps]
        if any(not step for step in cleaned):
            raise ValueError("steps must not be empty")
        if any(len(step) > 500 for step in cleaned):
            raise ValueError("each step must be at most 500 characters")
        return cleaned


class TestCasesResponse(CamelModel):
    model: str
    test_cases: list[GeneratedTestCase] = Field(min_length=MIN_CASES, max_length=MAX_CASES)


class PlaywrightRequest(CamelModel):
    story: StoryInput
    test_cases: list[GeneratedTestCase] = Field(min_length=1, max_length=50)
    base_url: str = Field(default="http://localhost:3000", min_length=1, max_length=500)


class PlaywrightResponse(CamelModel):
    model: str
    script: str


class HealthResponse(BaseModel):
    status: str
    mode: str
    model: str


# JSON schema sent to Claude as structured output. Every field is required and objects are
# closed (additionalProperties: false). The structured-output engine does not enforce array
# length or string length constraints, so the 3-15 case range is stated in the prompt and
# enforced by Pydantic (TestCasesResponse) after parsing.
TEST_CASES_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "testCases": {
            "type": "array",
            "description": f"Between {MIN_CASES} and {MAX_CASES} test cases.",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": [t.value for t in TestCaseType]},
                    "priority": {"type": "string", "enum": [p.value for p in Priority]},
                    "preconditions": {"type": "string"},
                    "steps": {"type": "array", "items": {"type": "string"}},
                    "expectedResult": {"type": "string"},
                },
                "required": ["title", "type", "priority", "preconditions", "steps", "expectedResult"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["testCases"],
    "additionalProperties": False,
}
