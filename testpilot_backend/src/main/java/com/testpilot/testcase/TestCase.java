package com.testpilot.testcase;

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
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "test_cases")
public class TestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserStory story;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TestCaseType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Priority priority;

    @Column(columnDefinition = "TEXT")
    private String preconditions;

    /** Stored one step per line; the API exposes it as a list. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String steps;

    @Column(name = "expected_result", nullable = false, columnDefinition = "TEXT")
    private String expectedResult;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Source source;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TestCase() {}

    public TestCase(UserStory story, Source source, TestCaseContent content) {
        this.story = story;
        this.source = source;
        apply(content);
    }

    /** Replaces the editable fields; the source (AI or MANUAL) never changes. */
    public void apply(TestCaseContent content) {
        this.title = content.title();
        this.type = content.type();
        this.priority = content.priority();
        this.preconditions = content.preconditions();
        this.steps = String.join("\n", content.steps());
        this.expectedResult = content.expectedResult();
    }

    public List<String> getStepList() {
        return steps.lines().toList();
    }

    public Long getId() {
        return id;
    }

    public UserStory getStory() {
        return story;
    }

    public String getTitle() {
        return title;
    }

    public TestCaseType getType() {
        return type;
    }

    public Priority getPriority() {
        return priority;
    }

    public String getPreconditions() {
        return preconditions;
    }

    public String getExpectedResult() {
        return expectedResult;
    }

    public Source getSource() {
        return source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
