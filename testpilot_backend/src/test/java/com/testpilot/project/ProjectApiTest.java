package com.testpilot.project;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProjectApiTest extends ApiTestSupport {

    @Test
    @DisplayName("create, read, update and delete a project")
    void crud() throws Exception {
        String token = registerUser();

        String created = mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", "  Web Shop  ", "description", "Checkout flows")), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Web Shop"))
                .andExpect(jsonPath("$.description").value("Checkout flows"))
                .andExpect(jsonPath("$.storyCount").value(0))
                .andExpect(jsonPath("$.testCaseCount").value(0))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.owner").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long id = readJson(created).get("id").asLong();

        mvc.perform(authed(get("/api/projects/" + id), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));

        mvc.perform(authed(withJson(put("/api/projects/" + id), Map.of("name", "Web Shop v2", "description", "  ")), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Web Shop v2"))
                .andExpect(jsonPath("$.description").doesNotExist());

        mvc.perform(authed(delete("/api/projects/" + id), token)).andExpect(status().isNoContent());
        mvc.perform(authed(get("/api/projects/" + id), token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Project not found"));
    }

    @Test
    @DisplayName("list returns only my projects, newest first, with story and test case counts")
    void listWithCounts() throws Exception {
        String token = registerUser();
        long older = createProject(token, "Older");
        long newer = createProject(token, "Newer");
        long story = createStory(token, older, "Login");
        createStory(token, older, "Logout");
        createTestCase(token, story, "Valid login", "POSITIVE", "HIGH");
        createProject(registerUser(), "Someone else's");

        mvc.perform(authed(get("/api/projects"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(newer))
                .andExpect(jsonPath("$[1].id").value(older))
                .andExpect(jsonPath("$[1].storyCount").value(2))
                .andExpect(jsonPath("$[1].testCaseCount").value(1))
                .andExpect(jsonPath("$[0].storyCount").value(0));
    }

    @Test
    @DisplayName("name is required and limited to 120 characters; description to 1000")
    void validation() throws Exception {
        String token = registerUser();
        mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", "   ")), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
        mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", "x".repeat(121))), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").value("size must be between 0 and 120"));
        mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", "x".repeat(120), "description", "d".repeat(1001))), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description").exists())
                .andExpect(jsonPath("$.errors.name").doesNotExist());
        Map<String, Object> nullName = new HashMap<>();
        nullName.put("name", null);
        mvc.perform(authed(withJson(post("/api/projects"), nullName), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
        mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", "x".repeat(120))), token))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("another user's project is invisible: GET, PUT and DELETE all return 404 (IDOR)")
    void idorReturns404() throws Exception {
        String owner = registerUser();
        String intruder = registerUser();
        long id = createProject(owner, "Private");

        mvc.perform(authed(get("/api/projects/" + id), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(withJson(put("/api/projects/" + id), Map.of("name", "Hacked")), intruder))
                .andExpect(status().isNotFound());
        mvc.perform(authed(delete("/api/projects/" + id), intruder)).andExpect(status().isNotFound());
        mvc.perform(authed(get("/api/projects/" + id), owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Private"));
    }

    @Test
    @DisplayName("non-numeric id is a 400 and a missing id is a 404")
    void badIds() throws Exception {
        String token = registerUser();
        mvc.perform(authed(get("/api/projects/abc"), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid value for parameter 'id'"));
        mvc.perform(authed(get("/api/projects/999999"), token)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("projects require authentication")
    void requiresAuth() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
        mvc.perform(withJson(post("/api/projects"), Map.of("name", "x"))).andExpect(status().isUnauthorized());
    }
}
