package com.testpilot.dashboard;

import com.testpilot.auth.CurrentUser;
import com.testpilot.dashboard.dto.DashboardResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Dashboard", description = "Totals, charts and recent AI runs for the current user")
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUser currentUser;

    public DashboardController(DashboardService dashboardService, CurrentUser currentUser) {
        this.dashboardService = dashboardService;
        this.currentUser = currentUser;
    }

    @GetMapping("/api/dashboard")
    @Operation(summary = "Get counts, test cases by type and priority, and the last 10 AI runs")
    @ApiResponse(responseCode = "200", description = "Dashboard")
    @ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
    public DashboardResponse get() {
        return dashboardService.get(currentUser.id());
    }
}
