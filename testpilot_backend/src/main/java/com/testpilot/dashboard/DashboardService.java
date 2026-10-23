package com.testpilot.dashboard;

import com.testpilot.dashboard.dto.DashboardResponse;
import com.testpilot.generation.GenerationRunRepository;
import com.testpilot.project.ProjectRepository;
import com.testpilot.story.UserStoryRepository;
import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseRepository;
import com.testpilot.testcase.TestCaseType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    static final int RECENT_RUNS = 10;

    private final ProjectRepository projects;
    private final UserStoryRepository stories;
    private final TestCaseRepository testCases;
    private final GenerationRunRepository runs;

    public DashboardService(
            ProjectRepository projects,
            UserStoryRepository stories,
            TestCaseRepository testCases,
            GenerationRunRepository runs) {
        this.projects = projects;
        this.stories = stories;
        this.testCases = testCases;
        this.runs = runs;
    }

    @Transactional(readOnly = true)
    public DashboardResponse get(Long userId) {
        return new DashboardResponse(
                projects.countByOwnerId(userId),
                stories.countByProjectOwnerId(userId),
                testCases.countByStoryProjectOwnerId(userId),
                countsByKey(TestCaseType.class, testCases.countByTypeForOwner(userId)),
                countsByKey(Priority.class, testCases.countByPriorityForOwner(userId)),
                runs.findRecentForOwner(userId, PageRequest.of(0, RECENT_RUNS)));
    }

    /** Every enum key is present (0 when there is no data), in declaration order, so charts stay stable. */
    static <E extends Enum<E>> Map<E, Long> countsByKey(Class<E> type, List<Object[]> rows) {
        Map<E, Long> counts = new EnumMap<>(type);
        for (E key : type.getEnumConstants()) {
            counts.put(key, 0L);
        }
        for (Object[] row : rows) {
            counts.put(type.cast(row[0]), ((Number) row[1]).longValue());
        }
        return counts;
    }
}
