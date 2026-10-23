from pathlib import Path

from app.schemas import GeneratedTestCase
from eval.run_eval import (
    StoryScore,
    criteria_coverage,
    has_all_types,
    has_no_duplicate_titles,
    has_no_empty_steps,
    keywords,
    load_stories,
    render_markdown,
    run,
    score,
)
from tests.conftest import case_dict


def _case(title: str, case_type: str = "POSITIVE", **extra) -> GeneratedTestCase:
    return GeneratedTestCase.model_validate(case_dict(title, case_type) | extra)


def test_keywords_drop_stopwords_and_keep_numbers() -> None:
    assert keywords("The account is locked for 15 minutes after 5 failed attempts") == {
        "account", "locked", "15", "minutes", "5", "failed", "attempts",
    }  # fmt: skip


def test_all_types_present() -> None:
    assert has_all_types([_case("a"), _case("b", "NEGATIVE"), _case("c", "EDGE")])
    assert not has_all_types([_case("a"), _case("b", "NEGATIVE")])


def test_no_empty_steps() -> None:
    case = _case("a")
    assert has_no_empty_steps([case])
    case.steps = []
    assert not has_no_empty_steps([case])


def test_duplicate_titles_ignore_case_and_spacing() -> None:
    assert has_no_duplicate_titles([_case("Login"), _case("Logout")])
    assert not has_no_duplicate_titles([_case("Valid login"), _case("valid  LOGIN")])


def test_criteria_coverage_counts_criteria_whose_keywords_appear() -> None:
    criteria = "Wrong password shows an error\nAccount locked after 5 failed attempts"
    cases = [_case("Wrong password", expectedResult="An error is displayed")]
    assert criteria_coverage(criteria, cases) == 0.5
    assert criteria_coverage(None, cases) == 1.0


def test_score_and_markdown_report() -> None:
    cases = [_case("a"), _case("b", "NEGATIVE"), _case("c", "EDGE")]
    result = score("Login", "Open the login page", cases, 1.234)
    assert result == StoryScore("Login", True, 3, True, True, True, 1.0, 1.234)
    failed = StoryScore("Upload", False, error="Model declined the request")
    report = render_markdown([result, failed], "mock", "mock")
    assert "Mock mode" in report
    assert "| Login | ✅ | 3 | ✅ | ✅ | ✅ | 100% | 1.2s |" in report
    assert "Model declined the request" in report
    assert "Schema valid: 1/2" in report


def test_stories_file_has_the_five_required_stories() -> None:
    titles = [story.title for story in load_stories()]
    assert titles == ["Login", "Sign up", "Password reset", "Cart checkout", "File upload"]
    assert all(story.acceptance_criteria for story in load_stories())


async def test_run_in_mock_mode(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("AI_MODE", "mock")
    monkeypatch.setenv("MOCK_DELAY_SECONDS", "0")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    monkeypatch.chdir(tmp_path)  # no .env files are picked up from here
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        scores, mode, model = await run(load_stories()[:2])
    finally:
        get_settings.cache_clear()
    assert (mode, model) == ("mock", "mock")
    assert [s.case_count for s in scores] == [6, 6]
