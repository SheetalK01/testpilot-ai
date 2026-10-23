package com.testpilot.testcase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.common.NotFoundException;
import com.testpilot.story.StoryService;
import com.testpilot.story.UserStory;
import com.testpilot.testcase.dto.TestCaseRequest;
import com.testpilot.testcase.dto.TestCaseResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;

class TestCaseServiceTest {

    private final TestCaseRepository testCases = mock(TestCaseRepository.class);
    private final StoryService storyService = mock(StoryService.class);
    private final TestCaseService service = new TestCaseService(testCases, storyService);
    private UserStory story;

    @BeforeEach
    void setUp() {
        story = new UserStory(null, "Login", "desc", null);
        ReflectionTestUtils.setField(story, "id", 9L);
        when(testCases.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static TestCaseRequest request(String title) {
        return new TestCaseRequest(title, TestCaseType.NEGATIVE, Priority.MEDIUM, " ", List.of("Step one", "Step\r\ntwo"), "Error shown");
    }

    @Test
    void createIsAlwaysManualAndNormalisesSteps() {
        when(storyService.requireOwned(1L, 9L)).thenReturn(story);

        TestCaseResponse response = service.create(1L, 9L, request(" Bad password "));

        assertThat(response.source()).isEqualTo(Source.MANUAL);
        assertThat(response.title()).isEqualTo("Bad password");
        assertThat(response.preconditions()).isNull();
        assertThat(response.steps()).containsExactly("Step one", "Step two");
        assertThat(response.storyId()).isEqualTo(9L);
    }

    @Test
    void updateKeepsTheOriginalSource() {
        TestCase aiCase = new TestCase(story, Source.AI, request("Original").toContent());
        when(testCases.findOwned(4L, 1L)).thenReturn(Optional.of(aiCase));

        TestCaseResponse response = service.update(1L, 4L, request("Edited"));

        assertThat(response.title()).isEqualTo("Edited");
        assertThat(response.source()).isEqualTo(Source.AI);
    }

    @Test
    void replaceAiCasesSkipsTheDeleteWhenThereAreNoAiCases() {
        when(testCases.findIdsByStoryIdAndSource(9L, Source.AI)).thenReturn(List.of());

        service.replaceAiCases(story, List.of(request("First AI").toContent()));

        verify(testCases, never()).deleteAllByIdInBatch(any());
    }

    @Test
    void notOwnedTestCaseIsNotFound() {
        when(testCases.findOwned(4L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(2L, 4L, request("x"))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.delete(2L, 4L)).isInstanceOf(NotFoundException.class);
        verify(testCases, never()).delete(any());
    }

    @Test
    void listChecksOwnershipAndMapsEntities() {
        when(storyService.requireOwned(1L, 9L)).thenReturn(story);
        when(testCases.findByStoryOrdered(9L)).thenReturn(List.of(new TestCase(story, Source.AI, request("A").toContent())));

        assertThat(service.list(1L, 9L)).extracting(TestCaseResponse::title).containsExactly("A");
    }

    @Test
    void replaceAiCasesDeletesOnlyAiCasesByIdBeforeSavingTheNewOnes() {
        when(testCases.findIdsByStoryIdAndSource(9L, Source.AI)).thenReturn(List.of(4L, 5L));
        when(testCases.saveAllAndFlush(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<TestCase> saved = service.replaceAiCases(story, List.of(request("New AI").toContent()));

        InOrder order = inOrder(testCases);
        order.verify(testCases).findIdsByStoryIdAndSource(9L, Source.AI);
        order.verify(testCases).deleteAllByIdInBatch(List.of(4L, 5L));
        order.verify(testCases).saveAllAndFlush(anyList());
        assertThat(saved).singleElement().satisfies(tc -> assertThat(tc.getSource()).isEqualTo(Source.AI));
    }
}
