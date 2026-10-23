package com.testpilot.generation;

import static com.testpilot.support.AiFixtures.aiResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.aiengine.AiEngineException;
import com.testpilot.aiengine.dto.AiPlaywrightRequest;
import com.testpilot.aiengine.dto.AiPlaywrightResponse;
import com.testpilot.aiengine.dto.AiTestCase;
import com.testpilot.support.ApiTestSupport;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;

class GenerationApiTest extends ApiTestSupport {

    @Autowired
    GenerationRunRepository runs;

    private String token;
    private long storyId;

    @BeforeEach
    void setUp() throws Exception {
        token = registerUser();
        storyId = createStory(token, createProject(token, "Shop"), "Login");
    }

    @Test
    @DisplayName("generate stores AI cases, returns them ordered by priority and logs a SUCCESS run")
    void generateSuccess() throws Exception {
        when(aiEngine.generateTestCases(any())).thenReturn(aiResponse("First"));

        mvc.perform(authed(post("/api/stories/" + storyId + "/generate"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").isNumber())
                .andExpect(jsonPath("$.model").value("claude-opus-5-5"))
                .andExpect(jsonPath("$.testCases", hasSize(3)))
                .andExpect(jsonPath("$.testCases[*].title", contains("First high", "First medium", "First low")))
                .andExpect(jsonPath("$.testCases[*].source", everyItem(is("AI"))))
                .andExpect(jsonPath("$.testCases[0].preconditions").doesNotExist());

        List<GenerationRun> logged = runs.findByStoryIdOrderByIdAsc(storyId);
        assertThat(logged).singleElement().satisfies(run -> {
            assertThat(run.getStatus()).isEqualTo(GenerationStatus.SUCCESS);
            assertThat(run.getKind()).isEqualTo(GenerationKind.TEST_CASES);
            assertThat(run.getModel()).isEqualTo("claude-opus-5-5");
            assertThat(run.getTestCaseCount()).isEqualTo(3);
            assertThat(run.getDurationMs()).isNotNull().isGreaterThanOrEqualTo(0);
        });
    }

    @Test
    @DisplayName("regenerate replaces previous AI cases but keeps MANUAL ones")
    void regenerateKeepsManual() throws Exception {
        when(aiEngine.generateTestCases(any())).thenReturn(aiResponse("First"), aiResponse("Second"));
        mvc.perform(authed(post("/api/stories/" + storyId + "/generate"), token)).andExpect(status().isOk());
        createTestCase(token, storyId, "My manual case", "EDGE", "HIGH");

        mvc.perform(authed(post("/api/stories/" + storyId + "/generate"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.testCases", hasSize(4)))
                .andExpect(jsonPath("$.testCases[*].title",
                        containsInAnyOrder("My manual case", "Second high", "Second medium", "Second low")));

        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), token))
                .andExpect(jsonPath("$[?(@.source == 'MANUAL')].title", contains("My manual case")))
                .andExpect(jsonPath("$[?(@.title =~ /First.*/)]", hasSize(0)));
    }

    @Test
    @DisplayName("AI failure returns 502, logs a FAILED run and leaves existing cases untouched")
    void generateFailure() throws Exception {
        long manual = createTestCase(token, storyId, "Existing", "POSITIVE", "HIGH");
        when(aiEngine.generateTestCases(any())).thenThrow(new AiEngineException("timed out after 120 s"));

        mvc.perform(authed(post("/api/stories/" + storyId + "/generate"), token))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.message").value("AI engine failed: timed out after 120 s"));

        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), token))
                .andExpect(jsonPath("$[*].id", contains((int) manual)));
        assertThat(runs.findByStoryIdOrderByIdAsc(storyId)).singleElement().satisfies(run -> {
            assertThat(run.getStatus()).isEqualTo(GenerationStatus.FAILED);
            assertThat(run.getErrorMessage()).isEqualTo("timed out after 120 s");
            assertThat(run.getModel()).isNull();
        });
    }

    @Test
    @DisplayName("generate on another user's story is 404 and never calls the AI engine")
    void generateIdor() throws Exception {
        mvc.perform(authed(post("/api/stories/" + storyId + "/generate"), registerUser()))
                .andExpect(status().isNotFound());
        mvc.perform(authed(post("/api/stories/" + storyId + "/playwright"), registerUser()))
                .andExpect(status().isNotFound());
        verifyNoInteractions(aiEngine);
        assertThat(runs.findByStoryIdOrderByIdAsc(storyId)).isEmpty();
    }

    @Test
    @DisplayName("playwright without test cases is a 400 and logs no run")
    void playwrightWithoutCases() throws Exception {
        mvc.perform(authed(post("/api/stories/" + storyId + "/playwright"), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Generate or add test cases before creating a Playwright script"));
        verify(aiEngine, never()).generatePlaywright(any());
        assertThat(runs.findByStoryIdOrderByIdAsc(storyId)).isEmpty();
    }

    @Test
    @DisplayName("playwright sends the story, ordered cases and default base URL, and returns the script")
    void playwrightSuccess() throws Exception {
        createTestCase(token, storyId, "Low one", "EDGE", "LOW");
        createTestCase(token, storyId, "High one", "POSITIVE", "HIGH");
        when(aiEngine.generatePlaywright(any())).thenReturn(new AiPlaywrightResponse("claude-opus-5-5", "test('x', () => {});"));

        mvc.perform(authed(post("/api/stories/" + storyId + "/playwright"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").isNumber())
                .andExpect(jsonPath("$.model").value("claude-opus-5-5"))
                .andExpect(jsonPath("$.script").value("test('x', () => {});"));

        ArgumentCaptor<AiPlaywrightRequest> captor = ArgumentCaptor.forClass(AiPlaywrightRequest.class);
        verify(aiEngine).generatePlaywright(captor.capture());
        assertThat(captor.getValue().baseUrl()).isEqualTo("http://localhost:3000");
        assertThat(captor.getValue().story().title()).isEqualTo("Login");
        assertThat(captor.getValue().testCases()).extracting(AiTestCase::title).containsExactly("High one", "Low one");
        assertThat(runs.findByStoryIdOrderByIdAsc(storyId)).singleElement().satisfies(run -> {
            assertThat(run.getKind()).isEqualTo(GenerationKind.PLAYWRIGHT);
            assertThat(run.getStatus()).isEqualTo(GenerationStatus.SUCCESS);
            assertThat(run.getTestCaseCount()).isEqualTo(2);
        });
    }

    @Test
    @DisplayName("playwright honours a custom base URL and rejects an invalid one")
    void playwrightBaseUrl() throws Exception {
        createTestCase(token, storyId, "Case", "POSITIVE", "HIGH");
        when(aiEngine.generatePlaywright(any())).thenReturn(new AiPlaywrightResponse("mock", "script"));

        mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/playwright"), Map.of("baseUrl", "https://shop.example.com")), token))
                .andExpect(status().isOk());
        ArgumentCaptor<AiPlaywrightRequest> captor = ArgumentCaptor.forClass(AiPlaywrightRequest.class);
        verify(aiEngine).generatePlaywright(captor.capture());
        assertThat(captor.getValue().baseUrl()).isEqualTo("https://shop.example.com");

        mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/playwright"), Map.of("baseUrl", "javascript:alert(1)")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.baseUrl").value("must be an http(s) URL"));
    }

    @Test
    @DisplayName("playwright AI failure is a 502 with a FAILED run")
    void playwrightFailure() throws Exception {
        createTestCase(token, storyId, "Case", "POSITIVE", "HIGH");
        when(aiEngine.generatePlaywright(any())).thenThrow(new AiEngineException("Model declined the request"));

        mvc.perform(authed(post("/api/stories/" + storyId + "/playwright"), token))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("AI engine failed: Model declined the request"));
        assertThat(runs.findByStoryIdOrderByIdAsc(storyId))
                .singleElement()
                .extracting(GenerationRun::getStatus)
                .isEqualTo(GenerationStatus.FAILED);
    }
}
