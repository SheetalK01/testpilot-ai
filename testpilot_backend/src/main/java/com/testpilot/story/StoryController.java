package com.testpilot.story;

import com.testpilot.auth.CurrentUser;
import com.testpilot.story.dto.StoryRequest;
import com.testpilot.story.dto.StoryResponse;
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
@Tag(name = "Stories", description = "User stories inside a project")
@ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
public class StoryController {

    private final StoryService storyService;
    private final CurrentUser currentUser;

    public StoryController(StoryService storyService, CurrentUser currentUser) {
        this.storyService = storyService;
        this.currentUser = currentUser;
    }

    @GetMapping("/projects/{projectId}/stories")
    @Operation(summary = "List the stories of a project, newest first, with test case counts")
    @ApiResponse(responseCode = "200", description = "Stories")
    @ApiResponse(responseCode = "404", description = "Project not found or not owned")
    public List<StoryResponse> list(@PathVariable Long projectId) {
        return storyService.list(currentUser.id(), projectId);
    }

    @PostMapping("/projects/{projectId}/stories")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a story to a project")
    @ApiResponse(responseCode = "201", description = "Created")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    @ApiResponse(responseCode = "404", description = "Project not found or not owned")
    public StoryResponse create(@PathVariable Long projectId, @Valid @RequestBody StoryRequest request) {
        return storyService.create(currentUser.id(), projectId, request);
    }

    @GetMapping("/stories/{id}")
    @Operation(summary = "Get a story")
    @ApiResponse(responseCode = "200", description = "Story")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public StoryResponse get(@PathVariable Long id) {
        return storyService.get(currentUser.id(), id);
    }

    @PutMapping("/stories/{id}")
    @Operation(summary = "Update a story")
    @ApiResponse(responseCode = "200", description = "Updated")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public StoryResponse update(@PathVariable Long id, @Valid @RequestBody StoryRequest request) {
        return storyService.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/stories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a story with its test cases and run history")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public void delete(@PathVariable Long id) {
        storyService.delete(currentUser.id(), id);
    }
}
