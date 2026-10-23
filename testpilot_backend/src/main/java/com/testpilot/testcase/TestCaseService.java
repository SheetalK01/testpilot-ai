package com.testpilot.testcase;

import com.testpilot.common.NotFoundException;
import com.testpilot.story.StoryService;
import com.testpilot.story.UserStory;
import com.testpilot.testcase.dto.TestCaseRequest;
import com.testpilot.testcase.dto.TestCaseResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TestCaseService {

    private final TestCaseRepository testCases;
    private final StoryService storyService;

    public TestCaseService(TestCaseRepository testCases, StoryService storyService) {
        this.testCases = testCases;
        this.storyService = storyService;
    }

    @Transactional(readOnly = true)
    public List<TestCaseResponse> list(Long userId, Long storyId) {
        storyService.requireOwned(userId, storyId);
        return testCases.findByStoryOrdered(storyId).stream().map(TestCaseResponse::from).toList();
    }

    @Transactional
    public TestCaseResponse create(Long userId, Long storyId, TestCaseRequest request) {
        UserStory story = storyService.requireOwned(userId, storyId);
        TestCase saved = testCases.saveAndFlush(new TestCase(story, Source.MANUAL, request.toContent()));
        return TestCaseResponse.from(saved);
    }

    @Transactional
    public TestCaseResponse update(Long userId, Long testCaseId, TestCaseRequest request) {
        TestCase testCase = requireOwned(userId, testCaseId);
        testCase.apply(request.toContent());
        return TestCaseResponse.from(testCases.saveAndFlush(testCase));
    }

    @Transactional
    public void delete(Long userId, Long testCaseId) {
        testCases.delete(requireOwned(userId, testCaseId));
    }

    /**
     * Replaces a story's AI-generated cases with a fresh set; MANUAL cases are never touched.
     * Runs inside the caller's transaction so the delete and inserts commit (or roll back) together.
     *
     * <p>Old cases are deleted by primary key rather than with {@code DELETE ... WHERE story_id = ?}:
     * on MySQL/InnoDB a range delete on the secondary index takes gap locks, and concurrent
     * generations for neighbouring stories then deadlock on their inserts.
     */
    public List<TestCase> replaceAiCases(UserStory story, List<TestCaseContent> generated) {
        List<Long> oldIds = testCases.findIdsByStoryIdAndSource(story.getId(), Source.AI);
        if (!oldIds.isEmpty()) {
            testCases.deleteAllByIdInBatch(oldIds);
        }
        return testCases.saveAllAndFlush(
                generated.stream().map(content -> new TestCase(story, Source.AI, content)).toList());
    }

    private TestCase requireOwned(Long userId, Long testCaseId) {
        return testCases.findOwned(testCaseId, userId).orElseThrow(() -> new NotFoundException("Test case"));
    }
}
