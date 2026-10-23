package com.testpilot.project.dto;

import java.time.Instant;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        Long storyCount,
        Long testCaseCount,
        Instant createdAt,
        Instant updatedAt) {}
