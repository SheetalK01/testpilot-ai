package com.testpilot.story;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.common.NotFoundException;
import com.testpilot.project.Project;
import com.testpilot.project.ProjectService;
import com.testpilot.story.dto.StoryRequest;
import com.testpilot.story.dto.StoryResponse;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class StoryServiceTest {

    private final UserStoryRepository stories = mock(UserStoryRepository.class);
    private final ProjectService projectService = mock(ProjectService.class);
    private final StoryService service = new StoryService(stories, projectService);

    private static StoryResponse summary(long id) {
        return new StoryResponse(id, 3L, "Login", "desc", null, 0L, Instant.now(), Instant.now());
    }

    @Test
    void listChecksProjectOwnershipFirst() {
        when(projectService.requireOwned(1L, 3L)).thenThrow(new NotFoundException("Project"));

        assertThatThrownBy(() -> service.list(1L, 3L)).isInstanceOf(NotFoundException.class);
        verify(stories, never()).findSummariesByProject(any());
    }

    @Test
    void listReturnsStoriesOfOwnedProject() {
        when(projectService.requireOwned(1L, 3L)).thenReturn(new Project(null, "P", null));
        when(stories.findSummariesByProject(3L)).thenReturn(List.of(summary(9)));

        assertThat(service.list(1L, 3L)).hasSize(1);
    }

    @Test
    void createNormalisesFields() {
        Project project = new Project(null, "P", null);
        when(projectService.requireOwned(1L, 3L)).thenReturn(project);
        when(stories.save(any())).thenAnswer(inv -> {
            UserStory s = inv.getArgument(0);
            ReflectionTestUtils.setField(s, "id", 9L);
            return s;
        });
        when(stories.findSummary(9L, 1L)).thenReturn(Optional.of(summary(9)));

        service.create(1L, 3L, new StoryRequest(" Login ", " As a user ", "  "));

        ArgumentCaptor<UserStory> captor = ArgumentCaptor.forClass(UserStory.class);
        verify(stories).save(captor.capture());
        assertThat(captor.getValue().getTitle()).isEqualTo("Login");
        assertThat(captor.getValue().getDescription()).isEqualTo("As a user");
        assertThat(captor.getValue().getAcceptanceCriteria()).isNull();
        assertThat(captor.getValue().getProject()).isSameAs(project);
    }

    @Test
    void updateAndDeleteOwnedStory() {
        UserStory story = new UserStory(null, "Old", "old", null);
        when(stories.findOwned(9L, 1L)).thenReturn(Optional.of(story));
        when(stories.findSummary(9L, 1L)).thenReturn(Optional.of(summary(9)));

        service.update(1L, 9L, new StoryRequest("New", "new", "AC"));
        assertThat(story.getTitle()).isEqualTo("New");
        assertThat(story.getAcceptanceCriteria()).isEqualTo("AC");

        service.delete(1L, 9L);
        verify(stories).delete(story);
    }

    @Test
    void notOwnedStoryIsNotFound() {
        when(stories.findOwned(9L, 2L)).thenReturn(Optional.empty());
        when(stories.findSummary(9L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(2L, 9L)).isInstanceOf(NotFoundException.class).hasMessage("Story not found");
        assertThatThrownBy(() -> service.delete(2L, 9L)).isInstanceOf(NotFoundException.class);
        verify(stories, never()).delete(any());
    }
}
