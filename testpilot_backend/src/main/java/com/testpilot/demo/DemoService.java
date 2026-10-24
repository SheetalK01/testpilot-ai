package com.testpilot.demo;

import com.testpilot.auth.AuthService;
import com.testpilot.auth.JwtService;
import com.testpilot.auth.User;
import com.testpilot.auth.UserRepository;
import com.testpilot.auth.dto.AuthResponse;
import com.testpilot.auth.dto.UserResponse;
import com.testpilot.common.NotFoundException;
import com.testpilot.common.TooManyRequestsException;
import com.testpilot.config.TestpilotProperties;
import com.testpilot.generation.GenerationKind;
import com.testpilot.generation.GenerationRun;
import com.testpilot.generation.GenerationRunRepository;
import com.testpilot.project.Project;
import com.testpilot.project.ProjectRepository;
import com.testpilot.story.UserStory;
import com.testpilot.story.UserStoryRepository;
import com.testpilot.testcase.Source;
import com.testpilot.testcase.TestCase;
import com.testpilot.testcase.TestCaseRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Try the demo": every click creates a private, throwaway account filled with sample data, so
 * visitors never see or change each other's data. Accounts older than the TTL are deleted (with
 * all their data, through ON DELETE CASCADE) to keep the free database small.
 */
@Service
public class DemoService {

    /** Demo accounts are recognised by this reserved, non-routable email domain. */
    static final String EMAIL_DOMAIN = AuthService.RESERVED_DEMO_DOMAIN;

    private static final Logger log = LoggerFactory.getLogger(DemoService.class);

    private final TestpilotProperties.Demo settings;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final UserStoryRepository stories;
    private final TestCaseRepository testCases;
    private final GenerationRunRepository runs;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Clock clock;

    @Autowired
    public DemoService(
            TestpilotProperties properties,
            UserRepository users,
            ProjectRepository projects,
            UserStoryRepository stories,
            TestCaseRepository testCases,
            GenerationRunRepository runs,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this(properties.demo(), users, projects, stories, testCases, runs, passwordEncoder, jwtService, Clock.systemUTC());
    }

    DemoService(
            TestpilotProperties.Demo settings,
            UserRepository users,
            ProjectRepository projects,
            UserStoryRepository stories,
            TestCaseRepository testCases,
            GenerationRunRepository runs,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            Clock clock) {
        this.settings = settings;
        this.users = users;
        this.projects = projects;
        this.stories = stories;
        this.testCases = testCases;
        this.runs = runs;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.clock = clock;
    }

    @Transactional
    public AuthResponse startSession() {
        if (!settings.enabled()) {
            throw new NotFoundException("Demo");
        }
        Instant now = clock.instant();
        deleteExpired(now);
        if (users.countByEmailEndingWithAndCreatedAtAfter(EMAIL_DOMAIN, now.minus(Duration.ofHours(1)))
                >= settings.maxSessionsPerHour()) {
            throw new TooManyRequestsException("The demo is busy right now. Please try again in a few minutes.");
        }

        String email = "demo-" + UUID.randomUUID().toString().substring(0, 12) + EMAIL_DOMAIN;
        // Nobody can log in with this password; the session works only through the returned token.
        User user = users.save(new User("Demo User", email, passwordEncoder.encode(UUID.randomUUID().toString())));
        seed(user);
        return new AuthResponse(jwtService.issue(user), UserResponse.from(user));
    }

    /** Runs hourly while the server is awake; startSession() also cleans up, since free servers sleep. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1M")
    @Transactional
    public void cleanUp() {
        int deleted = deleteExpired(clock.instant());
        if (deleted > 0) {
            log.info("Deleted {} expired demo accounts", deleted);
        }
    }

    private int deleteExpired(Instant now) {
        return users.deleteByEmailSuffixCreatedBefore(EMAIL_DOMAIN, now.minus(Duration.ofHours(settings.ttlHours())));
    }

    private void seed(User user) {
        Project project = projects.save(new Project(user, DemoData.PROJECT_NAME, DemoData.PROJECT_DESCRIPTION));
        for (DemoData.Story sample : DemoData.STORIES) {
            UserStory story = stories.save(
                    new UserStory(project, sample.title(), sample.description(), sample.acceptanceCriteria()));
            if (sample.aiCases().isEmpty()) {
                continue; // left empty on purpose, so the visitor can click "Generate"
            }
            testCases.saveAll(sample.aiCases().stream().map(c -> new TestCase(story, Source.AI, c)).toList());
            GenerationRun run = new GenerationRun(story, GenerationKind.TEST_CASES);
            run.succeed("mock", sample.aiCases().size(), 900);
            runs.save(run);
        }
    }
}
