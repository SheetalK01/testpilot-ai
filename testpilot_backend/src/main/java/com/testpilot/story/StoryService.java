package com.testpilot.story;

import static com.testpilot.common.Text.blankToNull;

import com.testpilot.common.NotFoundException;
import com.testpilot.project.Project;
import com.testpilot.project.ProjectService;
import com.testpilot.story.dto.StoryRequest;
import com.testpilot.story.dto.StoryResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoryService {

    private final UserStoryRepository stories;
    private final ProjectService projectService;

    public StoryService(UserStoryRepository stories, ProjectService projectService) {
        this.stories = stories;
        this.projectService = projectService;
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> list(Long userId, Long projectId) {
        projectService.requireOwned(userId, projectId);
        return stories.findSummariesByProject(projectId);
    }

    @Transactional(readOnly = true)
    public StoryResponse get(Long userId, Long storyId) {
        return stories.findSummary(storyId, userId).orElseThrow(StoryService::notFound);
    }

    @Transactional
    public StoryResponse create(Long userId, Long projectId, StoryRequest request) {
        Project project = projectService.requireOwned(userId, projectId);
        UserStory story = stories.save(new UserStory(
                project, request.title().trim(), request.description().trim(), blankToNull(request.acceptanceCriteria())));
        stories.flush();
        return get(userId, story.getId());
    }

    @Transactional
    public StoryResponse update(Long userId, Long storyId, StoryRequest request) {
        requireOwned(userId, storyId)
                .update(request.title().trim(), request.description().trim(), blankToNull(request.acceptanceCriteria()));
        stories.flush();
        return get(userId, storyId);
    }

    @Transactional
    public void delete(Long userId, Long storyId) {
        // Test cases and generation runs are removed by ON DELETE CASCADE in the database.
        stories.delete(requireOwned(userId, storyId));
    }

    /** Loads a story only if its project belongs to the user; otherwise 404. Called inside a transaction. */
    public UserStory requireOwned(Long userId, Long storyId) {
        return stories.findOwned(storyId, userId).orElseThrow(StoryService::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Story");
    }
}
