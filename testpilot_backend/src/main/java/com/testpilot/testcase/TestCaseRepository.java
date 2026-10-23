package com.testpilot.testcase;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {

    /** HIGH → MEDIUM → LOW, then insertion order. */
    @Query("""
            select tc from TestCase tc where tc.story.id = :storyId
            order by case tc.priority
                when com.testpilot.testcase.Priority.HIGH then 0
                when com.testpilot.testcase.Priority.MEDIUM then 1
                else 2 end,
              tc.id
            """)
    List<TestCase> findByStoryOrdered(@Param("storyId") Long storyId);

    @Query("select tc from TestCase tc where tc.id = :id and tc.story.project.owner.id = :ownerId")
    Optional<TestCase> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("select tc.id from TestCase tc where tc.story.id = :storyId and tc.source = :source")
    List<Long> findIdsByStoryIdAndSource(@Param("storyId") Long storyId, @Param("source") Source source);

    long countByStoryId(Long storyId);

    long countByStoryProjectOwnerId(Long ownerId);

    @Query("select tc.type, count(tc) from TestCase tc where tc.story.project.owner.id = :ownerId group by tc.type")
    List<Object[]> countByTypeForOwner(@Param("ownerId") Long ownerId);

    @Query("select tc.priority, count(tc) from TestCase tc where tc.story.project.owner.id = :ownerId group by tc.priority")
    List<Object[]> countByPriorityForOwner(@Param("ownerId") Long ownerId);
}
