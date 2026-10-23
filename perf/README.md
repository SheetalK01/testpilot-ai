# Performance smoke test (k6)

`smoke.js` checks that the core read path stays fast under light concurrent load.

| Scenario | Load | Thresholds |
|---|---|---|
| Log in → list projects → get dashboard, 1 s think time | 10 virtual users for 30 s | p95 latency < 500 ms, failed requests < 1 %, checks > 99 % |

A user, a project and a story are created once in `setup()`, so every iteration exercises BCrypt
password verification, JWT issuing and validation, and the owner-scoped aggregate queries behind
the dashboard.

## Run

```bash
# Start the backend first (scripts/dev-local.sh or docker compose up), then:
k6 run perf/smoke.js
k6 run -e API_URL=http://localhost:8080 perf/smoke.js   # another host
```

Install k6 with `brew install k6` (macOS) or see https://grafana.com/docs/k6/latest/set-up/install-k6/.
CI runs the same script against the stack started in the `perf` job; k6 exits non-zero if a
threshold fails, which fails the job.

## Why these numbers

- **p95 < 500 ms**: the API does no slow work on these endpoints; anything slower points to a missing
  index, an N+1 query or connection-pool starvation.
- **< 1 % errors**: under this load there should be no errors at all; the margin only absorbs a
  network hiccup on shared CI runners.
