package com.testpilot.generation;

import static com.testpilot.support.AiFixtures.aiResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.aiengine.AiEngineClient;
import com.testpilot.aiengine.AiEngineException;
import com.testpilot.aiengine.dto.AiPlaywrightRequest;
import com.testpilot.aiengine.dto.AiPlaywrightResponse;
import com.testpilot.common.BadRequestException;
import com.testpilot.generation.dto.GenerateResponse;
import com.testpilot.generation.dto.PlaywrightRequest;
import com.testpilot.story.StoryService;
import com.testpilot.story.UserStory;
import com.testpilot.testcase.Priority;
import com.testpilot.testcase.Source;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseContent;
import com.testpilot.testcase.TestCaseRepository;
import com.testpilot.testcase.TestCaseService;
import com.testpilot.testcase.TestCaseType;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

class GenerationServiceTest {

    private final StoryService storyService = mock(StoryService.class);
    private final TestCaseService testCaseService = mock(TestCaseService.class);
    private final TestCaseRepository testCases = mock(TestCaseRepository.class);
    private final GenerationRunRepository runs = mock(GenerationRunRepository.class);
    private final AiEngineClient aiEngine = mock(AiEngineClient.class);
    private final GenerationService service = new GenerationService(
            storyService, testCaseService, testCases, runs, aiEngine, mock(PlatformTransactionManager.class));

    private UserStory story;
    private GenerationRun run;

    @BeforeEach
    void setUp() {
        story = new UserStory(null, "Login", "As a user", "AC");
        ReflectionTestUtils.setField(story, "id", 9L);
        when(storyService.requireOwned(1L, 9L)).thenReturn(story);
        when(storyService.lockForUpdate(1L, 9L)).thenReturn(story);
        when(runs.save(any())).thenAnswer(inv -> {
            run = inv.getArgument(0);
            ReflectionTestUtils.setField(run, "id", 77L);
            return run;
        });
        when(runs.findById(77L)).thenAnswer(inv -> Optional.ofNullable(run));
    }

    private static TestCase existingCase(UserStory story, String title) {
        return new TestCase(story, Source.MANUAL, TestCaseContent.of(
                title, TestCaseType.POSITIVE, Priority.HIGH, null, List.of("Step"), "Result"));
    }

    @Test
    void successReplacesAiCasesAndMarksTheRunSuccessful() {
        when(aiEngine.generateTestCases(any())).thenReturn(aiResponse("AI"));
        when(testCaseService.replaceAiCases(any(), anyList())).thenAnswer(inv -> Collections.nCopies(3, existingCase(story, "x")));

        GenerateResponse response = service.generateTestCases(1L, 9L);

        assertThat(response.runId()).isEqualTo(77L);
        assertThat(response.model()).isEqualTo("claude-opus-5-5");
        assertThat(run.getStatus()).isEqualTo(GenerationStatus.SUCCESS);
        assertThat(run.getTestCaseCount()).isEqualTo(3);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TestCaseContent>> captor = ArgumentCaptor.forClass(List.class);
        verify(testCaseService).replaceAiCases(any(), captor.capture());
        assertThat(captor.getValue()).extracting(TestCaseContent::preconditions).containsOnlyNulls();
    }

    @Test
    void aiFailureMarksTheRunFailedAndDoesNotTouchTestCases() {
        when(aiEngine.generateTestCases(any())).thenThrow(new AiEngineException("x".repeat(600)));

        assertThatThrownBy(() -> service.generateTestCases(1L, 9L)).isInstanceOf(AiEngineException.class);

        assertThat(run.getStatus()).isEqualTo(GenerationStatus.FAILED);
        assertThat(run.getErrorMessage()).hasSize(500);
        verify(testCaseService, never()).replaceAiCases(any(), anyList());
    }

    @Test
    void databaseFailureAfterTheAiCallStillClosesTheRun() {
        when(aiEngine.generateTestCases(any())).thenReturn(aiResponse("AI"));
        when(testCaseService.replaceAiCases(any(), anyList())).thenThrow(new DataAccessResourceFailureException("db down"));

        assertThatThrownBy(() -> service.generateTestCases(1L, 9L)).isInstanceOf(DataAccessResourceFailureException.class);

        assertThat(run.getStatus()).isEqualTo(GenerationStatus.FAILED);
        assertThat(run.getErrorMessage()).isEqualTo("could not save generated test cases");
    }

    @Test
    void playwrightNeedsTestCases() {
        when(testCases.findByStoryOrdered(9L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.generatePlaywright(1L, 9L, null)).isInstanceOf(BadRequestException.class);
        verify(runs, never()).save(any());
    }

    @Test
    void playwrightSendsAtMostFiftyCasesAndDefaultsTheBaseUrl() {
        when(testCases.findByStoryOrdered(9L)).thenReturn(Collections.nCopies(60, existingCase(story, "Case")));
        when(aiEngine.generatePlaywright(any())).thenReturn(new AiPlaywrightResponse("mock", "script"));

        service.generatePlaywright(1L, 9L, new PlaywrightRequest("  "));

        ArgumentCaptor<AiPlaywrightRequest> captor = ArgumentCaptor.forClass(AiPlaywrightRequest.class);
        verify(aiEngine).generatePlaywright(captor.capture());
        assertThat(captor.getValue().testCases()).hasSize(GenerationService.MAX_PLAYWRIGHT_CASES);
        assertThat(captor.getValue().testCases().get(0).preconditions()).isEmpty();
        assertThat(captor.getValue().baseUrl()).isEqualTo("http://localhost:3000");
        assertThat(run.getStatus()).isEqualTo(GenerationStatus.SUCCESS);
        assertThat(run.getTestCaseCount()).isEqualTo(50);
    }
}
