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
public record TestpilotProperties(@NotNull Jwt jwt, @NotNull AiEngine aiEngine, @NotNull Cors cors) {

    /** HS256 needs a key of at least 256 bits, hence the 32-character minimum. */
    public record Jwt(@NotBlank @Size(min = 32) String secret, @Min(1) long ttlMinutes) {}

    public record AiEngine(@NotBlank String url, @Min(1) int timeoutSeconds) {}

    public record Cors(@NotEmpty List<String> allowedOrigins) {}
}
