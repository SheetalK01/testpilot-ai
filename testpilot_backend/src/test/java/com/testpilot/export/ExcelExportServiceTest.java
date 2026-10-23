package com.testpilot.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class ExcelExportServiceTest {

    @Test
    void slugIsFileSafe() {
        assertThat(ExcelExportService.slug("Login & Sign-up!")).isEqualTo("login-sign-up");
        assertThat(ExcelExportService.slug("Café Überweisung")).isEqualTo("cafe-uberweisung");
        assertThat(ExcelExportService.slug("../../etc/passwd")).isEqualTo("etc-passwd");
        assertThat(ExcelExportService.slug("!!!")).isEqualTo("story");
        assertThat(ExcelExportService.slug("a".repeat(100))).hasSize(60);
    }

    @Test
    void stepsAreNumberedOnSeparateLines() {
        assertThat(ExcelExportService.numberedSteps(List.of("Open", "Click"))).isEqualTo("1. Open\n2. Click");
        assertThat(ExcelExportService.numberedSteps(List.of())).isEmpty();
    }
}
