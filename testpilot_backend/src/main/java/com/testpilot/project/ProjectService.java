package com.testpilot.project;

import static com.testpilot.common.Text.blankToNull;

import com.testpilot.auth.UserRepository;
import com.testpilot.common.NotFoundException;
import com.testpilot.project.dto.ProjectRequest;
import com.testpilot.project.dto.ProjectResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private final ProjectRepository projects;
    private final UserRepository users;

    public ProjectService(ProjectRepository projects, UserRepository users) {
        this.projects = projects;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(Long userId) {
        return projects.findSummariesByOwner(userId);
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(Long userId, Long projectId) {
        return projects.findSummary(projectId, userId).orElseThrow(ProjectService::notFound);
    }

    @Transactional
    public ProjectResponse create(Long userId, ProjectRequest request) {
        Project project = projects.save(
                new Project(users.getReferenceById(userId), request.name().trim(), blankToNull(request.description())));
        projects.flush();
        return get(userId, project.getId());
    }

    @Transactional
    public ProjectResponse update(Long userId, Long projectId, ProjectRequest request) {
        requireOwned(userId, projectId).update(request.name().trim(), blankToNull(request.description()));
        projects.flush();
        return get(userId, projectId);
    }

    @Transactional
    public void delete(Long userId, Long projectId) {
        // Stories, test cases and runs are removed by ON DELETE CASCADE in the database.
        projects.delete(requireOwned(userId, projectId));
    }

    /**
     * Loads a project only if it belongs to the user; anything else is a 404 so IDs are not leaked.
     * Always called inside a caller's transaction.
     */
    public Project requireOwned(Long userId, Long projectId) {
        return projects.findByIdAndOwnerId(projectId, userId).orElseThrow(ProjectService::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Project");
    }
}
