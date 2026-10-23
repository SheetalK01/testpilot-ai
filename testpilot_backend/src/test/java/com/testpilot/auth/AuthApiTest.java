package com.testpilot.auth;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.testpilot.support.ApiTestSupport;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

class AuthApiTest extends ApiTestSupport {

    @Autowired
    JwtEncoder jwtEncoder;

    @Test
    @DisplayName("register returns 201 with a token and the user, never the password")
    void registerReturnsTokenAndUser() throws Exception {
        String email = uniqueEmail();
        mvc.perform(withJson(post("/api/auth/register"), Map.of("name", "Ada Lovelace", "email", email, "password", "Password123")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.name").value("Ada Lovelace"))
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(content().string(not(containsString("Password123"))));
    }

    @Test
    @DisplayName("register stores the email lower-case and rejects a case-insensitive duplicate with 409")
    void duplicateEmailIsConflict() throws Exception {
        String email = uniqueEmail();
        registerUser("First", email, "Password123");

        mvc.perform(withJson(post("/api/auth/register"), Map.of("name", "Second", "email", email.toUpperCase(), "password", "Password123")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email is already registered"));
    }

    @Test
    @DisplayName("register validates every field and returns field errors in the standard format")
    void registerValidation() throws Exception {
        mvc.perform(withJson(post("/api/auth/register"), Map.of("name", "A", "email", "not-an-email", "password", "short")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.email").value("must be a well-formed email address"))
                .andExpect(jsonPath("$.errors.password").exists())
                .andExpect(jsonPath("$.path").value("/api/auth/register"))
                .andExpect(jsonPath("$.requestId", not(emptyOrNullString())))
                .andExpect(jsonPath("$.timestamp", not(emptyOrNullString())));
    }

    @Test
    @DisplayName("password needs at least one letter and one digit, and at most 72 characters")
    void passwordComplexity() throws Exception {
        mvc.perform(withJson(post("/api/auth/register"), Map.of("name", "Ada", "email", uniqueEmail(), "password", "onlyletters")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").value("must contain at least one letter and one digit"));
        mvc.perform(withJson(post("/api/auth/register"), Map.of("name", "Ada", "email", uniqueEmail(), "password", "a1".repeat(37))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    @DisplayName("login with correct credentials returns a token; email is case-insensitive")
    void loginSucceeds() throws Exception {
        String email = uniqueEmail();
        registerUser("Grace", email, "Password123");

        mvc.perform(withJson(post("/api/auth/login"), Map.of("email", "  " + email.toUpperCase() + " ", "password", "Password123")))
                .andExpect(status().isBadRequest()); // surrounding spaces are not a valid email
        mvc.perform(withJson(post("/api/auth/login"), Map.of("email", email.toUpperCase(), "password", "Password123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.user.email").value(email));
    }

    @Test
    @DisplayName("wrong password and unknown email both return the same 401 message")
    void loginFailuresLookIdentical() throws Exception {
        String email = uniqueEmail();
        registerUser("Grace", email, "Password123");

        mvc.perform(withJson(post("/api/auth/login"), Map.of("email", email, "password", "WrongPass1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
        mvc.perform(withJson(post("/api/auth/login"), Map.of("email", uniqueEmail(), "password", "Password123")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("/me returns the current user with a valid token")
    void meWithToken() throws Exception {
        String email = uniqueEmail();
        String token = registerUser("Linus", email, "Password123");

        mvc.perform(authed(get("/api/auth/me"), token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Linus"))
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    @DisplayName("/me without a token is 401 in the standard error format")
    void meWithoutToken() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"))
                .andExpect(jsonPath("$.path").value("/api/auth/me"));
    }

    @Test
    @DisplayName("a tampered token is rejected with 401")
    void tamperedToken() throws Exception {
        String token = registerUser();
        String[] parts = token.split("\\.");
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"1\",\"iss\":\"testpilot-ai\",\"exp\":9999999999}".getBytes());
        String tampered = parts[0] + "." + forgedPayload + "." + parts[2];

        mvc.perform(authed(get("/api/auth/me"), tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
        mvc.perform(authed(get("/api/auth/me"), "not-a-jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("an expired token is rejected with 401")
    void expiredToken() throws Exception {
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(JwtService.ISSUER)
                .subject("1")
                .issuedAt(past.minus(1, ChronoUnit.HOURS))
                .expiresAt(past)
                .build();
        String expired = jwtEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        mvc.perform(authed(get("/api/auth/me"), expired))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    @DisplayName("malformed JSON is a 400, not a 500")
    void malformedJson() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed JSON request"));
    }

    @Test
    @DisplayName("every response carries a request id; a safe incoming id is echoed")
    void requestIdHeader() throws Exception {
        mvc.perform(get("/api/auth/me").header("X-Request-Id", "trace-123"))
                .andExpect(header().string("X-Request-Id", "trace-123"))
                .andExpect(jsonPath("$.requestId").value("trace-123"));
        mvc.perform(get("/api/auth/me").header("X-Request-Id", "bad id\nwith newline"))
                .andExpect(header().string("X-Request-Id", not(is("bad id\nwith newline"))));
    }
}
