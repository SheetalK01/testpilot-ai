package com.testpilot.generation;

import com.testpilot.aiengine.AiEngineClient;
import com.testpilot.aiengine.AiEngineException;
import com.testpilot.aiengine.dto.AiPlaywrightRequest;
import com.testpilot.aiengine.dto.AiPlaywrightResponse;
import com.testpilot.aiengine.dto.AiStory;
import com.testpilot.aiengine.dto.AiTestCase;
import com.testpilot.aiengine.dto.AiTestCasesResponse;
import com.testpilot.common.BadRequestException;
import com.testpilot.generation.dto.GenerateResponse;
import com.testpilot.generation.dto.PlaywrightRequest;
import com.testpilot.generation.dto.PlaywrightResponse;
import com.testpilot.story.StoryService;
import com.testpilot.story.UserStory;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseRepository;
import com.testpilot.testcase.TestCaseService;
import java.util.List;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Runs AI generations and logs each one as a {@link GenerationRun}.
 *
 * <p>Transactions are explicit and short: the RUNNING run is committed before the AI call, the AI call
 * itself (up to two minutes) holds no database connection, and the result is applied in a second
 * transaction. If the AI call fails, the run is marked FAILED and existing test cases are untouched.
 */
@Service
public class GenerationService {

    /** The AI engine accepts at most this many cases when writing a Playwright script. */
    static final int MAX_PLAYWRIGHT_CASES = 50;

    private static final Logger log = LoggerFactory.getLogger(GenerationService.class);

    private final StoryService storyService;
    private final TestCaseService testCaseService;
    private final TestCaseRepository testCases;
    private final GenerationRunRepository runs;
    private final AiEngineClient aiEngine;
    private final TransactionTemplate tx;

    public GenerationService(
            StoryService storyService,
            TestCaseService testCaseService,
            TestCaseRepository testCases,
            GenerationRunRepository runs,
            AiEngineClient aiEngine,
            PlatformTransactionManager transactionManager) {
        this.storyService = storyService;
        this.testCaseService = testCaseService;
        this.testCases = testCases;
        this.runs = runs;
        this.aiEngine = aiEngine;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public GenerateResponse generateTestCases(Long userId, Long storyId) {
        Started<AiStory> started = tx.execute(status -> {
            UserStory story = storyService.requireOwned(userId, storyId);
            return new Started<>(startRun(story, GenerationKind.TEST_CASES), toAiStory(story));
        });

        long startNanos = System.nanoTime();
        AiTestCasesResponse response = callAi(started.runId(), startNanos, () -> aiEngine.generateTestCases(started.input()));
        long durationMs = elapsedMs(startNanos);

        try {
            tx.executeWithoutResult(status -> {
                UserStory story = storyService.requireOwned(userId, storyId);
                List<TestCase> saved = testCaseService.replaceAiCases(
                        story, response.testCases().stream().map(AiTestCase::toContent).toList());
                runs.findById(started.runId()).ifPresent(run -> run.succeed(response.model(), saved.size(), durationMs));
            });
        } catch (RuntimeException e) {
            markFailed(started.runId(), "could not save generated test cases", durationMs);
            throw e;
        }
        log.info("Generated {} test cases for story {} with {} in {} ms",
                response.testCases().size(), storyId, response.model(), durationMs);
        return new GenerateResponse(started.runId(), response.model(), testCaseService.list(userId, storyId));
    }

    public PlaywrightResponse generatePlaywright(Long userId, Long storyId, PlaywrightRequest request) {
        String baseUrl = request == null ? PlaywrightRequest.DEFAULT_BASE_URL : request.baseUrlOrDefault();
        Started<AiPlaywrightRequest> started = tx.execute(status -> {
            UserStory story = storyService.requireOwned(userId, storyId);
            List<AiTestCase> cases = testCases.findByStoryOrdered(storyId).stream()
                    .limit(MAX_PLAYWRIGHT_CASES)
                    .map(AiTestCase::from)
                    .toList();
            if (cases.isEmpty()) {
                throw new BadRequestException("Generate or add test cases before creating a Playwright script");
            }
            AiPlaywrightRequest aiRequest = new AiPlaywrightRequest(toAiStory(story), cases, baseUrl);
            return new Started<>(startRun(story, GenerationKind.PLAYWRIGHT), aiRequest);
        });

        long startNanos = System.nanoTime();
        AiPlaywrightResponse response = callAi(started.runId(), startNanos, () -> aiEngine.generatePlaywright(started.input()));
        long durationMs = elapsedMs(startNanos);
        int caseCount = started.input().testCases().size();
        tx.executeWithoutResult(status ->
                runs.findById(started.runId()).ifPresent(run -> run.succeed(response.model(), caseCount, durationMs)));
        return new PlaywrightResponse(started.runId(), response.model(), response.script());
    }

    private Long startRun(UserStory story, GenerationKind kind) {
        return runs.save(new GenerationRun(story, kind)).getId();
    }

    private <T> T callAi(Long runId, long startNanos, Supplier<T> call) {
        try {
            return call.get();
        } catch (AiEngineException e) {
            log.warn("AI generation failed for run {}: {}", runId, e.getMessage());
            markFailed(runId, e.getMessage(), elapsedMs(startNanos));
            throw e;
        }
    }

    private void markFailed(Long runId, String reason, long durationMs) {
        tx.executeWithoutResult(status -> runs.findById(runId).ifPresent(run -> run.fail(reason, durationMs)));
    }

    private static AiStory toAiStory(UserStory story) {
        return new AiStory(story.getTitle(), story.getDescription(), story.getAcceptanceCriteria());
    }

    private static long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }

    private record Started<T>(Long runId, T input) {}
}
