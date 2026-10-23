package com.testpilot.aiengine.dto;

import java.util.List;

public record AiPlaywrightRequest(AiStory story, List<AiTestCase> testCases, String baseUrl) {}
