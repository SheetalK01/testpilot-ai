package com.testpilot.dashboard.dto;

import com.testpilot.generation.GenerationKind;
import com.testpilot.generation.GenerationStatus;
import java.time.Instant;

public record RecentRun(
        Long id,
        Long storyId,
        String storyTitle,
        GenerationKind kind,
        GenerationStatus status,
        String model,
        Integer testCaseCount,
        Integer durationMs,
        Instant createdAt) {}
