-- TestPilot AI initial schema.
-- Portable between MySQL 8 (InnoDB, utf8mb4) and H2 in MySQL mode (local dev + tests).

CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE projects (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    owner_id    BIGINT        NOT NULL,
    name        VARCHAR(120)  NOT NULL,
    description VARCHAR(1000) NULL,
    created_at  TIMESTAMP(6)  NOT NULL,
    updated_at  TIMESTAMP(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_projects_owner ON projects (owner_id);

CREATE TABLE user_stories (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    project_id          BIGINT       NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT         NOT NULL,
    acceptance_criteria TEXT         NULL,
    created_at          TIMESTAMP(6) NOT NULL,
    updated_at          TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_stories_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_stories_project ON user_stories (project_id);

CREATE TABLE test_cases (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    story_id        BIGINT       NOT NULL,
    title           VARCHAR(255) NOT NULL,
    type            VARCHAR(20)  NOT NULL,
    priority        VARCHAR(10)  NOT NULL,
    preconditions   TEXT         NULL,
    steps           TEXT         NOT NULL,
    expected_result TEXT         NOT NULL,
    source          VARCHAR(10)  NOT NULL,
    created_at      TIMESTAMP(6) NOT NULL,
    updated_at      TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_test_cases_story FOREIGN KEY (story_id) REFERENCES user_stories (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_test_cases_story ON test_cases (story_id);

CREATE TABLE generation_runs (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    story_id        BIGINT       NOT NULL,
    kind            VARCHAR(20)  NOT NULL,
    status          VARCHAR(10)  NOT NULL,
    model           VARCHAR(60)  NULL,
    test_case_count INT          NULL,
    duration_ms     INT          NULL,
    error_message   VARCHAR(500) NULL,
    created_at      TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_runs_story FOREIGN KEY (story_id) REFERENCES user_stories (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_runs_story ON generation_runs (story_id);
CREATE INDEX idx_runs_created_at ON generation_runs (created_at);
