package com.testpilot.dashboard;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.aiengine.AiEngineException;
import com.testpilot.support.AiFixtures;
import com.testpilot.support.ApiTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DashboardApiTest extends ApiTestSupport {

    @Test
    @DisplayName("a new user sees zero counts with every type and priority key present")
    void emptyDashboard() throws Exception {
        mvc.perform(authed(get("/api/dashboard"), registerUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectCount").value(0))
                .andExpect(jsonPath("$.storyCount").value(0))
                .andExpect(jsonPath("$.testCaseCount").value(0))
                .andExpect(jsonPath("$.byType.POSITIVE").value(0))
                .andExpect(jsonPath("$.byType.NEGATIVE").value(0))
                .andExpect(jsonPath("$.byType.EDGE").value(0))
                .andExpect(jsonPath("$.byPriority.HIGH").value(0))
                .andExpect(jsonPath("$.byPriority.MEDIUM").value(0))
                .andExpect(jsonPath("$.byPriority.LOW").value(0))
                .andExpect(jsonPath("$.recentRuns", hasSize(0)));
    }

    @Test
    @DisplayName("counts, charts and recent runs reflect only my data, newest run first")
    void dashboardWithData() throws Exception {
        String token = registerUser();
        long p1 = createProject(token, "One");
        createProject(token, "Two");
        long story = createStory(token, p1, "Login");
        createStory(token, p1, "Logout");
        createTestCase(token, story, "Manual edge", "EDGE", "LOW");
        when(aiEngine.generateTestCases(any()))
                .thenReturn(AiFixtures.aiResponse("AI"))
                .thenThrow(new AiEngineException("AI engine is unreachable"));
        mvc.perform(authed(post("/api/stories/" + story + "/generate"), token)).andExpect(status().isOk());
        mvc.perform(authed(post("/api/stories/" + story + "/generate"), token)).andExpect(status().isBadGateway());

        String other = registerUser();
        createTestCase(other, createStory(other, createProject(other, "Other"), "Other"), "x", "POSITIVE", "HIGH");

        mvc.perform(authed(get("/api/dashboard"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectCount").value(2))
                .andExpect(jsonPath("$.storyCount").value(2))
                .andExpect(jsonPath("$.testCaseCount").value(4))
                .andExpect(jsonPath("$.byType.POSITIVE").value(1))
                .andExpect(jsonPath("$.byType.NEGATIVE").value(1))
                .andExpect(jsonPath("$.byType.EDGE").value(2))
                .andExpect(jsonPath("$.byPriority.HIGH").value(1))
                .andExpect(jsonPath("$.byPriority.MEDIUM").value(1))
                .andExpect(jsonPath("$.byPriority.LOW").value(2))
                .andExpect(jsonPath("$.recentRuns", hasSize(2)))
                .andExpect(jsonPath("$.recentRuns[0].status").value("FAILED"))
                .andExpect(jsonPath("$.recentRuns[0].model").doesNotExist())
                .andExpect(jsonPath("$.recentRuns[1].status").value("SUCCESS"))
                .andExpect(jsonPath("$.recentRuns[1].storyId").value(story))
                .andExpect(jsonPath("$.recentRuns[1].storyTitle").value("Login"))
                .andExpect(jsonPath("$.recentRuns[1].kind").value("TEST_CASES"))
                .andExpect(jsonPath("$.recentRuns[1].model").value("claude-opus-5-5"))
                .andExpect(jsonPath("$.recentRuns[1].testCaseCount").value(3))
                .andExpect(jsonPath("$.recentRuns[1].durationMs").isNumber())
                .andExpect(jsonPath("$.recentRuns[1].createdAt").exists());
    }

    @Test
    @DisplayName("recent runs are limited to the last 10")
    void recentRunsLimit() throws Exception {
        String token = registerUser();
        long story = createStory(token, createProject(token, "P"), "S");
        when(aiEngine.generateTestCases(any())).thenReturn(AiFixtures.aiResponse("AI"));
        for (int i = 0; i < 12; i++) {
            mvc.perform(authed(post("/api/stories/" + story + "/generate"), token)).andExpect(status().isOk());
        }
        mvc.perform(authed(get("/api/dashboard"), token)).andExpect(jsonPath("$.recentRuns", hasSize(10)));
    }

    @Test
    void dashboardRequiresAuth() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
    }
}
