package com.testpilot.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.auth.User;
import com.testpilot.auth.UserRepository;
import com.testpilot.common.NotFoundException;
import com.testpilot.project.dto.ProjectRequest;
import com.testpilot.project.dto.ProjectResponse;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class ProjectServiceTest {

    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ProjectService service = new ProjectService(projects, users);

    private static ProjectResponse summary(long id, String name) {
        return new ProjectResponse(id, name, null, 0L, 0L, Instant.now(), Instant.now());
    }

    @Test
    void listDelegatesToOwnerScopedQuery() {
        when(projects.findSummariesByOwner(1L)).thenReturn(List.of(summary(5, "A")));

        assertThat(service.list(1L)).extracting(ProjectResponse::name).containsExactly("A");
    }

    @Test
    void createTrimsNameAndStoresBlankDescriptionAsNull() {
        when(users.getReferenceById(1L)).thenReturn(new User("Ada", "ada@example.com", "h"));
        when(projects.save(any())).thenAnswer(inv -> {
            Project p = inv.getArgument(0);
            ReflectionTestUtils.setField(p, "id", 5L);
            return p;
        });
        when(projects.findSummary(5L, 1L)).thenReturn(Optional.of(summary(5, "Shop")));

        ProjectResponse response = service.create(1L, new ProjectRequest("  Shop ", "   "));

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projects).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Shop");
        assertThat(captor.getValue().getDescription()).isNull();
        assertThat(response.id()).isEqualTo(5L);
    }

    @Test
    void updateChangesOwnedProject() {
        Project project = new Project(null, "Old", "old");
        when(projects.findByIdAndOwnerId(5L, 1L)).thenReturn(Optional.of(project));
        when(projects.findSummary(5L, 1L)).thenReturn(Optional.of(summary(5, "New")));

        service.update(1L, 5L, new ProjectRequest("New", " new desc "));

        assertThat(project.getName()).isEqualTo("New");
        assertThat(project.getDescription()).isEqualTo("new desc");
    }

    @Test
    void notOwnedProjectIsNotFoundForEveryOperation() {
        when(projects.findByIdAndOwnerId(5L, 2L)).thenReturn(Optional.empty());
        when(projects.findSummary(5L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(2L, 5L)).isInstanceOf(NotFoundException.class).hasMessage("Project not found");
        assertThatThrownBy(() -> service.update(2L, 5L, new ProjectRequest("x", null))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.delete(2L, 5L)).isInstanceOf(NotFoundException.class);
        verify(projects, never()).delete(any());
    }

    @Test
    void deleteRemovesOwnedProject() {
        Project project = new Project(null, "Shop", null);
        when(projects.findByIdAndOwnerId(5L, 1L)).thenReturn(Optional.of(project));

        service.delete(1L, 5L);

        verify(projects).delete(project);
    }
}
