package com.testpilot.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Typed, validated application settings. Every value is overridable through environment variables. */
@Validated
@ConfigurationProperties(prefix = "testpilot")
public record TestpilotProperties(@NotNull Jwt jwt, @NotNull AiEngine aiEngine, @NotNull Cors cors, @NotNull Demo demo) {

    /** HS256 needs a key of at least 256 bits, hence the 32-character minimum. */
    public record Jwt(@NotBlank @Size(min = 32) String secret, @Min(1) long ttlMinutes) {}

    /** {@code token} is a shared secret sent to the AI engine; empty disables the check (local dev). */
    public record AiEngine(@NotBlank String url, @Min(1) int timeoutSeconds, String token) {}

    public record Cors(@NotEmpty List<String> allowedOrigins) {}

    /** Throwaway demo accounts behind the "Try the demo" button. */
    public record Demo(boolean enabled, @Min(1) int maxSessionsPerHour, @Min(1) int ttlHours) {}
}
