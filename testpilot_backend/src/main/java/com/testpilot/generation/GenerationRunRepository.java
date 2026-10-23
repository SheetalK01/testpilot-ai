package com.testpilot.generation;

import com.testpilot.dashboard.dto.RecentRun;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GenerationRunRepository extends JpaRepository<GenerationRun, Long> {

    @Query("""
            select new com.testpilot.dashboard.dto.RecentRun(
                r.id, r.story.id, r.story.title, r.kind, r.status, r.model, r.testCaseCount, r.durationMs, r.createdAt)
            from GenerationRun r
            where r.story.project.owner.id = :ownerId
            order by r.createdAt desc, r.id desc
            """)
    List<RecentRun> findRecentForOwner(@Param("ownerId") Long ownerId, Pageable page);

    List<GenerationRun> findByStoryIdOrderByIdAsc(Long storyId);
}
