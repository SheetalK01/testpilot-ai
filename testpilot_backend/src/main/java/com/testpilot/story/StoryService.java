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

    /**
     * Locks the story row, then checks ownership. Used before replacing AI test cases so that two
     * generations of the same story run one after the other. The lock is taken first on purpose: in
     * MySQL (REPEATABLE READ) the transaction's snapshot then starts after the wait, so it sees the
     * cases a concurrent generation has just committed. Must be called inside a transaction.
     */
    public UserStory lockForUpdate(Long userId, Long storyId) {
        stories.lockById(storyId);
        return requireOwned(userId, storyId);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Story");
    }
}
