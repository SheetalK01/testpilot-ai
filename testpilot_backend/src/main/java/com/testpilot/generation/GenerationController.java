package com.testpilot.generation;

import com.testpilot.auth.CurrentUser;
import com.testpilot.generation.dto.GenerateResponse;
import com.testpilot.generation.dto.PlaywrightRequest;
import com.testpilot.generation.dto.PlaywrightResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stories/{storyId}")
@Tag(name = "AI generation", description = "Generate test cases and Playwright scripts with Claude")
@ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
@ApiResponse(responseCode = "404", description = "Story not found or not owned")
@ApiResponse(responseCode = "502", description = "AI engine failed (timeout, error or invalid output)")
public class GenerationController {

    private final GenerationService generationService;
    private final CurrentUser currentUser;

    public GenerationController(GenerationService generationService, CurrentUser currentUser) {
        this.generationService = generationService;
        this.currentUser = currentUser;
    }

    @PostMapping("/generate")
    @Operation(
            summary = "Generate test cases with AI",
            description = "Replaces the story's AI-generated test cases and keeps MANUAL ones. "
                    + "Returns the run id, the model and the story's full test case list.")
    @ApiResponse(responseCode = "200", description = "Generated")
    public GenerateResponse generate(@PathVariable Long storyId) {
        return generationService.generateTestCases(currentUser.id(), storyId);
    }

    @PostMapping("/playwright")
    @Operation(
            summary = "Generate a Playwright script from the story's test cases",
            description = "The script is returned, not stored. baseUrl defaults to http://localhost:3000.")
    @ApiResponse(responseCode = "200", description = "Generated")
    @ApiResponse(responseCode = "400", description = "Story has no test cases, or baseUrl is invalid")
    public PlaywrightResponse playwright(
            @PathVariable Long storyId, @Valid @RequestBody(required = false) PlaywrightRequest request) {
        return generationService.generatePlaywright(currentUser.id(), storyId, request);
    }
}
