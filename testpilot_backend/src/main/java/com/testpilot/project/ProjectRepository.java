package com.testpilot.project;

import com.testpilot.project.dto.ProjectResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    String SUMMARY_SELECT = """
            select new com.testpilot.project.dto.ProjectResponse(
                p.id, p.name, p.description,
                (select count(s) from UserStory s where s.project = p),
                (select count(tc) from TestCase tc where tc.story.project = p),
                p.createdAt, p.updatedAt)
            from Project p
            """;

    /** One query for the whole list, counts included, so the dashboard grid never does N+1 lookups. */
    @Query(SUMMARY_SELECT + " where p.owner.id = :ownerId order by p.createdAt desc, p.id desc")
    List<ProjectResponse> findSummariesByOwner(@Param("ownerId") Long ownerId);

    @Query(SUMMARY_SELECT + " where p.id = :id and p.owner.id = :ownerId")
    Optional<ProjectResponse> findSummary(@Param("id") Long id, @Param("ownerId") Long ownerId);

    Optional<Project> findByIdAndOwnerId(Long id, Long ownerId);

    long countByOwnerId(Long ownerId);
}
