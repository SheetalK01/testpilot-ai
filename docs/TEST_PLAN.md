# TestPilot AI — Test Plan

| | |
|---|---|
| **Product** | TestPilot AI v1.0 (web app, REST API, AI engine) |
| **Author** | Sheetal Khadanga, QA Engineer |
| **Status** | All suites automated and green in CI |

## 1. Objective

Give confidence that TestPilot AI does what its users need: register and log in safely, manage
projects and stories, generate **correct, schema-valid** test cases with AI, edit and export them,
and see accurate dashboard numbers. Equally important: **one user can never see or change another
user's data**, failures of the AI provider are handled gracefully, and the UI is accessible.

## 2. Scope

### In scope
| Area | What is tested |
|---|---|
| Authentication | Register, login, logout, JWT validation (signature, expiry, algorithm), protected routes |
| Projects / stories / test cases | CRUD, ordering, counts, cascades, validation boundaries |
| AI generation | Replace-AI-keep-manual semantics, run history, 502 handling, Playwright script, mock vs live mode |
| Export | `.xlsx` content type, filename, workbook structure (read back with Apache POI) |
| Dashboard | Totals, by-type and by-priority counts, recent runs |
| Security | IDOR (404 not 403), token tampering, SQL injection and XSS payloads, password exposure, CORS |
| Accessibility | WCAG 2.1 A/AA via axe-core on every page, light and dark mode; keyboard focus in dialogs |
| Visual | Screenshot regression of landing, dashboard and story pages |
| Performance | Login + list projects + dashboard under 10 concurrent users |
| AI quality | Schema validity, type coverage, acceptance-criteria coverage and latency over 5 reference stories |

### Out of scope
- Features the product does not have (social login, password reset, teams, running generated scripts).
- Load/stress beyond the smoke profile, chaos and failover testing.
- Cross-browser runs beyond Chromium (Playwright config is ready to add Firefox/WebKit projects).
- Live Claude calls in CI: they cost money and are non-deterministic. CI uses the deterministic mock;
  live behaviour is covered by unit tests with the Anthropic client mocked, plus the manual
  `eval/run_eval.py` run.

## 3. Strategy — the test pyramid

```
                 ┌──────────────┐
                 │  E2E UI (27) │  Playwright, Page Object Model, real browser
               ┌─┴──────────────┴─┐
               │ API + security   │  Playwright request context against the running backend (73)
               │ a11y (14) visual │
             ┌─┴──────────────────┴─┐
             │ Integration (MockMvc)│  Spring context + H2 + real security chain (47)
           ┌─┴──────────────────────┴─┐
           │ Unit (JUnit, pytest)      │  services, JWT, AI client, prompts, scorers (45 + 51)
           └───────────────────────────┘
```

- **Fast feedback at the bottom.** Business rules (ownership, replace-AI-keep-manual, validation,
  error mapping) are tested at unit and integration level where they run in milliseconds.
- **API tests own the contract.** Status codes, response shapes, boundaries and the error format are
  checked over real HTTP, which also exercises CORS, JSON parsing and the security filter chain.
- **UI tests cover journeys, not rules.** They follow what a user does (register → create project →
  generate → filter → edit → export) and set up data through the API so each test stays short.
- **Independence.** Every test registers its own user with a unique email, so tests run in parallel
  and in any order, and never need cleanup.
- **Determinism.** The AI engine's mock mode returns exactly six cases (2 positive, 3 negative,
  1 edge), so UI and API assertions can be exact.
- **Tags** for selective runs: `@smoke`, `@regression`, `@api`, `@security`, `@a11y`, `@visual`.

## 4. Environments

| Environment | How | Data |
|---|---|---|
| Local | `scripts/dev-local.sh`, or `npx playwright test` (its `webServer` starts everything) | H2 in-memory, AI mock |
| CI | GitHub Actions: each job starts the services it needs | H2 in-memory, AI mock |
| Docker | `docker compose up` (Nginx + Spring Boot + FastAPI + MySQL 8.4); CI runs the API/security suite and k6 here | MySQL volume, AI mock or live |
| AI evaluation | `AI_MODE=live python -m eval.run_eval` | Real Claude calls, 5 reference stories |

Browser: Chromium (Desktop Chrome profile, 1280×720; visual tests 1280×800).

## 5. Entry and exit criteria

**Entry:** the build compiles; lint (ESLint, Prettier, Ruff) passes; services start and `/health`
endpoints respond.

**Exit (release):**
- 100 % of automated tests pass (no skipped tests without a linked reason).
- Backend line coverage on services ≥ 80 % (enforced by the JaCoCo gate in `./mvnw verify`).
- Zero serious or critical axe violations.
- k6 thresholds met: p95 < 500 ms, error rate < 1 %.
- No open defect of severity High or Critical.

## 6. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LLM returns malformed or off-schema output | Broken data, 500s | Structured output with a closed JSON schema, Pydantic validation in the AI engine, Bean Validation again in the backend; tested with invalid JSON, wrong enums, empty steps, too few/many cases |
| LLM refuses, times out or is rate limited | User sees a crash | Typed SDK errors → clear 502 messages; run logged as FAILED; existing cases untouched (unit + API + UI tests) |
| Non-deterministic AI breaks tests | Flaky CI | Mock mode for every automated suite; live quality checked separately by the eval script |
| IDOR / data leak between users | Severe | Owner check in every query; 404 for other users' resources; dedicated security suite |
| Token forgery or expiry bypass | Account takeover | Tests for tampered payload, wrong secret, `alg: none`, expired token |
| XSS via stored story text | Session theft | React escaping, no `dangerouslySetInnerHTML` (ESLint `react/no-danger`), test injects `<img onerror>` and `<script>` and checks nothing runs |
| Accessibility regressions | Excludes users | axe on every page in both themes, focus-trap test for dialogs |
| UI drift | Unnoticed layout breakage | Visual snapshots with masked dynamic values |
| H2 hides MySQL-specific behaviour (locking, types) | Production-only bugs | API/security suite also runs against the MySQL stack in CI; this caught an InnoDB gap-lock deadlock under concurrent generations |
| Visual snapshots differ per OS | False failures | Baselines stored per platform (`__snapshots__/{platform}`) |

## 7. Test cases (automated E2E, API, security, accessibility and visual)

Parameterised boundary tests are grouped into one row; the count is in brackets. Run
`npx playwright test --list` for the full list of 118 individual tests.

| ID | Test case | Suite | Type | Priority | Automated | Spec file |
|---|---|---|---|---|---|---|
| UI-01 | Authentication › register lands on the dashboard | UI | Functional | P1 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-02 | Authentication › login with valid credentials | UI | Functional | P1 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-03 | Authentication › logout returns to the landing page and clears the session | UI | Functional | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-04 | Authentication › wrong password shows an error and stays on login | UI | Negative | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-05 | Authentication › protected route redirects to login, then back after logging in | UI | Functional | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-06 | Authentication › register shows inline validation before calling the API | UI | Negative / boundary | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-07 | Authentication › registering an existing email shows the server error | UI | Negative | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-08 | Authentication › show/hide password toggles the input type | UI | Functional | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-09 | Authentication › an expired session sends the user back to login | UI | Negative | P2 | ✅ | `e2e/tests/ui/auth.spec.js` |
| UI-10 | Dashboard › stats, charts and recent runs reflect my data | UI | Functional | P1 | ✅ | `e2e/tests/ui/dashboard.spec.js` |
| UI-11 | Dashboard › a new user sees empty states | UI | Negative | P2 | ✅ | `e2e/tests/ui/dashboard.spec.js` |
| UI-12 | Landing page › shows the pitch and the CTA goes to register | UI | Functional | P1 | ✅ | `e2e/tests/ui/landing.spec.js` |
| UI-13 | Landing page › "See how it works" jumps to the steps section | UI | Functional | P2 | ✅ | `e2e/tests/ui/landing.spec.js` |
| UI-14 | Landing page › lists the four features and links to the author | UI | Functional | P2 | ✅ | `e2e/tests/ui/landing.spec.js` |
| UI-15 | Landing page › theme toggle switches to dark mode and remembers it | UI | Functional | P2 | ✅ | `e2e/tests/ui/landing.spec.js` |
| UI-16 | Landing page › unknown routes show the 404 page | UI | Negative | P2 | ✅ | `e2e/tests/ui/landing.spec.js` |
| UI-17 | Projects › create, open, edit and delete a project | UI | Functional | P1 | ✅ | `e2e/tests/ui/projects.spec.js` |
| UI-18 | Projects › cancelling the delete dialog keeps the project | UI | Negative | P2 | ✅ | `e2e/tests/ui/projects.spec.js` |
| UI-19 | Projects › empty name shows a validation message | UI | Negative / boundary | P2 | ✅ | `e2e/tests/ui/projects.spec.js` |
| UI-20 | Projects › the new project dialog traps focus and closes with Escape | UI | Functional | P2 | ✅ | `e2e/tests/ui/projects.spec.js` |
| UI-21 | Projects › adding a story opens it | UI | Functional | P2 | ✅ | `e2e/tests/ui/projects.spec.js` |
| UI-22 | Stories and AI generation › generate, filter, edit, add manual, regenerate, export and Playwright | UI | Functional | P1 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| UI-23 | Stories and AI generation › expanding a case shows its steps and expected result | UI | Functional | P2 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| UI-24 | Stories and AI generation › deleting a test case asks for confirmation | UI | Functional | P2 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| UI-25 | Stories and AI generation › the test case form validates required fields | UI | Negative / boundary | P2 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| UI-26 | Stories and AI generation › an AI failure shows an error banner and keeps existing cases | UI | Negative | P2 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| UI-27 | Stories and AI generation › editing and deleting the story | UI | Functional | P2 | ✅ | `e2e/tests/ui/stories-and-generation.spec.js` |
| API-01 | API · auth › POST /auth/register → 201 with token and user | API | Functional | P1 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-02 | API · auth › POST /auth/register with a duplicate email → 409 | API | Negative | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-03 | API · auth › POST /auth/register validates every field → 400 with field errors | API | Negative / boundary | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-04 | API · auth: register boundary (9 boundary/negative cases) | API | Negative / boundary | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-05 | API · auth › POST /auth/login → 200 with token; email is case-insensitive | API | Functional | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-06 | API · auth › POST /auth/login with a wrong password or unknown email → 401, same message | API | Negative | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-07 | API · auth › GET /auth/me returns the current user | API | Functional | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-08 | API · auth › every response carries an X-Request-Id, and a client-supplied one is echoed | API | Functional | P2 | ✅ | `e2e/tests/api/auth.api.spec.js` |
| API-09 | API · projects › CRUD: POST 201 → GET 200 → PUT 200 → DELETE 204 → GET 404 | API | Negative | P1 | ✅ | `e2e/tests/api/projects.api.spec.js` |
| API-10 | API · projects › GET /projects lists newest first with story and test case counts | API | Functional | P2 | ✅ | `e2e/tests/api/projects.api.spec.js` |
| API-11 | API · projects: validation (6 boundary/negative cases) | API | Negative / boundary | P2 | ✅ | `e2e/tests/api/projects.api.spec.js` |
| API-12 | API · projects › malformed JSON → 400 "Malformed JSON request" | API | Negative | P2 | ✅ | `e2e/tests/api/projects.api.spec.js` |
| SEC-01 | IDOR: another user's resources are invisible (404, not 403) › projects: read, update, delete | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-02 | IDOR: another user's resources are invisible (404, not 403) › stories: read, update, delete, generate, export, playwright | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-03 | IDOR: another user's resources are invisible (404, not 403) › update and delete of test cases | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-04 | IDOR: another user's resources are invisible (404, not 403) › the owner's data is untouched after the attempts | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-05 | Every protected endpoint without a token → 401 (8 endpoints) | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-06 | Authentication is enforced › a tampered token → 401 | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-07 | Authentication is enforced › a token signed with another secret → 401 | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-08 | Authentication is enforced › an expired token → 401 | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-09 | Authentication is enforced › a "none" algorithm token → 401 | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-10 | Security › the password is never returned by any auth endpoint | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-11 | Security › SQL injection payloads are stored as plain text and change nothing | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-12 | Security › a `<script>` payload is stored as-is and rendered as text, never executed | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| SEC-13 | Security › CORS allows the frontend origin and rejects unknown origins | Security | Security | P1 | ✅ | `e2e/tests/api/security.api.spec.js` |
| API-13 | API · stories › CRUD with the documented response shape | API | Functional | P1 | ✅ | `e2e/tests/api/stories.api.spec.js` |
| API-14 | API · stories › deleting a story removes its test cases (cascade) | API | Functional | P2 | ✅ | `e2e/tests/api/stories.api.spec.js` |
| API-15 | API · stories: validation (8 boundary/negative cases) | API | Negative / boundary | P2 | ✅ | `e2e/tests/api/stories.api.spec.js` |
| API-16 | API · test cases, generation, export and dashboard › POST creates a MANUAL case with the documented shape; PUT keeps the source | API | Functional | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-17 | API · test cases, generation, export and dashboard › GET orders cases HIGH → MEDIUM → LOW, then by id | API | Functional | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-18 | API · test cases, generation, export and dashboard: validation (9 boundary/negative cases) | API | Negative / boundary | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-19 | API · test cases, generation, export and dashboard › boundaries that are allowed: 30 steps of 500 characters, 255-character title | API | Functional | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-20 | API · test cases, generation, export and dashboard › POST /generate returns six mock AI cases; regenerating keeps MANUAL cases | API | Functional | P1 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-25 | API · test cases, generation, export and dashboard › parallel generations (different stories and the same story) all succeed — MySQL deadlock regression | API | Functional | P1 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-21 | API · test cases, generation, export and dashboard › POST /playwright → 400 without cases, then 200 with a script | API | Negative | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-22 | API · test cases, generation, export and dashboard › POST /playwright rejects a non-http base URL | API | Negative | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-23 | API · test cases, generation, export and dashboard › GET /export returns an .xlsx attachment | API | Functional | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| API-24 | API · test cases, generation, export and dashboard › GET /dashboard has every key and counts my data | API | Functional | P2 | ✅ | `e2e/tests/api/test-cases.api.spec.js` |
| A11Y-01 | axe WCAG 2.1 AA: landing page (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-02 | axe WCAG 2.1 AA: login page, including validation errors (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-03 | axe WCAG 2.1 AA: register page (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-04 | axe WCAG 2.1 AA: dashboard with data (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-05 | axe WCAG 2.1 AA: dashboard with the new project dialog open (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-06 | axe WCAG 2.1 AA: project page (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| A11Y-07 | axe WCAG 2.1 AA: story page with cases, expanded steps and Playwright code (light + dark) | Accessibility | Accessibility | P1 | ✅ | `e2e/tests/a11y/accessibility.spec.js` |
| VIS-01 | signed in › dashboard | Visual | Visual | P2 | ✅ | `e2e/tests/visual/visual.spec.js` |
| VIS-02 | signed in › story page | Visual | Visual | P2 | ✅ | `e2e/tests/visual/visual.spec.js` |
| VIS-03 | signed in › story page in dark mode | Visual | Visual | P2 | ✅ | `e2e/tests/visual/visual.spec.js` |
| VIS-04 | Visual regression › landing page | Visual | Visual | P2 | ✅ | `e2e/tests/visual/visual.spec.js` |

### Lower-level suites

| Suite | Tool | Count | Highlights |
|---|---|---|---|
| Backend API integration | JUnit 5 + MockMvc + H2 | 47 | Auth, CRUD, IDOR, cascades, ordering, validation, generation success/failure, Playwright, Excel read-back, dashboard |
| Backend unit | JUnit 5 + Mockito | 45 | Services, `JwtService` (expiry, wrong key), AI client over a real local HTTP server (timeouts, error bodies, contract violations) |
| AI engine | pytest | 51 | Health/mode, mock shape, 422 validation, prompt builder, live path with mocked Anthropic client (valid, refusal, cut-off, invalid JSON, timeout, rate limit, 5xx), fence stripper, eval scorers |
| Performance | k6 | 1 scenario | 10 VUs × 30 s, p95 < 500 ms, errors < 1 % |

## 8. How to run

```bash
# Backend: unit + integration + coverage gate (report: testpilot_backend/target/site/jacoco/index.html)
cd testpilot_backend && ./mvnw verify

# AI engine
cd ai_engine && .venv/bin/pytest --cov && .venv/bin/ruff check .

# Playwright: starts AI engine (mock), backend and frontend automatically if they are not running
cd e2e && npm ci && npx playwright install chromium
npx playwright test                    # everything
npx playwright test --project=ui       # or: api | a11y | visual
npx playwright test --grep @smoke      # by tag: @smoke @regression @api @security @a11y @visual
npx playwright show-report             # HTML report with traces, screenshots and videos of failures

# Performance (backend must be running)
k6 run perf/smoke.js

# AI quality evaluation (real Claude calls; needs ANTHROPIC_API_KEY in .env)
cd ai_engine && AI_MODE=live .venv/bin/python -m eval.run_eval
```

Visual baselines are per platform. To create or refresh them after an intended UI change:
`npx playwright test --project=visual --update-snapshots`.

## 9. Reporting

- **Playwright:** HTML report (`e2e/playwright-report`) with trace, screenshot and video for every
  failure, plus JUnit XML (`e2e/test-results/junit.xml`). CI uploads the report as an artifact on
  every run, pass or fail.
- **Backend:** Surefire reports and the JaCoCo coverage report, uploaded by CI.
- **AI engine:** pytest summary with coverage; eval results written to `ai_engine/eval/results.md`.
- **Defects:** logged with steps to reproduce, expected vs actual, severity, the request ID from the
  `X-Request-Id` header (searchable in both backend and AI engine logs), and the Playwright trace.
