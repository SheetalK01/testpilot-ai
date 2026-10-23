package com.testpilot.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Base class for API integration tests: full Spring context, H2 in MySQL mode, Flyway schema, real
 * security filter chain. Every test registers its own uniquely named user, so tests are independent
 * and need no cleanup.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    protected static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    protected String toJson(Object body) {
        return json.writeValueAsString(body);
    }

    protected JsonNode readJson(String body) {
        return json.readTree(body);
    }

    protected MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder builder, Object body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(toJson(body));
    }

    protected MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    /** Registers a fresh user and returns its JWT. */
    protected String registerUser() throws Exception {
        return registerUser("Test User", uniqueEmail(), "Password123");
    }

    protected String registerUser(String name, String email, String password) throws Exception {
        String body = mvc.perform(withJson(post("/api/auth/register"), Map.of("name", name, "email", email, "password", password)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readJson(body).get("token").asString();
    }

    protected long createProject(String token, String name) throws Exception {
        String body = mvc.perform(authed(withJson(post("/api/projects"), Map.of("name", name, "description", "desc")), token))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readJson(body).get("id").asLong();
    }

    protected long createStory(String token, long projectId, String title) throws Exception {
        Map<String, Object> story = Map.of(
                "title", title,
                "description", "As a user I want to " + title.toLowerCase(),
                "acceptanceCriteria", "Valid input succeeds\nInvalid input shows an error");
        String body = mvc.perform(authed(withJson(post("/api/projects/" + projectId + "/stories"), story), token))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readJson(body).get("id").asLong();
    }

    protected long createTestCase(String token, long storyId, String title, String type, String priority) throws Exception {
        String body = mvc.perform(authed(withJson(post("/api/stories/" + storyId + "/test-cases"), testCase(title, type, priority)), token))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readJson(body).get("id").asLong();
    }

    protected static Map<String, Object> testCase(String title, String type, String priority) {
        return Map.of(
                "title", title,
                "type", type,
                "priority", priority,
                "preconditions", "User is on the login page",
                "steps", List.of("Enter credentials", "Click Log in"),
                "expectedResult", "Dashboard is shown");
    }
}
