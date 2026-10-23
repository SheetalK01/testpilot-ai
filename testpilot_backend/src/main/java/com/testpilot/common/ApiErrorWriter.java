package com.testpilot.common;

import com.testpilot.config.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Builds {@link ApiError}s, and writes them directly for errors raised outside Spring MVC (security filters). */
@Component
public class ApiErrorWriter {

    private final ObjectMapper objectMapper;

    public ApiErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ApiError build(HttpStatus status, String message, Map<String, String> errors, HttpServletRequest request) {
        return new ApiError(
                status.value(), message, errors, request.getRequestURI(), RequestIdFilter.current(), Instant.now());
    }

    public void write(HttpServletResponse response, HttpServletRequest request, HttpStatus status, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), build(status, message, null, request));
    }
}
