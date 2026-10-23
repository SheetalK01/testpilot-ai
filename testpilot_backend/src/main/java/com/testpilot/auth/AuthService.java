package com.testpilot.auth;

import com.testpilot.auth.dto.AuthResponse;
import com.testpilot.auth.dto.LoginRequest;
import com.testpilot.auth.dto.RegisterRequest;
import com.testpilot.auth.dto.UserResponse;
import com.testpilot.common.ConflictException;
import com.testpilot.common.NotFoundException;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    // Checked when the email is unknown, so "unknown email" and "wrong password" take the same
    // time and cannot be told apart (user enumeration via timing).
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.dummyHash = passwordEncoder.encode("timing-equalizer-not-a-real-password-1");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new ConflictException("Email is already registered");
        }
        User user;
        try {
            user = users.saveAndFlush(new User(request.name().trim(), email, passwordEncoder.encode(request.password())));
        } catch (DataIntegrityViolationException e) {
            // Two concurrent registrations with the same email: the unique constraint decides.
            throw new ConflictException("Email is already registered");
        }
        return new AuthResponse(jwtService.issue(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(normalizeEmail(request.email())).orElse(null);
        String hash = user != null ? user.getPasswordHash() : dummyHash;
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (user == null || !matches) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return new AuthResponse(jwtService.issue(user), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return users.findById(userId).map(UserResponse::from).orElseThrow(() -> new NotFoundException("User"));
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
