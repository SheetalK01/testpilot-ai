package com.testpilot.story;

import com.testpilot.story.dto.StoryResponse;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserStoryRepository extends JpaRepository<UserStory, Long> {

    String SUMMARY_SELECT = """
            select new com.testpilot.story.dto.StoryResponse(
                s.id, s.project.id, s.title, s.description, s.acceptanceCriteria,
                (select count(tc) from TestCase tc where tc.story = s),
                s.createdAt, s.updatedAt)
            from UserStory s
            """;

    @Query(SUMMARY_SELECT + " where s.project.id = :projectId order by s.createdAt desc, s.id desc")
    List<StoryResponse> findSummariesByProject(@Param("projectId") Long projectId);

    @Query(SUMMARY_SELECT + " where s.id = :id and s.project.owner.id = :ownerId")
    Optional<StoryResponse> findSummary(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("select s from UserStory s where s.id = :id and s.project.owner.id = :ownerId")
    Optional<UserStory> findOwned(@Param("id") Long id, @Param("ownerId") Long ownerId);

    long countByProjectOwnerId(Long ownerId);

    /** SELECT ... FOR UPDATE on the story row only (primary key lookup, so no gap locks). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s.id from UserStory s where s.id = :id")
    Optional<Long> lockById(@Param("id") Long id);
}
