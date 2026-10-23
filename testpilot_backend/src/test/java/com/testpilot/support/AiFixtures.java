package com.testpilot.support;

import com.testpilot.aiengine.dto.AiTestCase;
import com.testpilot.aiengine.dto.AiTestCasesResponse;
import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseType;
import java.util.List;

/** Canned AI engine responses for tests that mock {@code AiEngineClient}. */
public final class AiFixtures {

    private AiFixtures() {}

    public static AiTestCase aiCase(String title, TestCaseType type, Priority priority) {
        return new AiTestCase(title, type, priority, "", List.of("Open the page", "Do the thing"), "It works");
    }

    /** Three cases deliberately out of priority order: LOW, HIGH, MEDIUM. */
    public static AiTestCasesResponse aiResponse(String prefix) {
        return new AiTestCasesResponse("claude-opus-5-5", List.of(
                aiCase(prefix + " low", TestCaseType.EDGE, Priority.LOW),
                aiCase(prefix + " high", TestCaseType.POSITIVE, Priority.HIGH),
                aiCase(prefix + " medium", TestCaseType.NEGATIVE, Priority.MEDIUM)));
    }
}
