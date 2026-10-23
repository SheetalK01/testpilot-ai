package com.testpilot.aiengine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.testpilot.aiengine.dto.AiPlaywrightRequest;
import com.testpilot.aiengine.dto.AiStory;
import com.testpilot.aiengine.dto.AiTestCase;
import com.testpilot.aiengine.dto.AiTestCasesResponse;
import com.testpilot.config.RequestIdFilter;
import com.testpilot.testcase.Priority;
import com.testpilot.testcase.TestCaseType;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

/** Exercises the real HTTP client against a throwaway in-process server: no mocks of HTTP itself. */
class AiEngineClientTest {

    private static final ValidatorFactory VALIDATION = Validation.buildDefaultValidatorFactory();
    private static final AiStory STORY = new AiStory("Login", "As a user I want to log in", null);
    private static final String CASE_JSON = """
            {"title":"Valid login","type":"POSITIVE","priority":"HIGH","preconditions":"",
             "steps":["Open /login","Submit"],"expectedResult":"Dashboard"}""";

    private HttpServer server;
    private final AtomicReference<String> lastRequestId = new AtomicReference<>();
    private final AtomicReference<String> lastBody = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String responseBody = "{}";
    private volatile long delayMs = 0;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
        MDC.clear();
    }

    @AfterAll
    static void closeValidation() {
        VALIDATION.close();
    }

    private void handle(HttpExchange exchange) throws IOException {
        lastRequestId.set(exchange.getRequestHeaders().getFirst(RequestIdFilter.HEADER));
        lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private AiEngineClient client(Duration timeout) {
        return new AiEngineClient("http://127.0.0.1:" + server.getAddress().getPort(), timeout, VALIDATION.getValidator());
    }

    private AiEngineClient client() {
        return client(Duration.ofSeconds(5));
    }

    @Test
    void parsesTestCasesAndForwardsTheRequestId() {
        responseBody = "{\"model\":\"mock\",\"testCases\":[" + CASE_JSON + "]}";
        MDC.put(RequestIdFilter.MDC_KEY, "trace-abc");

        AiTestCasesResponse response = client().generateTestCases(STORY);

        assertThat(response.model()).isEqualTo("mock");
        assertThat(response.testCases()).singleElement().satisfies(tc -> {
            assertThat(tc.type()).isEqualTo(TestCaseType.POSITIVE);
            assertThat(tc.steps()).containsExactly("Open /login", "Submit");
        });
        assertThat(lastRequestId.get()).isEqualTo("trace-abc");
        assertThat(lastBody.get()).contains("\"title\":\"Login\"").contains("\"acceptanceCriteria\"");
    }

    @Test
    void sendsPlaywrightRequestInCamelCase() {
        responseBody = "{\"model\":\"mock\",\"script\":\"test()\"}";
        AiTestCase tc = new AiTestCase("t", TestCaseType.EDGE, Priority.LOW, "", List.of("s"), "e");

        assertThat(client().generatePlaywright(new AiPlaywrightRequest(STORY, List.of(tc), "http://x")).script())
                .isEqualTo("test()");
        assertThat(lastBody.get()).contains("\"testCases\"").contains("\"baseUrl\":\"http://x\"").contains("\"expectedResult\"");
    }

    @Test
    void usesTheDetailOfAnErrorResponse() {
        status = 502;
        responseBody = "{\"detail\":\"Model declined the request\"}";

        assertThatThrownBy(() -> client().generateTestCases(STORY))
                .isInstanceOf(AiEngineException.class)
                .hasMessage("Model declined the request");
    }

    @Test
    void fallsBackToTheStatusCodeForNonJsonOrListDetails() {
        status = 500;
        responseBody = "<html>oops</html>";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessage("HTTP 500");

        status = 422;
        responseBody = "{\"detail\":[{\"loc\":[\"body\",\"title\"],\"msg\":\"Field required\"}]}";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessage("HTTP 422");
    }

    @Test
    void rejectsBodiesThatBreakTheContract() {
        responseBody = "{\"model\":\"mock\",\"testCases\":[]}";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessageStartingWith("invalid response from AI engine");

        responseBody = "{\"model\":\"mock\",\"testCases\":[" + CASE_JSON.replace("POSITIVE", "SMOKE") + "]}";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessage("invalid response from AI engine");

        responseBody = "{\"model\":\"mock\",\"testCases\":[" + CASE_JSON.replace("\"Submit\"", "\"  \"") + "]}";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessageContaining("steps[1]");

        responseBody = "";
        assertThatThrownBy(() -> client().generateTestCases(STORY)).hasMessage("empty response from AI engine");
    }

    @Test
    void reportsTimeouts() {
        delayMs = 1500;
        responseBody = "{\"model\":\"mock\",\"script\":\"x\"}";

        assertThatThrownBy(() -> client(Duration.ofMillis(300)).generateTestCases(STORY))
                .isInstanceOf(AiEngineException.class)
                .hasMessage("timed out after 0 s");
    }

    @Test
    void reportsAnUnreachableEngine() {
        AiEngineClient client = client();
        server.stop(0);

        assertThatThrownBy(() -> client.generateTestCases(STORY)).hasMessage("AI engine is unreachable");
    }
}
