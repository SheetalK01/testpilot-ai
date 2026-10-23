# TestPilot AI — Interview notes

Key design decisions, why they were made, what they cost, and what would change at scale. Each
point names the file where it can be shown.

## 1. Architecture

**Three services: React SPA → Spring Boot API → Python AI engine.**
- *Why:* each layer uses the best tool. Java/Spring for a typed, secure, transactional API;
  Python for the LLM integration where the SDK, Pydantic and prompt iteration are most convenient.
- *Isolation:* the AI engine is **stateless** and holds the only copy of the Anthropic API key. It
  never sees the database and never talks to the browser. The backend checks the JWT and ownership
  before anything reaches the AI.
- *Trade-off:* one more network hop and one more deployable. Worth it because LLM latency (seconds)
  dwarfs an internal HTTP call (milliseconds), and the AI part can be scaled, rate-limited or swapped
  independently.
- *At scale:* make generation asynchronous (queue + worker, client polls or uses SSE), add a
  per-user rate limit and a cost budget, and cache results per story version.

**Request IDs across services** (`RequestIdFilter.java`, `ai_engine/app/main.py`, `nginx.conf`).
Every request gets an `X-Request-Id` (reused from the client or generated), put into the logging
MDC, returned in the response, included in error bodies and forwarded to the AI engine. One ID
finds the browser request, the backend log line and the AI engine's JSON log line. Incoming IDs are
validated against a safe pattern to prevent log injection.

## 2. Backend (Java 17, Spring Boot 4)

**Stateless JWT instead of server sessions** (`SecurityConfig.java`, `JwtService.java`).
- No session store, so any instance can serve any request (horizontal scaling without sticky
  sessions) and no CSRF exposure because no cookies are used.
- *Trade-off:* a JWT cannot be revoked before it expires. Mitigations at scale: short-lived access
  tokens plus refresh tokens, or a deny-list of token IDs. Refresh tokens were explicitly out of scope.

**HS256 (shared secret) instead of RS256.**
Only one service issues *and* validates tokens, so a symmetric key is simpler and safe. The secret
comes from `JWT_SECRET` (validated ≥ 32 bytes at startup). If other services had to validate tokens
without being able to mint them, I would switch to RS256 and publish a JWKS endpoint.

**Spring Security OAuth2 resource server (Nimbus) rather than a hand-written JWT filter.**
Signature, expiry, not-before and issuer are validated by battle-tested code. The decoder only
accepts HS256, so `alg: none` and algorithm-confusion tokens are rejected (there is an E2E test for
that).

**Ownership → 404, not 403** (`ProjectRepository.findByIdAndOwnerId`, `findOwned` queries).
Every query is scoped by owner in the `WHERE` clause. Returning 404 for someone else's resource means
an attacker cannot tell "exists but not yours" from "does not exist", so IDs cannot be enumerated.
The IDOR tests in `e2e/tests/api/security.api.spec.js` and `*ApiTest.java` prove it for every route.

**DTOs as Java records; entities never leave the service layer.**
The API contract is explicit and stable, the password hash can never be serialised by accident,
and lazy-loading surprises cannot happen during JSON rendering (`open-in-view` is off).

**Validation at the edge, one error format everywhere** (`GlobalExceptionHandler.java`).
Bean Validation on every request body; a single `ApiError` shape for 400/401/404/409/502, including
security errors raised before Spring MVC (`ApiErrorWriter`). Unknown enum values become field
errors instead of a generic "malformed JSON". No stack traces leak.

**Transactions around the AI call** (`GenerationService.java`).
The slow AI call (up to 120 s) runs **outside** any database transaction, so it does not hold a
connection. Sequence: short transaction to insert a `RUNNING` run → AI call → short transaction that
deletes old AI cases, inserts the new ones and marks the run `SUCCESS` atomically. On failure the run
becomes `FAILED` with a reason and existing data is untouched.

**A real bug the tests found: an InnoDB deadlock** (`TestCaseService.replaceAiCases`,
`StoryService.lockForUpdate`). Unit and integration tests run on H2 and passed. When I ran the API
suite in parallel against the Docker stack (MySQL 8.4), two generations for *different* stories
deadlocked. `DELETE FROM test_cases WHERE story_id = ? AND source = 'AI'` uses a secondary index, and
under REPEATABLE READ InnoDB takes **gap locks**; two transactions holding neighbouring gaps then
block each other's inserts. Fix: lock the story row first (`SELECT … FOR UPDATE` by primary key,
which also serialises generations of the *same* story so they can't duplicate cases), then delete old
AI cases **by primary key** (record locks only). A regression test fires seven parallel generations,
and CI now runs the API suite against MySQL, not just H2.

**AI output is validated twice.** Pydantic in the AI engine, then Bean Validation on the backend's
`AiTestCase` record. Defence in depth: the backend never trusts another service blindly.

**Flyway + `ddl-auto: validate`.**
Schema changes are versioned SQL reviewed like code; Hibernate only checks that the entities match.
The same migration runs on H2 (MySQL mode) for tests and on MySQL 8.4 in Docker. Indexes on every
foreign key and on `generation_runs.created_at` (dashboard sort); `ON DELETE CASCADE` so deleting a
project removes its stories, cases and runs in the database, not in a loop of Java deletes.

**No N+1 queries.** Project and story lists use one JPQL query with correlated `count` subqueries
(`ProjectRepository.SUMMARY_SELECT`); dashboard counts are `GROUP BY` queries.

**User-enumeration and timing.** Login returns the same message for unknown email and wrong
password, and runs a BCrypt check against a dummy hash when the email is unknown, so response time
does not reveal whether an account exists (`AuthService.java`).

## 3. AI engine (Python, FastAPI, Claude)

**Structured output instead of "please return JSON".**
`messages.create(..., output_config={"format": {"type": "json_schema", "schema": ...}})` constrains
the model to the schema (closed objects, enums for type and priority, required fields). The text is
parsed with `json.loads` and validated with Pydantic, which also enforces what the schema engine does
not (3–15 cases, non-empty steps, length limits).

**Explicit failure handling** (`app/llm.py`). `stop_reason == "refusal"` → 502 "Model declined the
request"; `"max_tokens"` → 502 "Response was cut off"; typed SDK errors (`APITimeoutError`,
`RateLimitError`, `AuthenticationError`, `APIStatusError`, `APIConnectionError`) map to clear
messages, caught most-specific first. SDK retries are disabled so the call fits inside the backend's
120 s timeout.

**Prompt design** (`app/prompts.py`, documented at the top of the file). A role and a quality bar
(one purpose per case, imperative steps, observable expected results), explicit definitions of each
type and priority so labels are consistent, "never invent features" to stop hallucinated
requirements, and story fields inside XML-style tags so user text is treated as data, not
instructions.

**Mock mode.** `AI_MODE=mock` returns exactly six deterministic cases with a short delay. Tests, CI
and E2E are fast, free and repeatable; `AI_MODE=live` without a key falls back to mock with a warning
instead of crashing.

**Measuring AI quality** (`eval/run_eval.py`). Five reference stories scored on schema validity,
coverage of all three types, empty steps, duplicate titles, acceptance-criteria keyword coverage and
latency. It turns "the prompt seems better" into numbers before and after a prompt change.

## 4. Frontend (React 18, Tailwind v4)

- **Design tokens as CSS variables**, light and dark sets, mapped into Tailwind with `@theme inline`.
  Components use semantic classes (`bg-surface`, `text-muted`), so dark mode is one variable swap
  and every pair is checked for WCAG AA contrast (axe caught one token at 4.4:1, which I fixed).
- **Accessibility built in:** labelled inputs with `aria-invalid`/`aria-describedby`, focus moves to
  the first invalid field, modal focus trap with Esc and focus return, skip link, `prefers-reduced-motion`.
- **Plain `fetch` wrapper** (`services/api.js`): adds the token, maps errors to `ApiError`, and on a
  401 clears the token and routes to `/login`. No state library needed at this size; `useResource`
  handles loading, cancellation and reloads.
- **Security:** React escapes all output; `react/no-danger` is an ESLint error; the CSP forbids
  inline scripts (the theme bootstrap lives in `public/theme.js` for that reason).
- **Optimistic delete** with rollback on failure; skeletons for loading, empty states, error banners.

## 5. QA automation

**Test pyramid.** Most checks are fast unit/integration tests (JUnit + MockMvc, pytest); API tests own
the HTTP contract; a smaller set of UI journeys proves the screens work together. See
[`TEST_PLAN.md`](TEST_PLAN.md).

**Page Object Model + custom fixtures** (`e2e/pages`, `e2e/fixtures/index.js`). Page objects hold
locators and actions; tests read like scenarios. Fixtures give each test a fresh user (unique email),
an API client and an already-authenticated page (token injected once per tab), so tests are
independent, parallel and need no cleanup. Data is created through the API, not the UI, to keep UI
tests short and focused.

**Stable locators.** `data-testid` for app-specific elements, role and label locators where they
express intent (`getByRole('dialog', { name: 'New project' })`).

**Deterministic AI in tests.** Mock mode makes "6 rows, 3 negative" exact assertions possible. For
failure paths in the UI, the test stubs the network (`page.route` → 502) instead of breaking a real
service.

**Security, accessibility, visual and performance** each have their own suite and tag, so a pipeline
or a developer can run just what is relevant (`--grep @security`).

**Flakiness controls:** web-first assertions (no sleeps), traces/videos on failure, retries only on
CI, `--repeat-each` used locally to prove stability, visual baselines per platform with dynamic data
masked.

## 6. DevOps

- **Multi-stage Dockerfiles** keep build tools out of runtime images; all containers run as non-root
  and have health checks; Compose starts services in dependency order on *healthy*, not just
  *started*.
- **Nginx** serves the SPA (history fallback), proxies `/api`, sets security headers and caches
  fingerprinted assets for a year while forcing `index.html` revalidation.
- **CI stages:** lint → backend (tests + coverage gate) → AI engine → frontend build → E2E (all
  Playwright projects, report uploaded always) → perf (k6 against the real Docker Compose stack, which
  also proves the images and MySQL migration work). Caches for Maven, pip and npm.

## 7. What I would change at scale

| Area | Today | At scale |
|---|---|---|
| Generation | Synchronous HTTP call (seconds) | Queue + workers, SSE progress, idempotency key per request |
| Cost and abuse | None needed for a demo | Per-user rate limits and monthly token budget, usage dashboard |
| Auth | Access token only | Refresh tokens, revocation, maybe an identity provider (OIDC) |
| Data | Single MySQL | Read replicas for dashboards, pagination on all lists |
| Observability | Request-ID logs | OpenTelemetry traces, metrics (latency, AI failures, tokens), alerts |
| Tests | One browser | Firefox/WebKit projects, contract tests between backend and AI engine |
| Deploy | Compose | Container registry, staging environment, blue/green or rolling deploys |

---

## 8. Likely interview questions

1. **Why does another user's project return 404 and not 403?**
   403 confirms the ID exists. 404 for both "missing" and "not yours" prevents ID enumeration. The
   owner is part of every query's `WHERE` clause, so there is no code path that loads first and
   checks later.

2. **How do you know a JWT was not tampered with?**
   The signature is verified with the HS256 secret; the decoder only accepts HS256, then checks
   expiry and issuer. Tests cover a modified payload, a token signed with another secret, an expired
   token and `alg: none` — all 401.

3. **How do you stop the LLM from returning garbage?**
   JSON-schema structured output, `stop_reason` checks, `json.loads` + Pydantic validation in the AI
   engine, then Bean Validation again in the backend. Any failure becomes a clean 502 and a FAILED run.

4. **What happens if Claude times out in the middle of a generation?**
   The SDK raises `APITimeoutError` → 502 from the AI engine → `AiEngineException` in the backend →
   run marked FAILED with the reason → user sees "AI engine failed: …" in a banner. Existing test
   cases are not touched because the delete/insert happens only after a successful call.

5. **Why is the AI call outside the database transaction?**
   It can take two minutes. Holding a transaction (and a pooled connection) that long would exhaust
   the pool under load. Two short transactions around the call keep the database work atomic.

6. **How does "regenerate keeps manual cases" work?**
   Each case has a `source` (AI/MANUAL). Regeneration runs `delete … where story = ? and source = AI`
   and inserts the new AI cases in the same transaction. A unit test checks the order of operations;
   API and UI tests check the result.

7. **How do you test something non-deterministic like an LLM?**
   Split it: deterministic mock mode for every automated functional test; the live path is unit-tested
   with the Anthropic client mocked (valid, refusal, cut-off, invalid JSON, timeouts); real quality is
   measured separately with the evaluation script on reference stories.

8. **Why the Page Object Model, and what goes in a page object?**
   Locators and user-level actions (`createProject`, `generate`), not assertions about business rules.
   When the UI changes, one file changes instead of twenty tests.

9. **How do you keep E2E tests independent and parallel?**
   Every test registers its own user with a unique email and creates data through the API. No shared
   state, no ordering, no cleanup; the suite runs fully parallel.

10. **How do you avoid flaky tests?**
    Web-first assertions that auto-wait, no fixed sleeps, deterministic data, network stubs for
    failure cases, retries only on CI (so local runs surface flakiness), and `--repeat-each` to prove
    stability before merging.

11. **What does your accessibility testing catch, and what doesn't it?**
    axe catches contrast, missing labels, ARIA misuse and focusable hidden content (it found two real
    issues here). It cannot judge reading order or whether alt text is meaningful, so keyboard and
    focus behaviour have their own tests and manual checks.

12. **How do visual tests avoid false failures?**
    Fixed data, animations disabled, dynamic values (greeting, timestamps, durations) masked, a 1 %
    pixel tolerance, and baselines per platform because fonts render differently on macOS and Linux.

13. **Why Flyway with `ddl-auto: validate` instead of letting Hibernate create tables?**
    Migrations are reviewable, repeatable and identical in every environment; Hibernate auto-DDL can
    silently drop or alter columns. `validate` fails fast if code and schema disagree.

14. **How do you prevent XSS?**
    React escapes everything it renders, `dangerouslySetInnerHTML` is banned by lint, the CSP blocks
    inline scripts, and a test stores `<script>` and `<img onerror>` payloads and verifies they render
    as text and never execute.

15. **And SQL injection?**
    All data access uses Spring Data / JPQL with bound parameters; there is no string-built SQL. A test
    stores a classic injection payload and checks it comes back verbatim and nothing else changed.

16. **How would you trace a slow request across services?**
    Take the `X-Request-Id` from the response (or the error body), grep the backend log (it is in the
    log pattern) and the AI engine's JSON logs; both log durations. Next step would be OpenTelemetry.

17. **What does the CI pipeline guarantee before merge?**
    Lint and formatting, all backend tests with an 80 % service coverage gate, AI engine tests, a
    production frontend build, all Playwright suites against a real stack, and a k6 smoke against the
    Dockerised stack with p95 < 500 ms.

18. **Why k6 thresholds of p95 < 500 ms and < 1 % errors?**
    These endpoints do no heavy work, so anything slower signals a regression (missing index, N+1,
    pool starvation). The check is a smoke gate, not a capacity test.

19. **Why is the AI engine a separate Python service rather than calling Claude from Java?**
    Isolation of the API key and of a slow, failure-prone dependency; independent scaling; and Python
    is where prompt and eval work is fastest. The backend talks to it through a small, validated
    contract with timeouts.

20. **Tell me about a bug your tests found.**
    Concurrent generations deadlocked on MySQL but not on H2: a range `DELETE` on a secondary index
    took InnoDB gap locks that blocked the other transaction's inserts. I reproduced it with parallel
    API calls, fixed it with a primary-key row lock plus delete-by-id, added a regression test, and
    made CI run the API suite against MySQL so the test database can no longer hide it.

21. **If you had another week, what would you add?**
    Asynchronous generation with progress events, rate limiting and token budgets, contract tests
    between backend and AI engine, cross-browser Playwright projects, and OpenTelemetry tracing.
