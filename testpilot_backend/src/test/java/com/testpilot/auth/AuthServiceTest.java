package com.testpilot.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.auth.dto.AuthResponse;
import com.testpilot.auth.dto.LoginRequest;
import com.testpilot.auth.dto.RegisterRequest;
import com.testpilot.common.ConflictException;
import com.testpilot.common.NotFoundException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class AuthServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);
    private AuthService service;

    @BeforeEach
    void setUp() {
        when(encoder.encode(anyString())).thenAnswer(inv -> "hashed:" + inv.getArgument(0));
        when(jwtService.issue(any())).thenReturn("jwt");
        service = new AuthService(users, encoder, jwtService);
    }

    private static User saved(String name, String email) {
        User user = new User(name, email, "hashed:Password123");
        ReflectionTestUtils.setField(user, "id", 7L);
        return user;
    }

    @Test
    void registerNormalisesInputAndHashesThePassword() {
        when(users.saveAndFlush(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", 7L);
            return u;
        });

        AuthResponse response = service.register(new RegisterRequest("  Ada  ", " Ada@Example.COM ", "Password123"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Ada");
        assertThat(captor.getValue().getEmail()).isEqualTo("ada@example.com");
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed:Password123");
        assertThat(response.token()).isEqualTo("jwt");
        assertThat(response.user().id()).isEqualTo(7L);
    }

    @Test
    void registerRejectsExistingEmail() {
        when(users.existsByEmail("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("Ada", "ADA@example.com", "Password123")))
                .isInstanceOf(ConflictException.class);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void registerTurnsUniqueConstraintRaceIntoConflict() {
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uk_users_email"));

        assertThatThrownBy(() -> service.register(new RegisterRequest("Ada", "ada@example.com", "Password123")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Email is already registered");
    }

    @Test
    void loginReturnsTokenForValidCredentials() {
        User user = saved("Ada", "ada@example.com");
        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("Password123", user.getPasswordHash())).thenReturn(true);

        AuthResponse response = service.login(new LoginRequest("ADA@example.com", "Password123"));

        assertThat(response.user().email()).isEqualTo("ada@example.com");
    }

    @Test
    void loginWithWrongPasswordFails() {
        User user = saved("Ada", "ada@example.com");
        when(users.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("ada@example.com", "nope")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginWithUnknownEmailStillChecksAPasswordToEqualiseTiming() {
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("ghost@example.com", "Password123")))
                .isInstanceOf(BadCredentialsException.class);
        verify(encoder).matches(eq("Password123"), anyString());
    }

    @Test
    void meReturnsUserOr404() {
        when(users.findById(7L)).thenReturn(Optional.of(saved("Ada", "ada@example.com")));
        when(users.findById(8L)).thenReturn(Optional.empty());

        assertThat(service.me(7L).name()).isEqualTo("Ada");
        assertThatThrownBy(() -> service.me(8L)).isInstanceOf(NotFoundException.class);
    }
}
