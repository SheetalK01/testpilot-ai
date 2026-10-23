# TestPilot AI — Project Plan (overview)

This file started as the initial plan. The detailed, up-to-date specification is
[`BUILD_SPEC.md`](BUILD_SPEC.md); this page is a short map of what was built and where to read more.

| Topic | Where |
|---|---|
| Scope, architecture, schema, API contracts, AI engine, design system | [`BUILD_SPEC.md`](BUILD_SPEC.md) |
| Every endpoint with examples and error codes | [`API.md`](API.md) |
| Test strategy, risks, entry/exit criteria, test case table | [`TEST_PLAN.md`](TEST_PLAN.md) |
| Design decisions, trade-offs, interview questions | [`INTERVIEW_NOTES.md`](INTERVIEW_NOTES.md) |
| How to run everything | [`../README.md`](../README.md) |

## Build phases (all complete)

| Phase | Work |
|---|---|
| 1 | Backend: Spring Boot 4 skeleton, Flyway schema, JWT auth, projects, stories, test cases, errors, request IDs, Swagger |
| 2 | AI engine: FastAPI, prompts, structured output with the Anthropic SDK, mock mode, logging, eval script |
| 3 | Backend ↔ AI: generation, Playwright scripts, run history, Excel export, dashboard |
| 4 | Frontend: design system, landing, auth, dashboard charts, project and story pages, dark mode |
| 5 | QA: Playwright framework (POM, fixtures, tags) with UI, API, security, a11y and visual suites; k6 smoke |
| 6 | DevOps: Dockerfiles, docker-compose, Nginx security headers, GitHub Actions pipeline |
| 7 | Docs and polish: README, API reference, interview notes, screenshots and demo GIF |
