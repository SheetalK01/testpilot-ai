package com.testpilot.story;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StoryApiTest extends ApiTestSupport {

    @Test
    @DisplayName("create, list, read, update and delete stories in a project")
    void crud() throws Exception {
        String token = registerUser();
        long projectId = createProject(token, "Shop");

        String created = mvc.perform(authed(withJson(post("/api/projects/" + projectId + "/stories"), Map.of(
                                "title", "Login",
                                "description", "As a user I want to log in",
                                "acceptanceCriteria", "Valid credentials log me in")), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectId").value(projectId))
                .andExpect(jsonPath("$.title").value("Login"))
                .andExpect(jsonPath("$.acceptanceCriteria").value("Valid credentials log me in"))
                .andExpect(jsonPath("$.testCaseCount").value(0))
                .andReturn().getResponse().getContentAsString();
        long storyId = readJson(created).get("id").asLong();
        createTestCase(token, storyId, "Valid login", "POSITIVE", "HIGH");

        mvc.perform(authed(get("/api/projects/" + projectId + "/stories"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].testCaseCount").value(1));

        mvc.perform(authed(withJson(put("/api/stories/" + storyId), Map.of("title", "Sign in", "description", "Updated")), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Sign in"))
                .andExpect(jsonPath("$.acceptanceCriteria").doesNotExist());

        mvc.perform(authed(get("/api/stories/" + storyId), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Updated"));

        mvc.perform(authed(delete("/api/stories/" + storyId), token)).andExpect(status().isNoContent());
        mvc.perform(authed(get("/api/stories/" + storyId), token)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("deleting a project cascades to its stories and test cases")
    void cascadeDelete() throws Exception {
        String token = registerUser();
        long projectId = createProject(token, "Temp");
        long storyId = createStory(token, projectId, "Checkout");
        long caseId = createTestCase(token, storyId, "Pay with card", "POSITIVE", "HIGH");

        mvc.perform(authed(delete("/api/projects/" + projectId), token)).andExpect(status().isNoContent());

        mvc.perform(authed(get("/api/stories/" + storyId), token)).andExpect(status().isNotFound());
        mvc.perform(authed(withJson(put("/api/test-cases/" + caseId), testCase("x", "EDGE", "LOW")), token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("title 1-200, description 1-5000 and criteria up to 5000 characters")
    void validation() throws Exception {
        String token = registerUser();
        long projectId = createProject(token, "Shop");
        String url = "/api/projects/" + projectId + "/stories";

        mvc.perform(authed(withJson(post(url), Map.of("title", "", "description", "")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.description").exists());
        mvc.perform(authed(withJson(post(url), Map.of("title", "t".repeat(201), "description", "d")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
        mvc.perform(authed(withJson(post(url), Map.of("title", "t", "description", "d".repeat(5001))), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description").exists());
        mvc.perform(authed(withJson(post(url), Map.of("title", "t", "description", "d", "acceptanceCriteria", "a".repeat(5001))), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.acceptanceCriteria").exists());
        mvc.perform(authed(withJson(post(url), Map.of("title", "t".repeat(200), "description", "d".repeat(5000), "acceptanceCriteria", "a".repeat(5000))), token))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("another user's project and stories return 404 for every operation (IDOR)")
    void idorReturns404() throws Exception {
        String owner = registerUser();
        String intruder = registerUser();
        long projectId = createProject(owner, "Private");
        long storyId = createStory(owner, projectId, "Secret");
        Map<String, String> body = Map.of("title", "Hacked", "description", "Hacked");

        mvc.perform(authed(get("/api/projects/" + projectId + "/stories"), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(withJson(post("/api/projects/" + projectId + "/stories"), body), intruder))
                .andExpect(status().isNotFound());
        mvc.perform(authed(get("/api/stories/" + storyId), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(withJson(put("/api/stories/" + storyId), body), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(delete("/api/stories/" + storyId), intruder)).andExpect(status().isNotFound());

        mvc.perform(authed(get("/api/stories/" + storyId), owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Secret"));
    }
}
