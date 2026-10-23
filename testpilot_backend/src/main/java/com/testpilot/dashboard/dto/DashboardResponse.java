package com.testpilot.dashboard.dto;

import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseType;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        long projectCount,
        long storyCount,
        long testCaseCount,
        Map<TestCaseType, Long> byType,
        Map<Priority, Long> byPriority,
        List<RecentRun> recentRuns) {}
