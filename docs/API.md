# TestPilot AI — API reference

Interactive docs: **http://localhost:8080/swagger-ui.html** (click *Authorize* and paste a token).
OpenAPI JSON: `/v3/api-docs`.

- Base path `/api`, JSON in camelCase, timestamps in ISO-8601 UTC.
- Every endpoint except register, login, `/actuator/health` and Swagger needs
  `Authorization: Bearer <jwt>`.
- Every response carries an `X-Request-Id` header. Send your own (letters, digits, `.`, `_`, `-`,
  up to 64 characters) to trace a request through the backend and AI engine logs.
- Resources that belong to another user return **404**, exactly like resources that do not exist, so
  IDs cannot be probed.

## Error format

All errors share one shape. `errors` is present only for validation failures.

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": { "email": "must be a well-formed email address" },
  "path": "/api/auth/register",
  "requestId": "c0a8f1e2-5b7d-4c1a-9f0e-2d3b4c5d6e7f",
  "timestamp": "2026-10-23T10:00:00Z"
}
```

| Status | When |
|---|---|
| 400 | Validation failed (field errors in `errors`), malformed JSON, invalid path parameter, Playwright requested for a story without test cases |
| 401 | Missing, malformed, tampered or expired token (`"Invalid or expired token"`), or wrong login (`"Invalid email or password"`) |
| 404 | Resource not found **or not owned by the caller** |
| 405 / 415 | Wrong HTTP method / content type |
| 409 | Email already registered |
| 502 | AI engine failed: `"AI engine failed: <reason>"` (timeout, unreachable, model refusal, invalid output) |

Unknown enum values are reported per field, for example
`"errors": { "type": "must be one of [POSITIVE, NEGATIVE, EDGE]" }`.

---

## Auth

### `POST /api/auth/register` — public

| Field | Rules |
|---|---|
| `name` | 2–100 characters |
| `email` | valid email, stored lower-case, unique |
| `password` | 8–72 characters, at least one letter and one digit |

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "Password123" }
```

`201 Created`

```json
{ "token": "eyJhbGciOiJIUzI1NiJ9...", "user": { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com" } }
```

Errors: `400` validation, `409` "Email is already registered".

### `POST /api/auth/login` — public

```json
{ "email": "ada@example.com", "password": "Password123" }
```

`200 OK` → same body as register. `401` "Invalid email or password" (same message for unknown email
and wrong password).

The JWT is HS256-signed with `sub` = user id, claims `email`, `name`, issuer `testpilot-ai`, and
expires after `JWT_TTL_MINUTES` (default 720).

### `GET /api/auth/me`

`200 OK` → `{ "id": 1, "name": "Ada Lovelace", "email": "ada@example.com" }`

---

## Projects

### `GET /api/projects`

The caller's projects, newest first, with counts.

```json
[
  {
    "id": 2,
    "name": "Web Shop",
    "description": "Checkout, cart and account flows",
    "storyCount": 3,
    "testCaseCount": 19,
    "createdAt": "2026-10-23T09:12:44.512Z",
    "updatedAt": "2026-10-23T09:40:01.003Z"
  }
]
```

### `POST /api/projects` → `201`

```json
{ "name": "Web Shop", "description": "Checkout, cart and account flows" }
```

`name` 1–120 characters (trimmed), `description` optional, up to 1000. Response: the project as above.

### `GET /api/projects/{id}` → `200` · `PUT /api/projects/{id}` → `200` · `DELETE /api/projects/{id}` → `204`

`PUT` takes the same body as `POST`. `DELETE` also removes the project's stories, test cases and run
history (database `ON DELETE CASCADE`). `404` when missing or not owned.

---

## Stories

### `GET /api/projects/{projectId}/stories`

```json
[
  {
    "id": 3,
    "projectId": 2,
    "title": "User login",
    "description": "As a registered user, I want to log in...",
    "acceptanceCriteria": "Valid credentials open the dashboard\nA wrong password shows an error",
    "testCaseCount": 7,
    "createdAt": "2026-10-23T09:13:02.100Z",
    "updatedAt": "2026-10-23T09:13:02.100Z"
  }
]
```

### `POST /api/projects/{projectId}/stories` → `201`

```json
{
  "title": "User login",
  "description": "As a registered user, I want to log in with my email and password.",
  "acceptanceCriteria": "Valid credentials open the dashboard\nA wrong password shows an error"
}
```

`title` 1–200, `description` 1–5000, `acceptanceCriteria` optional, up to 5000.

### `GET /api/stories/{id}` → `200` · `PUT /api/stories/{id}` → `200` · `DELETE /api/stories/{id}` → `204`

---

## Test cases

```json
{
  "id": 11,
  "storyId": 3,
  "title": "Login with valid credentials",
  "type": "POSITIVE",
  "priority": "HIGH",
  "preconditions": "User account exists",
  "steps": ["Open /login", "Enter valid email and password", "Click Log in"],
  "expectedResult": "User lands on the dashboard",
  "source": "AI",
  "createdAt": "2026-10-23T09:14:10.220Z",
  "updatedAt": "2026-10-23T09:14:10.220Z"
}
```

`type`: `POSITIVE` | `NEGATIVE` | `EDGE` · `priority`: `HIGH` | `MEDIUM` | `LOW` · `source`: `AI` | `MANUAL`.

### `GET /api/stories/{storyId}/test-cases`

Ordered HIGH → MEDIUM → LOW, then by id.

### `POST /api/stories/{storyId}/test-cases` → `201`

Creates a **MANUAL** case.

```json
{
  "title": "Login is case-insensitive for email",
  "type": "EDGE",
  "priority": "LOW",
  "preconditions": "User account exists",
  "steps": ["Open /login", "Enter the email in upper case", "Click Log in"],
  "expectedResult": "The dashboard is shown"
}
```

| Field | Rules |
|---|---|
| `title` | 1–255 |
| `type`, `priority` | required enum values |
| `preconditions` | optional, up to 2000 |
| `steps` | 1–30 items, each 1–500 characters (line breaks inside a step become spaces) |
| `expectedResult` | 1–2000 |

### `PUT /api/test-cases/{id}` → `200` · `DELETE /api/test-cases/{id}` → `204`

`PUT` takes the same body; the `source` never changes.

---

## AI generation

### `POST /api/stories/{storyId}/generate`

Asks the AI engine for test cases, then, in one transaction, deletes the story's previous **AI**
cases and stores the new ones. **MANUAL cases are kept.** Every call is logged as a generation run.

`200 OK` — `testCases` is the story's full list after generation (new AI cases plus kept manual ones),
ordered by priority.

```json
{
  "runId": 9,
  "model": "claude-opus-5-5",
  "testCases": [ { "id": 21, "title": "...", "type": "POSITIVE", "priority": "HIGH", "source": "AI", "...": "..." } ]
}
```

`502` when the AI call fails; the run is stored as `FAILED` and existing test cases are untouched:

```json
{ "status": 502, "message": "AI engine failed: timed out after 120 s", "path": "/api/stories/3/generate", "requestId": "...", "timestamp": "..." }
```

### `POST /api/stories/{storyId}/playwright`

Body optional: `{ "baseUrl": "https://shop.example.com" }` (http/https, default
`http://localhost:3000`). Sends the story and up to 50 of its test cases to the AI engine. The script
is returned, not stored.

`200 OK`

```json
{ "runId": 10, "model": "claude-opus-5-5", "script": "import { test, expect } from '@playwright/test';\n..." }
```

`400` "Generate or add test cases before creating a Playwright script" (no run is logged), `502` on AI failure.

---

## Export

### `GET /api/stories/{storyId}/export`

`200 OK` with
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and
`Content-Disposition: attachment; filename="user-login-test-cases.xlsx"`.

Sheet "Test Cases": story title in row 1, header row (`#`, `Title`, `Type`, `Priority`,
`Preconditions`, `Steps`, `Expected Result`, `Source`) with a frozen pane and auto filter, numbered
steps on separate lines, colour-coded types.

---

## Dashboard

### `GET /api/dashboard`

All enum keys are always present (0 when empty); `recentRuns` holds the last 10 runs, newest first.

```json
{
  "projectCount": 2,
  "storyCount": 5,
  "testCaseCount": 41,
  "byType": { "POSITIVE": 15, "NEGATIVE": 18, "EDGE": 8 },
  "byPriority": { "HIGH": 12, "MEDIUM": 20, "LOW": 9 },
  "recentRuns": [
    {
      "id": 9,
      "storyId": 3,
      "storyTitle": "User login",
      "kind": "TEST_CASES",
      "status": "SUCCESS",
      "model": "claude-opus-5-5",
      "testCaseCount": 9,
      "durationMs": 8123,
      "createdAt": "2026-10-23T09:14:10.180Z"
    }
  ]
}
```

`kind`: `TEST_CASES` | `PLAYWRIGHT` · `status`: `RUNNING` | `SUCCESS` | `FAILED` (`model` is null for failed runs).

---

## Health

`GET /actuator/health` → `{ "status": "UP" }` (public; used by Docker health checks).

---

## AI engine (internal)

Only the backend calls this service; it is not exposed by docker-compose. Swagger: `http://localhost:8000/docs`.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | — | `{ "status": "ok", "mode": "live" \| "mock", "model": "claude-opus-5-5" \| "mock" }` |
| POST | `/v1/test-cases/generate` | `{ "title", "description", "acceptanceCriteria"? }` | `{ "model", "testCases": [{ "title", "type", "priority", "preconditions", "steps", "expectedResult" }] }` (3–15 cases) |
| POST | `/v1/playwright/generate` | `{ "story": {...}, "testCases": [...] (1–50), "baseUrl" }` | `{ "model", "script" }` |

`422` on invalid input (FastAPI validation detail), `502 { "detail": "..." }` when Claude refuses
(`"Model declined the request"`), the response is cut off (`"Response was cut off"`), the output is
invalid (`"Model returned invalid test cases"`), or the API errors (timeout, rate limit, auth, network).
