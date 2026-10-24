package com.testpilot.demo;

import com.testpilot.auth.dto.AuthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/demo")
@Tag(name = "Demo", description = "Throwaway demo accounts for the public live demo")
public class DemoController {

    private final DemoService demoService;

    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/session")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements
    @Operation(
            summary = "Start a demo session",
            description = "Creates a private, temporary account with sample data and returns its JWT. "
                    + "Demo accounts are deleted after DEMO_TTL_HOURS (default 24).")
    @ApiResponse(responseCode = "201", description = "Demo account created")
    @ApiResponse(responseCode = "404", description = "Demo mode is disabled")
    @ApiResponse(responseCode = "429", description = "Too many demo sessions in the last hour")
    public AuthResponse start() {
        return demoService.startSession();
    }
}
