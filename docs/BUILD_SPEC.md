# TestPilot AI — Complete Build Specification

> **For the AI/developer building this:** this document is the single source of truth. Build
> everything described here, in the order of section 14, inside this repository. Where something is
> not specified, choose the simplest standard option and note it in the README. Do not add features
> listed in "Out of scope".

---

## 0. Context

| Item | Value |
|---|---|
| Repo | `git@github-personal:SheetalK01/testpilot-ai.git` (local: `~/Code/testpilot-ai`) |
| Working branch | `develop` (already exists). `main` only gets merged at the end. |
| Owner | Sheetal Khadanga — QA Engineer building a portfolio project |
| Machine | macOS (Apple Silicon) |
| Installed | Java 17, Maven 3.9, Node 20 / npm 10, Python 3.12 at `/opt/homebrew/bin/python3.12`, Docker (may not be running) |
| Git identity | `Sheetal Khadanga <khadangasheetal@gmail.com>` (already set in the repo config) |

**Goal:** a full-stack, production-style project that shows **frontend, backend, AI and QA
automation** skills in one repo. Code quality, tests and docs matter as much as features: recruiters
will read this repo.

---

## 1. Product summary

A QA engineer logs in, creates a **project**, adds **user stories** (title, description, acceptance
criteria), and clicks **Generate**. An LLM (Claude) returns structured **test cases** (positive,
negative, edge; priority; preconditions; steps; expected result). The user can edit, add and delete
test cases, **export them to Excel**, and **generate a Playwright test script** from them. A
**dashboard** shows counts and recent AI runs.

---

## 2. Scope

### In scope (must build)
1. Register, log in, log out (JWT, stateless)
2. Projects CRUD (owner-scoped)
3. User stories CRUD inside a project
4. AI test-case generation for a story (replaces existing **AI** test cases; keeps **MANUAL** ones)
5. Test cases: list, add manual, edit, delete
6. AI Playwright script generation for a story (returned as text, shown in UI with a copy button; not saved)
7. Excel (.xlsx) export of a story's test cases
8. Dashboard stats
9. Generation run history (every AI call is logged)
10. AI engine **mock mode** (deterministic, no API key needed)
11. Automated tests at every layer + GitHub Actions CI
12. Dockerfiles + docker-compose for the full stack
13. Docs: README, PLAN, TEST_PLAN, API reference

### Out of scope (do NOT build)
- Social login, email verification, password reset, refresh tokens
- Teams / sharing / roles
- Running the generated Playwright script from the UI
- Jira / TestRail integrations
- Payments, notifications, file uploads
- Kubernetes, cloud deployment scripts (README may describe manual deploy only)

---

## 3. Tech stack (pin these)

| Layer | Choice |
|---|---|
| Backend | Java 17, **Spring Boot 4.x** (latest stable on start.spring.io), Spring Web MVC, Spring Data JPA, Spring Security + **OAuth2 Resource Server (HS256 JWT via Nimbus)**, Bean Validation, Actuator, Apache POI 5.x |
| DB | MySQL 8 in docker-compose; **H2 in-memory (MySQL mode)** as the default when `DB_URL` is not set (local dev + tests) |
| AI engine | Python 3.12, FastAPI, Uvicorn, Pydantic v2, official `anthropic` Python SDK, httpx, pytest |
| LLM | Claude Opus 5.5, model id **`claude-opus-5-5`** (configurable via `ANTHROPIC_MODEL`) |
| Frontend | React 18, Vite, React Router 6, Tailwind CSS v4 (`@tailwindcss/vite`), plain `fetch` wrapper (no axios) |
| E2E / API tests | Playwright (JavaScript, Chromium only) |
| CI | GitHub Actions |
| Containers | Docker, docker-compose, Nginx (serves the built frontend and proxies `/api` to the backend) |
| DB migrations | **Flyway** (versioned SQL in `src/main/resources/db/migration`, `ddl-auto: validate`) |
| API docs | **springdoc-openapi** → Swagger UI at `/swagger-ui.html`, spec at `/v3/api-docs` |
| Code quality | JaCoCo coverage (backend, ≥80% line coverage on services), ESLint + Prettier (frontend, e2e), Ruff (AI engine) |
| UI extras | Recharts (charts), lucide-react (icons), Prism (`prism-react-renderer`) for code highlighting, Inter font |
| QA extras | `@axe-core/playwright` (accessibility), k6 (performance smoke), Playwright visual snapshots |

Use exact versions in `pom.xml`, `requirements.txt`, and `package.json` (no `^latest`). Commit lock files.

---

## 4. Repository layout

```
testpilot-ai/
├── testpilot_backend/
│   ├── src/main/java/com/testpilot/
│   │   ├── TestpilotApplication.java
│   │   ├── config/        SecurityConfig, TestpilotProperties, CorsConfig
│   │   ├── auth/          AuthController, AuthService, JwtService, User, UserRepository, dto/
│   │   ├── project/       Project, ProjectRepository, ProjectService, ProjectController, dto/
│   │   ├── story/         UserStory, UserStoryRepository, StoryService, StoryController, dto/
│   │   ├── testcase/      TestCase, TestCaseType, Priority, Source, TestCaseRepository,
│   │   │                  TestCaseService, TestCaseController, GenerationService,
│   │   │                  ExcelExportService, dto/
│   │   ├── generation/    GenerationRun, GenerationKind, GenerationStatus, GenerationRunRepository
│   │   ├── aiengine/      AiEngineClient, AiEngineException, dto/
│   │   ├── dashboard/     DashboardController, DashboardService, dto/
│   │   └── common/        ApiError, GlobalExceptionHandler, NotFoundException, ConflictException
│   ├── src/main/resources/application.yml
│   ├── src/test/java/com/testpilot/...   (see section 11)
│   ├── Dockerfile
│   └── pom.xml (+ mvnw)
├── ai_engine/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py        FastAPI app + routes
│   │   ├── config.py      settings from env
│   │   ├── schemas.py     Pydantic models (camelCase JSON)
│   │   ├── prompts.py     system + user prompt builders
│   │   ├── llm.py         Claude calls
│   │   └── mock.py        deterministic mock responses
│   ├── tests/             pytest
│   ├── requirements.txt, requirements-dev.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx, App.jsx, index.css
│   │   ├── services/api.js          fetch wrapper (base URL, JWT header, error parsing)
│   │   ├── contexts/AuthContext.jsx
│   │   ├── components/              Navbar, ProtectedRoute, Modal, Button, Badge, EmptyState, Spinner, TestCaseTable, TestCaseForm
│   │   └── pages/                   LoginPage, RegisterPage, DashboardPage, ProjectPage, StoryPage, NotFoundPage
│   ├── index.html, vite.config.js, package.json, Dockerfile, nginx.conf
├── e2e/
│   ├── tests/ui/*.spec.js
│   ├── tests/api/*.spec.js
│   ├── helpers/        (api helpers, test data builders)
│   ├── playwright.config.js, package.json
├── docs/       PLAN.md, BUILD_SPEC.md, TEST_PLAN.md, API.md, screenshots/
├── nginx/      (only if not using frontend/nginx.conf; keep one place)
├── scripts/    dev-local.sh  (starts all 3 services locally without Docker, mock AI)
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
├── LICENSE     (MIT, "Sheetal Khadanga")
└── README.md
```

---

## 5. Database schema

The schema is created by **Flyway migrations** (`V1__init.sql`, later `V2__...` if needed) and JPA
runs with `ddl-auto: validate`, so the database is versioned like in a real product. Migrations must
work on both MySQL 8 and H2 (MySQL mode). Add indexes on every foreign key and on `users.email`.
Table and column names below are what must exist.

### `users`
| Column | Type | Rules |
|---|---|---|
| id | BIGINT PK auto | |
| name | VARCHAR(100) | not null |
| email | VARCHAR(255) | not null, **unique**, stored lower-case |
| password_hash | VARCHAR(100) | BCrypt |
| created_at | TIMESTAMP | set on insert |

### `projects`
| Column | Type | Rules |
|---|---|---|
| id | BIGINT PK | |
| owner_id | BIGINT FK → users.id | not null |
| name | VARCHAR(120) | not null |
| description | VARCHAR(1000) | nullable |
| created_at, updated_at | TIMESTAMP | |

### `user_stories`
| Column | Type | Rules |
|---|---|---|
| id | BIGINT PK | |
| project_id | BIGINT FK → projects.id | not null, cascade delete |
| title | VARCHAR(200) | not null |
| description | TEXT | not null |
| acceptance_criteria | TEXT | nullable |
| created_at, updated_at | TIMESTAMP | |

### `test_cases`
| Column | Type | Rules |
|---|---|---|
| id | BIGINT PK | |
| story_id | BIGINT FK → user_stories.id | not null, cascade delete |
| title | VARCHAR(255) | not null |
| type | VARCHAR(20) | enum `POSITIVE`, `NEGATIVE`, `EDGE` |
| priority | VARCHAR(10) | enum `HIGH`, `MEDIUM`, `LOW` |
| preconditions | TEXT | nullable |
| steps | TEXT | not null; stored one step per line, exposed as `string[]` |
| expected_result | TEXT | not null |
| source | VARCHAR(10) | enum `AI`, `MANUAL` |
| created_at, updated_at | TIMESTAMP | |

### `generation_runs`
| Column | Type | Rules |
|---|---|---|
| id | BIGINT PK | |
| story_id | BIGINT FK → user_stories.id | cascade delete |
| kind | VARCHAR(20) | `TEST_CASES`, `PLAYWRIGHT` |
| status | VARCHAR(10) | `RUNNING`, `SUCCESS`, `FAILED` |
| model | VARCHAR(60) | model name reported by the AI engine (`mock` in mock mode) |
| test_case_count | INT | nullable |
| duration_ms | INT | nullable |
| error_message | VARCHAR(500) | nullable |
| created_at | TIMESTAMP | |

**Ownership rule:** every read or write checks that the resource belongs to the logged-in user. A
resource owned by someone else returns **404** (not 403), so IDs are not revealed.

---

## 6. Backend REST API

Base path `/api`. JSON in camelCase. Every endpoint except `register`, `login` and
`/actuator/health` needs `Authorization: Bearer <jwt>`.

### Error format (all errors)
```json
{ "status": 400, "message": "Validation failed", "errors": { "email": "must be a well-formed email address" }, "timestamp": "2026-10-23T10:00:00Z" }
```
`errors` appears only on validation errors. Status codes: 400 validation, 401 missing/invalid token
or bad credentials, 404 not found or not owned, 409 duplicate email, 502 AI engine failure.

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name (2-100), email (valid), password (8-72, at least one letter and one digit) }` | `201 { token, user: { id, name, email } }`; 409 if email exists |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }`; 401 `"Invalid email or password"` |
| GET | `/api/auth/me` | — | `200 { id, name, email }` |

JWT: HS256, subject = user id, claims `email`, `name`; expiry from `JWT_TTL_MINUTES` (default 720).

### Projects
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/projects` | — | `[{ id, name, description, storyCount, testCaseCount, createdAt, updatedAt }]` newest first |
| POST | `/api/projects` | `{ name (1-120), description (≤1000, optional) }` | 201 project |
| GET | `/api/projects/{id}` | — | project |
| PUT | `/api/projects/{id}` | same as POST | project |
| DELETE | `/api/projects/{id}` | — | 204 |

### Stories
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/projects/{projectId}/stories` | — | `[{ id, projectId, title, description, acceptanceCriteria, testCaseCount, createdAt, updatedAt }]` |
| POST | `/api/projects/{projectId}/stories` | `{ title (1-200), description (1-5000), acceptanceCriteria (≤5000, optional) }` | 201 story |
| GET | `/api/stories/{id}` | — | story |
| PUT | `/api/stories/{id}` | same as POST | story |
| DELETE | `/api/stories/{id}` | — | 204 |

### Test cases
`TestCase` JSON:
```json
{ "id": 1, "storyId": 3, "title": "Login with valid credentials", "type": "POSITIVE", "priority": "HIGH",
  "preconditions": "User account exists", "steps": ["Open /login", "Enter valid email and password", "Click Log in"],
  "expectedResult": "User lands on the dashboard", "source": "AI", "createdAt": "...", "updatedAt": "..." }
```

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/stories/{id}/test-cases` | — | list, ordered by priority (HIGH→LOW) then id |
| POST | `/api/stories/{id}/test-cases` | `{ title, type, priority, preconditions?, steps (1-30 items, each 1-500), expectedResult }` | 201, `source=MANUAL` |
| PUT | `/api/test-cases/{id}` | same body | 200 (source unchanged) |
| DELETE | `/api/test-cases/{id}` | — | 204 |
| POST | `/api/stories/{id}/generate` | — | `200 { runId, model, testCases: [...] }` — deletes old `AI` cases for the story, saves new ones, keeps `MANUAL` |
| POST | `/api/stories/{id}/playwright` | `{ baseUrl? }` (default `http://localhost:3000`) | `200 { runId, model, script }`; 400 if the story has no test cases |
| GET | `/api/stories/{id}/export` | — | `.xlsx` file, header `Content-Disposition: attachment; filename="<story-title-slug>-test-cases.xlsx"` |

**Excel layout:** sheet "Test Cases"; first row is the story title (bold); header row: `#`, `Title`,
`Type`, `Priority`, `Preconditions`, `Steps`, `Expected Result`, `Source`; steps numbered and joined
with line breaks; header bold with fill; wrapped text; frozen header row; sensible column widths.

### Dashboard
`GET /api/dashboard` →
```json
{ "projectCount": 2, "storyCount": 5, "testCaseCount": 41,
  "byType": { "POSITIVE": 15, "NEGATIVE": 18, "EDGE": 8 },
  "byPriority": { "HIGH": 12, "MEDIUM": 20, "LOW": 9 },
  "recentRuns": [ { "id": 9, "storyId": 3, "storyTitle": "Login", "kind": "TEST_CASES", "status": "SUCCESS", "model": "claude-opus-5-5", "testCaseCount": 9, "durationMs": 8123, "createdAt": "..." } ] }
```
`recentRuns`: last 10 runs across the user's stories.

### Generation flow (backend)
1. Load the story (owner check) → create a `generation_runs` row with `RUNNING`.
2. Call the AI engine (timeout from `AI_ENGINE_TIMEOUT_SECONDS`, default 120).
3. On success: in one transaction, delete the story's `AI` test cases, save the new ones, mark the run
   `SUCCESS` with count, duration and model.
4. On failure (timeout, non-2xx, invalid body): mark the run `FAILED` with a short error message
   (≤500 chars) and return **502** `"AI engine failed: <reason>"`. Existing test cases are untouched.

### Config (`application.yml`, all overridable by env)
`PORT=8080`, `DB_URL` (default H2 mem, MySQL mode), `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`
(default dev value, ≥32 bytes), `JWT_TTL_MINUTES=720`, `AI_ENGINE_URL=http://localhost:8000`,
`AI_ENGINE_TIMEOUT_SECONDS=120`, `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173`.

---

## 7. AI engine (FastAPI)

### Endpoints
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | — | `{ "status": "ok", "mode": "live" \| "mock", "model": "claude-opus-5-5" }` |
| POST | `/v1/test-cases/generate` | `{ title, description, acceptanceCriteria? }` | `{ model, testCases: [{ title, type, priority, preconditions, steps: [], expectedResult }] }` |
| POST | `/v1/playwright/generate` | `{ story: { title, description, acceptanceCriteria? }, testCases: [...], baseUrl }` | `{ model, script }` |

JSON is camelCase (Pydantic `alias_generator=to_camel`, `populate_by_name=True`). Validation: title
1-200, description 1-5000, at most 50 test cases in the Playwright request. Errors: 422 on bad input
(FastAPI default), **502** `{ "detail": "..." }` on LLM failure or refusal.

### Settings (env)
`AI_MODE` (`live` | `mock`; if `live` but `ANTHROPIC_API_KEY` is missing, fall back to `mock` and log
a warning), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-opus-5-5`, `LLM_TIMEOUT_SECONDS=90`.

### Live mode (Claude)
- Use the **official `anthropic` SDK** (`anthropic.Anthropic()` reads `ANTHROPIC_API_KEY`). Do not
  use raw HTTP and do not use an OpenAI-compatible shim.
- Test cases: `client.messages.create(...)` with **structured output**
  `output_config={"format": {"type": "json_schema", "schema": <schema>}}`, then parse the first text
  block with `json.loads` and validate with Pydantic. The schema must match the response model
  exactly (`additionalProperties: false`, all fields required, enums for `type`/`priority`,
  `steps` = array of strings, 3–15 test cases).
- Check `stop_reason`: `refusal` → 502 `"Model declined the request"`; `max_tokens` → 502
  `"Response was cut off"`.
- `max_tokens`: 16000. Do not send `temperature`/`top_p`/`top_k` (the current API rejects them),
  and do not send `thinking: {type: "disabled"}` or `budget_tokens` (rejected on this model).
- Catch SDK errors with typed exceptions (`anthropic.APITimeoutError`, `RateLimitError`,
  `APIStatusError`, `APIConnectionError`) and map them to a clear 502 message.
- Playwright script: a second call with plain text output; strip markdown code fences if present.
- Before writing this code, check the current Anthropic Python SDK docs for these exact parameter
  names.

### Prompts (`prompts.py`)
- **System (test cases):** "You are a senior QA engineer. Write clear, independent, executable manual
  test cases for the user story. Cover the happy path, validation and error handling, boundaries,
  and edge cases implied by the acceptance criteria. Each test case has one purpose. Steps are short
  imperative actions. Expected results are observable and specific. Do not invent features that the
  story does not mention." Plus the type and priority definitions.
- **User:** the story title, description and acceptance criteria inside clear delimiters.
- **System (Playwright):** "Write a single Playwright test file in JavaScript (`@playwright/test`).
  One `test()` per test case, inside one `test.describe()` named after the story. Use role and label
  locators (`getByRole`, `getByLabel`), not CSS. Use `baseURL` paths. Add a `// TODO` where a selector
  or test data cannot be known from the story. Output only code."

### Mock mode (`mock.py`)
- Test cases: return **exactly 6** deterministic cases built from the story title: 2 POSITIVE
  (HIGH, MEDIUM), 3 NEGATIVE (HIGH, MEDIUM, LOW), 1 EDGE (MEDIUM). Titles include the story title
  so the E2E test can assert on them, e.g. `"<title>: happy path with valid data"`. `model: "mock"`.
- Playwright: a deterministic template script with one `test()` per test case title.
- Same response schema as live mode.

---

## 8. Frontend

### Routes
| Path | Page | Auth |
|---|---|---|
| `/login` | LoginPage | public (redirect to `/` if logged in) |
| `/register` | RegisterPage | public |
| `/` | DashboardPage | protected |
| `/projects/:id` | ProjectPage | protected |
| `/stories/:id` | StoryPage | protected |
| `*` | NotFoundPage | — |

### Behaviour
- JWT stored in `localStorage` (`tp_token`), user in AuthContext. On any 401 from the API: clear the
  token and redirect to `/login`.
- `VITE_API_URL` (default empty, so calls go to the same origin). The Vite dev server proxies `/api`
  to `http://localhost:8080`.
- **Dashboard:** stat cards (projects, stories, test cases), small breakdown by type and priority
  (simple bars, no chart library needed), recent AI runs table, project cards grid, "New project"
  button that opens a modal. Empty state when there are no projects.
- **ProjectPage:** name and description (edit and delete with confirm), stories list with test case
  counts, "Add story" form (title, description, acceptance criteria).
- **StoryPage:** story details (edit and delete); **Generate test cases** button with a loading
  state ("Generating…", disabled while running); test case table with type and priority badges,
  expandable steps, edit (modal form), delete (confirm), "Add test case"; filter by type;
  **Export Excel** button (downloads file); **Generate Playwright script** button → code panel with
  a copy button; error banner when the AI fails (shows the 502 message).
- Clean, modern UI with Tailwind; responsive down to 375px; accessible labels on all inputs.
- Toasts or inline messages for success and error.

### Required `data-testid`s (E2E depends on them)
`login-email`, `login-password`, `login-submit`, `register-name`, `register-email`,
`register-password`, `register-submit`, `auth-error`, `nav-logout`, `nav-user`,
`stat-projects`, `stat-stories`, `stat-test-cases`, `new-project-button`, `project-name-input`,
`project-description-input`, `project-save`, `project-card` (repeated), `project-title`,
`project-delete`, `confirm-delete`, `add-story-button`, `story-title-input`,
`story-description-input`, `story-criteria-input`, `story-save`, `story-row` (repeated),
`story-title`, `generate-button`, `generation-error`, `test-case-row` (repeated),
`test-case-title`, `test-case-type`, `test-case-priority`, `test-case-edit`, `test-case-delete`,
`add-test-case-button`, `tc-title-input`, `tc-type-select`, `tc-priority-select`,
`tc-preconditions-input`, `tc-steps-input` (textarea, one step per line), `tc-expected-input`,
`tc-save`, `type-filter`, `export-button`, `playwright-button`, `playwright-script`, `copy-script`.

---

## 9. Docker & local run

- `testpilot_backend/Dockerfile`: multi-stage (Maven build → `eclipse-temurin:17-jre`), non-root user.
- `ai_engine/Dockerfile`: `python:3.12-slim`, non-root, `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- `frontend/Dockerfile`: multi-stage (node build → `nginx:alpine`), `nginx.conf` serves the SPA
  (fallback to `index.html`) and proxies `/api/` to `backend:8080`.
- `docker-compose.yml`: `mysql` (8.4, healthcheck, named volume), `ai-engine`, `backend` (depends on
  healthy mysql), `frontend` (port **3000**). Reads `.env`.
- `.env.example` documents every variable with safe placeholder values (`AI_MODE=mock` by default).
- `scripts/dev-local.sh`: runs the backend (H2), the AI engine (mock unless a key is set) and the
  Vite dev server together without Docker; Ctrl+C stops all three.

---

## 10. CI (`.github/workflows/ci.yml`)

Triggers: push to `main`/`develop`/`feature/**`, pull requests to `main`/`develop`.
Jobs:
1. **backend** — setup Java 17 (Temurin, Maven cache) → `./mvnw -B verify`
2. **ai-engine** — setup Python 3.12 (pip cache) → install → `pytest -q`
3. **frontend** — setup Node 20 (npm cache) → `npm ci` → `npm run build`
4. **e2e** (needs 1–3) — build the backend jar, start backend (H2) + AI engine (`AI_MODE=mock`) +
   frontend (`vite preview` with `/api` proxy) via Playwright `webServer` config, install Chromium,
   run `npx playwright test`, upload `playwright-report/` as an artifact (always).

The README shows the CI badge.

---

## 11. Tests (minimum required)

### Backend (JUnit 5 + Spring Boot Test + MockMvc, H2; mock the AI client with `@MockitoBean`)
- Auth: register success, duplicate email 409, invalid email and weak password 400, login success,
  wrong password 401, `/me` without a token 401, `/me` with a token 200
- Projects: CRUD happy path, validation 400, **user B gets 404 on user A's project**, counts are correct
- Stories: CRUD, 404 on another user's story, cascade delete when the project is deleted
- Test cases: manual create, update, delete, ordering by priority, validation (empty steps → 400)
- Generate: success replaces AI cases and keeps MANUAL ones and logs a SUCCESS run; AI failure → 502,
  FAILED run, old cases untouched
- Playwright: 400 when there are no test cases; success returns the script
- Export: returns xlsx content type, the workbook has a header row and N data rows (read it back with POI)
- Dashboard: counts and `recentRuns`

### AI engine (pytest + FastAPI TestClient)
- `/health` reports mock mode when no key is set
- Mock generate returns 6 cases with valid enums; titles contain the story title
- Input validation (empty title → 422)
- Prompt builder includes title, description and criteria
- Live path with the Anthropic client **mocked**: valid JSON → 200; `stop_reason="refusal"` → 502;
  invalid JSON → 502; SDK timeout → 502
- Playwright mock returns code containing `test(` once per case; the code-fence stripper works

### E2E (Playwright, mock AI) — `e2e/tests/ui`
1. `auth.spec.js`: register new user → lands on dashboard; logout; login; wrong password shows an
   error; protected route redirects to login
2. `projects.spec.js`: create project → card visible → open → edit name → delete with confirm
3. `stories-and-generation.spec.js`: add story → generate → 6 rows visible with badges → filter by
   NEGATIVE shows 3 → edit one test case → add a manual test case → regenerate → manual one still
   present → export downloads a `.xlsx` → Playwright script panel shows code → copy button works
4. `dashboard.spec.js`: stats reflect the created data

### API (Playwright `request`) — `e2e/tests/api`
- Auth contract (status codes and response shape)
- Ownership isolation (user B cannot read, update or delete user A's resources)
- Validation error format matches section 6

Each test creates its own user with a unique email (timestamp) so tests run independently and in
parallel.

---

## 12. Documentation

- **README.md**: badges (CI, license), one-line pitch, screenshots/GIF placeholders, features,
  architecture diagram (mermaid), tech stack, quick start (Docker and no-Docker), environment
  variables, running tests (each layer), project structure, API summary (link to `docs/API.md`),
  roadmap, author section with LinkedIn `https://www.linkedin.com/in/sheetal-khadanga`.
- **docs/API.md**: every endpoint with request and response examples.
- **docs/TEST_PLAN.md**: scope, approach, environments, a test case table (ID, title, type, priority,
  automated yes/no, spec file), and how to run.
- Keep **docs/PLAN.md** in sync if anything changes.

---

## 13. Quality bar

- Clean layered code: controller (HTTP only) → service (logic and transactions) → repository.
  DTOs as Java `record`s; entities never returned directly.
- Validation on every input; no stack traces in API responses.
- No secrets in git. `.env` is ignored; only `.env.example` is committed.
- Consistent formatting; meaningful names; small functions; comments only where the *why* is not obvious.
- Frontend: no console errors; loading, empty and error states on every page.
- Everything runs from a fresh clone by following the README.

---

## 14. Build order and commits

Work on `develop`. One commit (or a few) per phase with clear messages. Push after each phase.

| Phase | Work | Done when |
|---|---|---|
| 1 | Backend skeleton, config, entities, auth + JWT, projects, stories, test cases CRUD, error handling + tests | `./mvnw verify` passes |
| 2 | AI engine: schemas, prompts, mock, live Claude client, routes + pytest | `pytest` passes; `curl` against mock works |
| 3 | Backend ↔ AI: AiEngineClient, generate, playwright, generation runs, Excel export, dashboard + tests | `./mvnw verify` passes |
| 4 | Frontend: all pages, data-testids, proxy | `npm run build` passes; manual smoke works with `scripts/dev-local.sh` |
| 5 | E2E + API Playwright suites, TEST_PLAN.md | `npx playwright test` passes locally |
| 6 | Dockerfiles, docker-compose, `.env.example`, CI workflow | `docker compose up` works (if Docker is running); CI green on GitHub |
| 7 | README, API.md, polish | fresh-clone instructions verified |

At the end, open a pull request `develop → main` titled "TestPilot AI v1.0" with a summary of what
was built and how it was tested. Do **not** merge it; the owner merges it.

---

## 15. Definition of done

- [ ] All four CI jobs green on GitHub
- [ ] `./mvnw verify`, `pytest`, `npm run build` and `npx playwright test` pass locally
- [ ] App works end to end with `scripts/dev-local.sh` in mock mode
- [ ] With a real `ANTHROPIC_API_KEY` and `AI_MODE=live`, generating test cases for a sample story
      returns sensible, schema-valid cases (manual check, documented in the README)
- [ ] README lets a stranger run the project in under 10 minutes
- [ ] No secrets, no TODOs left in app code (TODOs inside *generated* Playwright scripts are expected)
