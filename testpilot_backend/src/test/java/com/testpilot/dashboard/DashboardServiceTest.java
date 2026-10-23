package com.testpilot.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseType;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {

    @Test
    void countsByKeyFillsMissingKeysWithZeroInDeclarationOrder() {
        Map<TestCaseType, Long> counts =
                DashboardService.countsByKey(TestCaseType.class, List.<Object[]>of(new Object[] {TestCaseType.EDGE, 4L}));

        assertThat(counts).containsExactly(
                Map.entry(TestCaseType.POSITIVE, 0L), Map.entry(TestCaseType.NEGATIVE, 0L), Map.entry(TestCaseType.EDGE, 4L));
    }

    @Test
    void countsByKeyAcceptsAnyNumberType() {
        Map<Priority, Long> counts =
                DashboardService.countsByKey(Priority.class, List.<Object[]>of(new Object[] {Priority.HIGH, 7}));

        assertThat(counts.get(Priority.HIGH)).isEqualTo(7L);
        assertThat(counts.get(Priority.LOW)).isZero();
    }
}
