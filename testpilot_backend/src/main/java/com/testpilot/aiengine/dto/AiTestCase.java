package com.testpilot.aiengine.dto;

import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseContent;
import com.testpilot.testcase.TestCaseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * A test case as exchanged with the AI engine. The constraints mirror the public API's, so AI output
 * is held to the same rules as manual input before it is stored.
 */
public record AiTestCase(
        @NotBlank @Size(max = 255) String title,
        @NotNull TestCaseType type,
        @NotNull Priority priority,
        @Size(max = 2000) String preconditions,
        @NotNull @Size(min = 1, max = 30) List<@NotBlank @Size(max = 500) String> steps,
        @NotBlank @Size(max = 2000) String expectedResult) {

    public TestCaseContent toContent() {
        return TestCaseContent.of(title, type, priority, preconditions, steps, expectedResult);
    }

    public static AiTestCase from(TestCase tc) {
        return new AiTestCase(
                tc.getTitle(),
                tc.getType(),
                tc.getPriority(),
                tc.getPreconditions() == null ? "" : tc.getPreconditions(),
                tc.getStepList(),
                tc.getExpectedResult());
    }
}
