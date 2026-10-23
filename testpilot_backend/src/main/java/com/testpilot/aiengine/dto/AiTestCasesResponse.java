package com.testpilot.aiengine.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AiTestCasesResponse(
        @NotBlank String model, @NotEmpty @Size(max = 50) List<@Valid AiTestCase> testCases) {}
