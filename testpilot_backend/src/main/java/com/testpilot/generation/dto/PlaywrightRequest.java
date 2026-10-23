package com.testpilot.generation.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PlaywrightRequest(
        @Size(max = 500) @Pattern(regexp = "^https?://\\S+$", message = "must be an http(s) URL") String baseUrl) {

    public static final String DEFAULT_BASE_URL = "http://localhost:3000";

    public String baseUrlOrDefault() {
        return baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl.trim();
    }
}
