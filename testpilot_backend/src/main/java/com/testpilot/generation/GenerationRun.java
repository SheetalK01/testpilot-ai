package com.testpilot.generation;

import com.testpilot.story.UserStory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/** One AI call, logged whether it succeeds or fails. */
@Entity
@Table(name = "generation_runs")
public class GenerationRun {

    static final int MAX_ERROR_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserStory story;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GenerationStatus status;

    @Column(length = 60)
    private String model;

    @Column(name = "test_case_count")
    private Integer testCaseCount;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "error_message", length = MAX_ERROR_LENGTH)
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected GenerationRun() {}

    public GenerationRun(UserStory story, GenerationKind kind) {
        this.story = story;
        this.kind = kind;
        this.status = GenerationStatus.RUNNING;
    }

    public void succeed(String model, int testCaseCount, long durationMs) {
        this.status = GenerationStatus.SUCCESS;
        this.model = truncate(model, 60);
        this.testCaseCount = testCaseCount;
        this.durationMs = (int) Math.min(durationMs, Integer.MAX_VALUE);
    }

    public void fail(String errorMessage, long durationMs) {
        this.status = GenerationStatus.FAILED;
        this.errorMessage = truncate(errorMessage, MAX_ERROR_LENGTH);
        this.durationMs = (int) Math.min(durationMs, Integer.MAX_VALUE);
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public Long getId() {
        return id;
    }

    public UserStory getStory() {
        return story;
    }

    public GenerationKind getKind() {
        return kind;
    }

    public GenerationStatus getStatus() {
        return status;
    }

    public String getModel() {
        return model;
    }

    public Integer getTestCaseCount() {
        return testCaseCount;
    }

    public Integer getDurationMs() {
        return durationMs;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
