"""AI quality evaluation.

Generates test cases for the stories in eval/stories.json and scores each result:
schema validity, coverage of all three case types, no empty steps, no duplicate titles,
acceptance-criteria keyword coverage and latency. Prints a table and writes eval/results.md.

Usage (from ai_engine/):
    AI_MODE=live python -m eval.run_eval     # real Claude calls (needs ANTHROPIC_API_KEY)
    python -m eval.run_eval                  # mock mode: proves the pipeline, scores are not meaningful
"""

import asyncio
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.config import get_settings
from app.llm import LlmError
from app.main import build_llm_client
from app.schemas import GeneratedTestCase, StoryInput, TestCaseType

EVAL_DIR = Path(__file__).parent
STORIES_FILE = EVAL_DIR / "stories.json"
RESULTS_FILE = EVAL_DIR / "results.md"

_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "before", "by", "can", "for", "from", "has", "have",
    "in", "is", "it", "its", "my", "of", "on", "only", "or", "so", "that", "the", "their", "then",
    "this", "to", "user", "users", "when", "with", "without", "must", "after", "shows", "show",
}  # fmt: skip


@dataclass
class StoryScore:
    title: str
    schema_valid: bool
    case_count: int = 0
    all_types: bool = False
    no_empty_steps: bool = False
    no_duplicate_titles: bool = False
    criteria_coverage: float = 0.0
    latency_s: float = 0.0
    error: str = ""


def keywords(text: str) -> set[str]:
    """Lower-case content words of 3+ characters (numbers kept: '5 MB', '30 minutes' matter)."""
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if (len(w) >= 3 or w.isdigit()) and w not in _STOPWORDS}


def has_all_types(cases: list[GeneratedTestCase]) -> bool:
    return {case.type for case in cases} == set(TestCaseType)


def has_no_empty_steps(cases: list[GeneratedTestCase]) -> bool:
    return all(case.steps and all(step.strip() for step in case.steps) for case in cases)


def has_no_duplicate_titles(cases: list[GeneratedTestCase]) -> bool:
    titles = [" ".join(case.title.lower().split()) for case in cases]
    return len(titles) == len(set(titles))


def criteria_coverage(criteria: str | None, cases: list[GeneratedTestCase]) -> float:
    """Share of acceptance criteria whose keywords are at least half present in the generated cases."""
    lines = [line.strip() for line in (criteria or "").splitlines() if line.strip()]
    if not lines:
        return 1.0
    corpus = keywords(" ".join(f"{c.title} {c.preconditions} {' '.join(c.steps)} {c.expected_result}" for c in cases))
    covered = 0
    for line in lines:
        wanted = keywords(line)
        if wanted and len(wanted & corpus) / len(wanted) >= 0.5:
            covered += 1
    return covered / len(lines)


def score(title: str, criteria: str | None, cases: list[GeneratedTestCase], latency_s: float) -> StoryScore:
    return StoryScore(
        title=title,
        schema_valid=True,
        case_count=len(cases),
        all_types=has_all_types(cases),
        no_empty_steps=has_no_empty_steps(cases),
        no_duplicate_titles=has_no_duplicate_titles(cases),
        criteria_coverage=criteria_coverage(criteria, cases),
        latency_s=latency_s,
    )


def render_markdown(scores: list[StoryScore], mode: str, model: str) -> str:
    def tick(ok: bool) -> str:
        return "✅" if ok else "❌"

    rows = [
        f"| {s.title} | {tick(s.schema_valid)} | {s.case_count} | {tick(s.all_types)} | {tick(s.no_empty_steps)} "
        f"| {tick(s.no_duplicate_titles)} | {s.criteria_coverage:.0%} | {s.latency_s:.1f}s |"
        + (f" {s.error} |" if s.error else " |")
        for s in scores
    ]
    valid = [s for s in scores if s.schema_valid]
    avg_cov = sum(s.criteria_coverage for s in valid) / len(valid) if valid else 0.0
    avg_lat = sum(s.latency_s for s in valid) / len(valid) if valid else 0.0
    note = (
        "> ⚠️ **Mock mode**: these results come from the deterministic mock, not Claude. They prove the\n"
        "> evaluation pipeline works; run with `AI_MODE=live` and an API key for real scores.\n\n"
        if mode == "mock"
        else ""
    )
    return (
        "# AI quality evaluation\n\n"
        f"{note}"
        f"- Mode: `{mode}` · Model: `{model}` · Run: {datetime.now(UTC):%Y-%m-%d %H:%M} UTC\n"
        f"- Schema valid: {len(valid)}/{len(scores)} · Average criteria coverage: {avg_cov:.0%} "
        f"· Average latency: {avg_lat:.1f}s\n\n"
        "| Story | Schema | Cases | All types | No empty steps | Unique titles | AC coverage | Latency | Notes |\n"
        "|---|---|---|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n"
    )


def load_stories(path: Path = STORIES_FILE) -> list[StoryInput]:
    return [StoryInput.model_validate(raw) for raw in json.loads(path.read_text())]


async def run(stories: list[StoryInput]) -> tuple[list[StoryScore], str, str]:
    settings = get_settings()
    client = build_llm_client(settings)
    mode = settings.effective_mode
    model = settings.anthropic_model if mode == "live" else "mock"
    scores = []
    for story in stories:
        started = time.perf_counter()
        try:
            result = await client.generate_test_cases(story)
        except LlmError as exc:
            scores.append(StoryScore(title=story.title, schema_valid=False, error=str(exc)))
            continue
        scores.append(score(story.title, story.acceptance_criteria, result.test_cases, time.perf_counter() - started))
    return scores, mode, model


def main() -> int:
    scores, mode, model = asyncio.run(run(load_stories()))
    report = render_markdown(scores, mode, model)
    RESULTS_FILE.write_text(report)
    print(report)
    if mode == "mock":
        print("Note: results are from MOCK mode. Set AI_MODE=live and ANTHROPIC_API_KEY for real scores.")
    print(f"Wrote {RESULTS_FILE.relative_to(EVAL_DIR.parent)}")
    return 0 if all(s.schema_valid for s in scores) else 1


if __name__ == "__main__":
    sys.exit(main())
