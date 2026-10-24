package com.testpilot.aiengine;

import com.testpilot.aiengine.dto.AiPlaywrightRequest;
import com.testpilot.aiengine.dto.AiPlaywrightResponse;
import com.testpilot.aiengine.dto.AiStory;
import com.testpilot.aiengine.dto.AiTestCasesResponse;
import com.testpilot.config.RequestIdFilter;
import com.testpilot.config.TestpilotProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.InterruptedIOException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Comparator;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * HTTP client for the Python AI engine. Every failure (timeout, connection error, non-2xx status, or a
 * body that does not satisfy the expected contract) becomes an {@link AiEngineException} with a short,
 * user-safe reason.
 */
@Component
public class AiEngineClient {

    /** Shared-secret header: the AI engine is publicly reachable on free hosting, so it only serves callers that know it. */
    public static final String TOKEN_HEADER = "X-Internal-Token";

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Logger log = LoggerFactory.getLogger(AiEngineClient.class);

    private final RestClient restClient;
    private final Duration readTimeout;
    private final Validator validator;

    @Autowired
    public AiEngineClient(TestpilotProperties properties, Validator validator) {
        this(
                properties.aiEngine().url(),
                Duration.ofSeconds(properties.aiEngine().timeoutSeconds()),
                validator,
                properties.aiEngine().token());
    }

    AiEngineClient(String baseUrl, Duration readTimeout, Validator validator) {
        this(baseUrl, readTimeout, validator, null);
    }

    AiEngineClient(String baseUrl, Duration readTimeout, Validator validator, String token) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(readTimeout);
        RestClient.Builder builder = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory);
        if (token != null && !token.isBlank()) {
            builder.defaultHeader(TOKEN_HEADER, token);
        }
        this.restClient = builder.build();
        this.readTimeout = readTimeout;
        this.validator = validator;
    }

    public AiTestCasesResponse generateTestCases(AiStory story) {
        return post("/v1/test-cases/generate", story, AiTestCasesResponse.class);
    }

    public AiPlaywrightResponse generatePlaywright(AiPlaywrightRequest request) {
        return post("/v1/playwright/generate", request, AiPlaywrightResponse.class);
    }

    /**
     * Fire-and-forget request that wakes a sleeping AI engine (free hosting stops idle services).
     * Called when the backend starts, so the first generation does not pay a second cold start.
     */
    @Async
    public void wakeUp() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            log.info("AI engine is awake");
        } catch (RestClientException e) {
            log.info("AI engine wake-up ping failed (it may still be starting): {}", e.getMessage());
        }
    }

    private <T> T post(String path, Object body, Class<T> responseType) {
        T response;
        try {
            response = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header(RequestIdFilter.HEADER, RequestIdFilter.current())
                    .body(body)
                    .retrieve()
                    .body(responseType);
        } catch (RestClientResponseException e) {
            throw new AiEngineException(reasonFromErrorResponse(e), e);
        } catch (ResourceAccessException e) {
            throw new AiEngineException(isTimeout(e) ? "timed out after " + readTimeout.toSeconds() + " s" : "AI engine is unreachable", e);
        } catch (RestClientException e) {
            // The body could not be read as the expected type (e.g. unknown enum value).
            throw new AiEngineException("invalid response from AI engine", e);
        }
        return validated(response);
    }

    private <T> T validated(T response) {
        if (response == null) {
            throw new AiEngineException("empty response from AI engine");
        }
        Set<ConstraintViolation<T>> violations = validator.validate(response);
        if (!violations.isEmpty()) {
            ConstraintViolation<T> first = violations.stream()
                    .min(Comparator.comparing(v -> v.getPropertyPath().toString()))
                    .orElseThrow();
            throw new AiEngineException("invalid response from AI engine (" + first.getPropertyPath() + " " + first.getMessage() + ")");
        }
        return response;
    }

    /** The AI engine answers errors as {@code {"detail": "..."}}; 422 detail is a list, so only strings are used. */
    private static String reasonFromErrorResponse(RestClientResponseException e) {
        try {
            var detail = e.getResponseBodyAs(ErrorBody.class);
            if (detail != null && detail.detail() instanceof String text && !text.isBlank()) {
                return text;
            }
        } catch (RuntimeException ignored) {
            // Not JSON (e.g. a proxy error page); fall back to the status code.
        }
        return "HTTP " + e.getStatusCode().value();
    }

    private static boolean isTimeout(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof HttpTimeoutException || t instanceof InterruptedIOException) {
                return true;
            }
        }
        return false;
    }

    private record ErrorBody(Object detail) {}
}
