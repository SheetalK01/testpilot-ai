package com.testpilot.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.testpilot.auth.JwtService;
import com.testpilot.auth.User;
import com.testpilot.auth.UserRepository;
import com.testpilot.common.NotFoundException;
import com.testpilot.common.TooManyRequestsException;
import com.testpilot.config.TestpilotProperties;
import com.testpilot.generation.GenerationRunRepository;
import com.testpilot.project.ProjectRepository;
import com.testpilot.story.UserStoryRepository;
import com.testpilot.testcase.TestCaseRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class DemoServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T12:00:00Z");

    private final UserRepository users = mock(UserRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final UserStoryRepository stories = mock(UserStoryRepository.class);
    private final TestCaseRepository testCases = mock(TestCaseRepository.class);
    private final GenerationRunRepository runs = mock(GenerationRunRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);

    private DemoService service(boolean enabled, int maxPerHour) {
        return new DemoService(
                new TestpilotProperties.Demo(enabled, maxPerHour, 24),
                users, projects, stories, testCases, runs, encoder, jwtService,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void disabledDemoIsNotFound() {
        assertThatThrownBy(() -> service(false, 10).startSession()).isInstanceOf(NotFoundException.class);
        verify(users, never()).save(any());
    }

    @Test
    void tooManyRecentSessionsAreRejected() {
        when(users.countByEmailEndingWithAndCreatedAtAfter(eq(DemoService.EMAIL_DOMAIN), any())).thenReturn(10L);

        assertThatThrownBy(() -> service(true, 10).startSession()).isInstanceOf(TooManyRequestsException.class);
        verify(users, never()).save(any());
    }

    @Test
    void expiredDemoAccountsAreDeletedBeforeCreatingANewOne() {
        when(encoder.encode(anyString())).thenReturn("hash");
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(projects.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stories.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issue(any(User.class))).thenReturn("jwt");

        assertThat(service(true, 10).startSession().token()).isEqualTo("jwt");

        verify(users).deleteByEmailSuffixCreatedBefore(DemoService.EMAIL_DOMAIN, NOW.minusSeconds(24 * 3600));
    }

    @Test
    void scheduledCleanupUsesTheTtl() {
        service(true, 10).cleanUp();
        verify(users).deleteByEmailSuffixCreatedBefore(DemoService.EMAIL_DOMAIN, NOW.minusSeconds(24 * 3600));
    }
}
