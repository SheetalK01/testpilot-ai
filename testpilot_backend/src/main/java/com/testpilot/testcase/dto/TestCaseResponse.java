package com.testpilot.testcase.dto;

import com.testpilot.testcase.Priority;
import com.testpilot.testcase.Source;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseType;
import java.time.Instant;
import java.util.List;

public record TestCaseResponse(
        Long id,
        Long storyId,
        String title,
        TestCaseType type,
        Priority priority,
        String preconditions,
        List<String> steps,
        String expectedResult,
        Source source,
        Instant createdAt,
        Instant updatedAt) {

    public static TestCaseResponse from(TestCase tc) {
        return new TestCaseResponse(
                tc.getId(),
                tc.getStory().getId(),
                tc.getTitle(),
                tc.getType(),
                tc.getPriority(),
                tc.getPreconditions(),
                tc.getStepList(),
                tc.getExpectedResult(),
                tc.getSource(),
                tc.getCreatedAt(),
                tc.getUpdatedAt());
    }
}
