package com.testpilot.auth;

import com.testpilot.config.TestpilotProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues HS256 access tokens. Validation is handled by Spring Security's resource server (see SecurityConfig). */
@Service
public class JwtService {

    public static final String ISSUER = "testpilot-ai";

    private final JwtEncoder encoder;
    private final Duration ttl;
    private final Clock clock;

    @Autowired
    public JwtService(JwtEncoder encoder, TestpilotProperties properties) {
        this(encoder, Duration.ofMinutes(properties.jwt().ttlMinutes()), Clock.systemUTC());
    }

    JwtService(JwtEncoder encoder, Duration ttl, Clock clock) {
        this.encoder = encoder;
        this.ttl = ttl;
        this.clock = clock;
    }

    public String issue(User user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(String.valueOf(user.getId()))
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
