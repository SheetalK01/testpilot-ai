package com.testpilot.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/** The single error shape returned by every endpoint. Field errors are only present for 400s. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        int status, String message, Map<String, String> errors, String path, String requestId, Instant timestamp) {}
