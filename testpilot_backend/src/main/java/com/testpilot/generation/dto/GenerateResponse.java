package com.testpilot.generation.dto;

import com.testpilot.testcase.dto.TestCaseResponse;
import java.util.List;

/** Result of an AI generation: the run that was logged and the story's full, ordered test case list. */
public record GenerateResponse(Long runId, String model, List<TestCaseResponse> testCases) {}
