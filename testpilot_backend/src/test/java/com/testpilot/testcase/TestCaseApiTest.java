package com.testpilot.testcase;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TestCaseApiTest extends ApiTestSupport {

    private String token;
    private long storyId;

    @BeforeEach
    void setUp() throws Exception {
        token = registerUser();
        storyId = createStory(token, createProject(token, "Shop"), "Login");
    }

    @Test
    @DisplayName("manual test case is created with source MANUAL and steps as a list")
    void createManual() throws Exception {
        Map<String, Object> body = new HashMap<>(testCase("Login with valid credentials", "POSITIVE", "HIGH"));
        body.put("steps", List.of("  Open /login ", "Enter valid email\nand password", "Click Log in"));

        mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/test-cases"), body), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.storyId").value(storyId))
                .andExpect(jsonPath("$.source").value("MANUAL"))
                .andExpect(jsonPath("$.type").value("POSITIVE"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.steps", contains("Open /login", "Enter valid email and password", "Click Log in")))
                .andExpect(jsonPath("$.expectedResult").value("Dashboard is shown"));
    }

    @Test
    @DisplayName("list is ordered HIGH → MEDIUM → LOW, then by id")
    void ordering() throws Exception {
        long low = createTestCase(token, storyId, "low", "EDGE", "LOW");
        long high1 = createTestCase(token, storyId, "high1", "POSITIVE", "HIGH");
        long medium = createTestCase(token, storyId, "medium", "NEGATIVE", "MEDIUM");
        long high2 = createTestCase(token, storyId, "high2", "NEGATIVE", "HIGH");

        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[*].id", contains((int) high1, (int) high2, (int) medium, (int) low)));
    }

    @Test
    @DisplayName("update changes the content but keeps the source; delete removes the case")
    void updateAndDelete() throws Exception {
        long id = createTestCase(token, storyId, "Original", "POSITIVE", "HIGH");

        mvc.perform(authed(withJson(put("/api/test-cases/" + id), testCase("Edited", "EDGE", "LOW")), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited"))
                .andExpect(jsonPath("$.type").value("EDGE"))
                .andExpect(jsonPath("$.priority").value("LOW"))
                .andExpect(jsonPath("$.source").value("MANUAL"));

        mvc.perform(authed(delete("/api/test-cases/" + id), token)).andExpect(status().isNoContent());
        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), token)).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(authed(delete("/api/test-cases/" + id), token)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("steps: at least 1, at most 30, none blank, each up to 500 characters")
    void stepValidation() throws Exception {
        String url = "/api/stories/" + storyId + "/test-cases";
        Map<String, Object> body = new HashMap<>(testCase("t", "POSITIVE", "HIGH"));

        body.put("steps", List.of());
        mvc.perform(authed(withJson(post(url), body), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.steps").exists());

        body.put("steps", Collections.nCopies(31, "step"));
        mvc.perform(authed(withJson(post(url), body), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.steps").exists());

        body.put("steps", List.of("ok", " "));
        mvc.perform(authed(withJson(post(url), body), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['steps[1]']").exists());

        body.put("steps", List.of("s".repeat(501)));
        mvc.perform(authed(withJson(post(url), body), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['steps[0]']").exists());

        body.put("steps", Collections.nCopies(30, "s".repeat(500)));
        mvc.perform(authed(withJson(post(url), body), token)).andExpect(status().isCreated());
    }

    @Test
    @DisplayName("unknown enum values and missing fields return 400 with field errors")
    void enumAndRequiredValidation() throws Exception {
        String url = "/api/stories/" + storyId + "/test-cases";
        Map<String, Object> badType = new HashMap<>(testCase("t", "POSITIVE", "HIGH"));
        badType.put("type", "SMOKE");
        mvc.perform(authed(withJson(post(url), badType), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").value("must be one of [POSITIVE, NEGATIVE, EDGE]"));

        Map<String, Object> badPriority = new HashMap<>(testCase("t", "POSITIVE", "HIGH"));
        badPriority.put("priority", "URGENT");
        mvc.perform(authed(withJson(post(url), badPriority), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.priority").value("must be one of [HIGH, MEDIUM, LOW]"));

        mvc.perform(authed(withJson(post(url), Map.of("title", "x".repeat(256))), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.type").exists())
                .andExpect(jsonPath("$.errors.priority").exists())
                .andExpect(jsonPath("$.errors.steps").exists())
                .andExpect(jsonPath("$.errors.expectedResult").exists());
    }

    @Test
    @DisplayName("another user's test cases return 404 for list, create, update and delete (IDOR)")
    void idorReturns404() throws Exception {
        long id = createTestCase(token, storyId, "Mine", "POSITIVE", "HIGH");
        String intruder = registerUser();

        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/test-cases"), testCase("x", "EDGE", "LOW")), intruder))
                .andExpect(status().isNotFound());
        mvc.perform(authed(withJson(put("/api/test-cases/" + id), testCase("x", "EDGE", "LOW")), intruder))
                .andExpect(status().isNotFound());
        mvc.perform(authed(delete("/api/test-cases/" + id), intruder)).andExpect(status().isNotFound());

        mvc.perform(authed(get("/api/stories/" + storyId + "/test-cases"), token))
                .andExpect(jsonPath("$[0].title").value("Mine"));
    }
}
