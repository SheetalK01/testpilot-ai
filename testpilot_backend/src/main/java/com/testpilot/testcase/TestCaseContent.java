package com.testpilot.testcase;

import static com.testpilot.common.Text.blankToNull;

import java.util.List;

/**
 * The editable content of a test case, normalised: trimmed text, blank optional fields as null and
 * one single-line step per entry (steps are persisted newline-separated).
 */
public record TestCaseContent(
        String title,
        TestCaseType type,
        Priority priority,
        String preconditions,
        List<String> steps,
        String expectedResult) {

    public static TestCaseContent of(
            String title,
            TestCaseType type,
            Priority priority,
            String preconditions,
            List<String> steps,
            String expectedResult) {
        List<String> cleanSteps = steps.stream()
                .map(step -> step.replaceAll("\\s*\\R\\s*", " ").trim())
                .filter(step -> !step.isEmpty())
                .toList();
        return new TestCaseContent(
                title.trim(), type, priority, blankToNull(preconditions), cleanSteps, expectedResult.trim());
    }
}
