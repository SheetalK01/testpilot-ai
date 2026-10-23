package com.testpilot.project;

import com.testpilot.auth.CurrentUser;
import com.testpilot.project.dto.ProjectRequest;
import com.testpilot.project.dto.ProjectResponse;
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
@RequestMapping("/api/projects")
@Tag(name = "Projects", description = "Projects owned by the current user")
@ApiResponse(responseCode = "401", description = "Missing, invalid or expired token")
public class ProjectController {

    private final ProjectService projectService;
    private final CurrentUser currentUser;

    public ProjectController(ProjectService projectService, CurrentUser currentUser) {
        this.projectService = projectService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "List my projects, newest first, with story and test case counts")
    @ApiResponse(responseCode = "200", description = "Projects")
    public List<ProjectResponse> list() {
        return projectService.list(currentUser.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project")
    @ApiResponse(responseCode = "201", description = "Created")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    public ProjectResponse create(@Valid @RequestBody ProjectRequest request) {
        return projectService.create(currentUser.id(), request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project")
    @ApiResponse(responseCode = "200", description = "Project")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public ProjectResponse get(@PathVariable Long id) {
        return projectService.get(currentUser.id(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a project")
    @ApiResponse(responseCode = "200", description = "Updated")
    @ApiResponse(responseCode = "400", description = "Validation failed")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request) {
        return projectService.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a project with all its stories and test cases")
    @ApiResponse(responseCode = "204", description = "Deleted")
    @ApiResponse(responseCode = "404", description = "Not found or not owned")
    public void delete(@PathVariable Long id) {
        projectService.delete(currentUser.id(), id);
    }
}
