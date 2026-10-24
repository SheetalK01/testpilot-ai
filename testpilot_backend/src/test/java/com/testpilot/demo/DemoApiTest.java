package com.testpilot.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DemoApiTest extends ApiTestSupport {

    private String startDemo() throws Exception {
        String body = mvc.perform(post("/api/demo/session"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.name").value("Demo User"))
                .andExpect(jsonPath("$.user.email", endsWith("@demo.testpilot.invalid")))
                .andReturn().getResponse().getContentAsString();
        return readJson(body).get("token").asString();
    }

    @Test
    @DisplayName("a demo session is a working, pre-filled account")
    void demoSessionHasSampleData() throws Exception {
        String token = startDemo();

        mvc.perform(authed(get("/api/projects"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Web Shop (demo)"))
                .andExpect(jsonPath("$[0].storyCount").value(3))
                .andExpect(jsonPath("$[0].testCaseCount").value(8));
        mvc.perform(authed(get("/api/dashboard"), token))
                .andExpect(jsonPath("$.recentRuns", hasSize(2)))
                .andExpect(jsonPath("$.byType.POSITIVE").value(3));
    }

    @Test
    @DisplayName("every demo session gets its own private account")
    void demoSessionsAreIsolated() throws Exception {
        String first = startDemo();
        String second = startDemo();

        String me1 = mvc.perform(authed(get("/api/auth/me"), first)).andReturn().getResponse().getContentAsString();
        String me2 = mvc.perform(authed(get("/api/auth/me"), second)).andReturn().getResponse().getContentAsString();
        assertThat(readJson(me1).get("id").asLong()).isNotEqualTo(readJson(me2).get("id").asLong());

        long projectId = readJson(mvc.perform(authed(get("/api/projects"), first))
                        .andReturn().getResponse().getContentAsString())
                .get(0).get("id").asLong();
        mvc.perform(authed(get("/api/projects/" + projectId), second)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("the reserved demo email domain cannot be used to register")
    void reservedDomainCannotRegister() throws Exception {
        mvc.perform(withJson(post("/api/auth/register"),
                        Map.of("name", "Sneaky", "email", "me@demo.testpilot.invalid", "password", "Password123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This email domain is reserved for demo accounts"));
    }

    @Test
    @DisplayName("health and info are public and health allows cross-origin polling")
    void healthIsCorsEnabled() throws Exception {
        mvc.perform(get("/actuator/health").header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(get("/actuator/info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.app.commit", not(org.hamcrest.Matchers.emptyOrNullString())));
    }
}
