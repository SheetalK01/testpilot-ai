package com.testpilot.story.dto;

import java.time.Instant;

public record StoryResponse(
        Long id,
        Long projectId,
        String title,
        String description,
        String acceptanceCriteria,
        Long testCaseCount,
        Instant createdAt,
        Instant updatedAt) {}
