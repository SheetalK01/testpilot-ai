package com.testpilot.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private static final SecretKey KEY =
            new SecretKeySpec("unit-test-secret-0123456789abcdef0123".getBytes(StandardCharsets.UTF_8), "HmacSHA256");

    private final NimbusJwtDecoder decoder = decoder(KEY);

    private static NimbusJwtDecoder decoder(SecretKey key) {
        NimbusJwtDecoder d = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        d.setJwtValidator(JwtValidators.createDefaultWithIssuer(JwtService.ISSUER));
        return d;
    }

    private static User user() {
        User user = new User("Ada", "ada@example.com", "hash");
        ReflectionTestUtils.setField(user, "id", 42L);
        return user;
    }

    @Test
    void issuesHs256TokenWithSubjectClaimsAndExpiry() {
        Instant now = Instant.now();
        JwtService service = new JwtService(
                new NimbusJwtEncoder(new ImmutableSecret<>(KEY)), Duration.ofMinutes(720), Clock.fixed(now, ZoneOffset.UTC));

        Jwt jwt = decoder.decode(service.issue(user()));

        assertThat(jwt.getHeaders()).containsEntry("alg", "HS256");
        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsString("email")).isEqualTo("ada@example.com");
        assertThat(jwt.getClaimAsString("name")).isEqualTo("Ada");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo(JwtService.ISSUER);
        assertThat(Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt())).isEqualTo(Duration.ofMinutes(720));
    }

    @Test
    void tokenIssuedInThePastIsRejectedAsExpired() {
        Instant longAgo = Instant.now().minus(Duration.ofDays(2));
        JwtService service = new JwtService(
                new NimbusJwtEncoder(new ImmutableSecret<>(KEY)), Duration.ofHours(1), Clock.fixed(longAgo, ZoneOffset.UTC));

        String token = service.issue(user());

        assertThatThrownBy(() -> decoder.decode(token))
                .isInstanceOf(JwtValidationException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        SecretKey otherKey =
                new SecretKeySpec("another-secret-0123456789abcdef012345".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        JwtService service = new JwtService(
                new NimbusJwtEncoder(new ImmutableSecret<>(otherKey)), Duration.ofHours(1), Clock.systemUTC());

        String token = service.issue(user());

        assertThatThrownBy(() -> decoder.decode(token)).hasMessageContaining("signature");
    }
}
