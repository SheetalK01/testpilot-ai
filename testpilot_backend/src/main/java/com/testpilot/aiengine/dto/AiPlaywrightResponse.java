package com.testpilot.aiengine.dto;

import jakarta.validation.constraints.NotBlank;

public record AiPlaywrightResponse(@NotBlank String model, @NotBlank String script) {}
