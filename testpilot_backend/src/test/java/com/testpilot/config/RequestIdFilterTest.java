package com.testpilot.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RequestIdFilterTest {

    @Test
    void keepsSafeIncomingId() {
        assertThat(RequestIdFilter.resolveRequestId("abc-123_DEF.9")).isEqualTo("abc-123_DEF.9");
    }

    @Test
    void replacesMissingUnsafeOrOversizedIds() {
        assertThat(RequestIdFilter.resolveRequestId(null)).hasSize(36);
        assertThat(RequestIdFilter.resolveRequestId("evil\r\ninjected-log-line")).hasSize(36);
        assertThat(RequestIdFilter.resolveRequestId("x".repeat(65))).hasSize(36);
    }
}
