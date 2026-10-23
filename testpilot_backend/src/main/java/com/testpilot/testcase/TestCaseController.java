package com.testpilot.testcase;

import com.testpilot.auth.CurrentUser;
import com.testpilot.testcase.dto.TestCaseRequest;
import com.testpilot.testcase.dto.TestCaseResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Test cases", description = "Test cases of a story (AI-generated or manual)")
@ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
public class TestCaseController {

    private final TestCaseService testCaseService;
    private final CurrentUser currentUser;

    public TestCaseController(TestCaseService testCaseService, CurrentUser currentUser) {
        this.testCaseService = testCaseService;
        this.currentUser = currentUser;
    }

    @GetMapping("/stories/{storyId}/test-cases")
    @Operation(summary = "List a story's test cases, ordered HIGH → LOW priority, then by id")
    @ApiResponse(responseCode = "200", description = "Test cases")
    @ApiResponse(responseCode = "404", description = "Story not found or not owned")
    public List<TestCaseResponse> list(@PathVariable Long storyId) {
        return testCaseService.list(currentUser.id(), storyId);
    }

    @PostMapping("/stories/{storyId}/test-cases")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a manual test case")
    @ApiResponse(responseCode = "201", description = "Created with source MANUAL")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    @ApiResponse(responseCode = "404", description = "Story not found or not owned")
    public TestCaseResponse create(@PathVariable Long storyId, @Valid @RequestBody TestCaseRequest request) {
        return testCaseService.create(currentUser.id(), storyId, request);
    }

    @PutMapping("/test-cases/{id}")
    @Operation(summary = "Edit a test case (its source is kept)")
    @ApiResponse(responseCode = "200", description = "Updated")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public TestCaseResponse update(@PathVariable Long id, @Valid @RequestBody TestCaseRequest request) {
        return testCaseService.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/test-cases/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a test case")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public void delete(@PathVariable Long id) {
        testCaseService.delete(currentUser.id(), id);
    }
}
